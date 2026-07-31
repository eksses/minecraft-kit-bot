import assert from 'assert';
import { chestRuleEngine } from './chestRuleEngine.js';
import { whitelistService } from './whitelistService.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('Running chestRuleEngine unit tests...');

  // 1. Test rank hierarchy mapping
  assert.strictEqual(chestRuleEngine.getRankLevel('public'), 0, 'public level should be 0');
  assert.strictEqual(chestRuleEngine.getRankLevel('normal'), 1, 'normal level should be 1');
  assert.strictEqual(chestRuleEngine.getRankLevel('vip'), 2, 'vip level should be 2');
  assert.strictEqual(chestRuleEngine.getRankLevel('admin'), 3, 'admin level should be 3');
  assert.strictEqual(chestRuleEngine.getRankLevel('unknown'), 0, 'unknown level should default to 0');

  // 2. Test hasRankAccess logic
  assert.strictEqual(chestRuleEngine.hasRankAccess('vip', 'normal'), true, 'vip can access normal');
  assert.strictEqual(chestRuleEngine.hasRankAccess('normal', 'vip'), false, 'normal cannot access vip');
  assert.strictEqual(chestRuleEngine.hasRankAccess('admin', 'admin'), true, 'admin can access admin');
  assert.strictEqual(chestRuleEngine.hasRankAccess('public', 'public'), true, 'public can access public');
  assert.strictEqual(chestRuleEngine.hasRankAccess('public', 'normal'), false, 'public cannot access normal');

  console.log('✅ Rank hierarchy & hasRankAccess tests passed');

  // Setup DB context for validateAccess, recordClaim, resetCooldowns tests
  const userId = 'test-user-cre-' + Date.now();
  const botId = 'test-bot-cre-' + Date.now();
  const chestId = 'test-chest-cre-' + Date.now();
  const playerName = 'ruleTester';
  const now = new Date();

  try {
    await db.insert(schema.users).values({
      id: userId,
      username: 'cre_user_' + Date.now(),
      email: 'cre_user_' + Date.now() + '@test.com',
      passwordHash: 'dummy',
      createdAt: now,
      updatedAt: now,
    }).run();

    await db.insert(schema.bots).values({
      id: botId,
      userId,
      name: 'CRE Test Bot',
      username: 'cretestbot',
      createdAt: now,
    }).run();

    await db.insert(schema.chestLocations).values({
      id: chestId,
      userId,
      name: 'Test Kit Chest',
      x: 100,
      y: 64,
      z: 200,
      itemName: 'diamond_sword',
      botId,
      minRank: 'normal',
      cooldownMinutes: 10,
      maxHourlyLimit: 2,
      maxDailyLimit: 5,
      status: 'active',
      createdAt: now,
    }).run();

    // 3. Test validateAccess logic
    const disabledChest = {
      id: chestId,
      name: 'Disabled Kit',
      status: 'disabled',
      minRank: 'public',
      cooldownMinutes: 0,
      maxHourlyLimit: 0,
      maxDailyLimit: 0,
    };
    const disabledRes = await chestRuleEngine.validateAccess(botId, playerName, disabledChest);
    assert.strictEqual(disabledRes.allowed, false, 'Disabled chest should be denied');
    assert.ok(disabledRes.reason.includes('disabled'), 'Reason should mention disabled');

    // Player default role is public, chest requires normal
    const rankDeniedChest = {
      id: chestId,
      name: 'Normal Kit',
      status: 'active',
      minRank: 'normal',
      cooldownMinutes: 0,
      maxHourlyLimit: 0,
      maxDailyLimit: 0,
    };
    const rankDeniedRes = await chestRuleEngine.validateAccess(botId, playerName, rankDeniedChest);
    assert.strictEqual(rankDeniedRes.allowed, false, 'Public player should be denied normal chest');

    // Add player as normal role to whitelist
    await whitelistService.addPlayer(botId, playerName, 'normal', 'test');
    const rankAllowedRes = await chestRuleEngine.validateAccess(botId, playerName, rankDeniedChest);
    assert.strictEqual(rankAllowedRes.allowed, true, 'Normal player should be allowed normal chest');

    // 4. Test recordClaim and Cooldowns/Limits
    const cdChest = {
      id: chestId,
      name: 'Cooldown Kit',
      status: 'active',
      minRank: 'normal',
      cooldownMinutes: 10,
      maxHourlyLimit: 0,
      maxDailyLimit: 0,
    };

    // Record 1st claim
    await chestRuleEngine.recordClaim(botId, playerName, chestId);

    // Validate access should now fail due to 10 min cooldown
    const cdDeniedRes = await chestRuleEngine.validateAccess(botId, playerName, cdChest);
    assert.strictEqual(cdDeniedRes.allowed, false, 'Should be denied during cooldown');
    assert.ok(cdDeniedRes.reason.includes('cooldown'), 'Reason should mention cooldown');

    // 5. Test resetCooldowns
    await chestRuleEngine.resetCooldowns(botId, playerName, chestId);
    const postResetRes = await chestRuleEngine.validateAccess(botId, playerName, cdChest);
    assert.strictEqual(postResetRes.allowed, true, 'Should be allowed after resetting cooldown');

    // Test Hourly Limit
    const hourlyChest = {
      id: chestId,
      name: 'Hourly Kit',
      status: 'active',
      minRank: 'normal',
      cooldownMinutes: 0,
      maxHourlyLimit: 2,
      maxDailyLimit: 0,
    };

    await chestRuleEngine.recordClaim(botId, playerName, chestId);
    let hourlyRes = await chestRuleEngine.validateAccess(botId, playerName, hourlyChest);
    assert.strictEqual(hourlyRes.allowed, true, '1st claim within hourly limit allowed');

    await chestRuleEngine.recordClaim(botId, playerName, chestId);
    hourlyRes = await chestRuleEngine.validateAccess(botId, playerName, hourlyChest);
    assert.strictEqual(hourlyRes.allowed, false, '3rd claim exceeding maxHourlyLimit (2) should be denied');
    assert.ok(hourlyRes.reason.includes('Hourly limit'), 'Reason should mention hourly limit');

    // Reset again
    await chestRuleEngine.resetCooldowns(botId, playerName, chestId);

    // Test Daily Limit
    const dailyChest = {
      id: chestId,
      name: 'Daily Kit',
      status: 'active',
      minRank: 'normal',
      cooldownMinutes: 0,
      maxHourlyLimit: 0,
      maxDailyLimit: 1,
    };

    await chestRuleEngine.recordClaim(botId, playerName, chestId);
    const dailyRes = await chestRuleEngine.validateAccess(botId, playerName, dailyChest);
    assert.strictEqual(dailyRes.allowed, false, 'Exceeding maxDailyLimit (1) should be denied');
    assert.ok(dailyRes.reason.includes('Daily limit'), 'Reason should mention daily limit');

    console.log('✅ All chestRuleEngine unit tests passed!');
  } finally {
    // Cleanup
    await db.delete(schema.playerCooldowns).where(eq(schema.playerCooldowns.botId, botId)).run();
    await db.delete(schema.playerWhitelist).where(eq(schema.playerWhitelist.botId, botId)).run();
    await db.delete(schema.chestLocations).where(eq(schema.chestLocations.id, chestId)).run();
    await db.delete(schema.bots).where(eq(schema.bots.id, botId)).run();
    await db.delete(schema.users).where(eq(schema.users.id, userId)).run();
  }
}

runTests().catch(err => {
  console.error('❌ chestRuleEngine unit tests failed:', err);
  process.exit(1);
});
