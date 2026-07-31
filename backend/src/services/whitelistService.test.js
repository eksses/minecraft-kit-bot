import assert from 'assert';
import { whitelistService } from './whitelistService.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('Running whitelistService unit tests...');

  const userId = 'test-user-wl-' + Date.now();
  const botId1 = 'test-bot-1-' + Date.now();
  const botId2 = 'test-bot-2-' + Date.now();
  const now = new Date();

  try {
    // Insert prerequisite user and bots for FK constraints
    await db.insert(schema.users).values({
      id: userId,
      username: 'wluser_' + Date.now(),
      email: 'wluser_' + Date.now() + '@test.com',
      passwordHash: 'dummy',
      createdAt: now,
      updatedAt: now,
    }).run();

    await db.insert(schema.bots).values({
      id: botId1,
      userId,
      name: 'Test Bot 1',
      username: 'testbot1',
      createdAt: now,
    }).run();

    await db.insert(schema.bots).values({
      id: botId2,
      userId,
      name: 'Test Bot 2',
      username: 'testbot2',
      createdAt: now,
    }).run();

    // 1. Test getRole for non-existent player -> should return 'public'
    const defaultRole = await whitelistService.getRole(botId1, 'UnknownPlayer');
    assert.strictEqual(defaultRole, 'public', 'Non-whitelisted player should have role "public"');

    // 2. Test isWhitelisted for non-existent player -> should return false
    const initialIsWhitelisted = await whitelistService.isWhitelisted(botId1, 'UnknownPlayer');
    assert.strictEqual(initialIsWhitelisted, false, 'Non-whitelisted player should return false for isWhitelisted');

    // 3. Test addPlayer for specific botId
    const added1 = await whitelistService.addPlayer(botId1, 'Alice', 'admin', 'tester');
    assert.ok(added1, 'addPlayer should return added player object');
    assert.strictEqual(added1.playerName, 'alice', 'Player name should be normalized to lowercase');
    assert.strictEqual(added1.role, 'admin', 'Role should match added role');

    const added2 = await whitelistService.addPlayer(botId2, 'Bob', 'vip', 'tester');
    assert.strictEqual(added2.playerName, 'bob');
    assert.strictEqual(added2.role, 'vip');

    // 4. Test getRole and isWhitelisted per bot
    const aliceRoleBot1 = await whitelistService.getRole(botId1, 'Alice');
    assert.strictEqual(aliceRoleBot1, 'admin', 'Alice should be admin on bot1');

    const aliceRoleBot2 = await whitelistService.getRole(botId2, 'Alice');
    assert.strictEqual(aliceRoleBot2, 'public', 'Alice should be public on bot2');

    const aliceIsWlBot1 = await whitelistService.isWhitelisted(botId1, 'Alice');
    assert.strictEqual(aliceIsWlBot1, true, 'Alice should be whitelisted on bot1');

    const aliceIsWlBot2 = await whitelistService.isWhitelisted(botId2, 'Alice');
    assert.strictEqual(aliceIsWlBot2, false, 'Alice should not be whitelisted on bot2');

    // 5. Test listForBot
    const bot1List = await whitelistService.listForBot(botId1);
    assert.strictEqual(bot1List.length, 1, 'bot1 should have 1 whitelisted player');
    assert.strictEqual(bot1List[0].playerName, 'alice');

    const bot2List = await whitelistService.listForBot(botId2);
    assert.strictEqual(bot2List.length, 1, 'bot2 should have 1 whitelisted player');
    assert.strictEqual(bot2List[0].playerName, 'bob');

    // 6. Test removePlayer for specific botId
    await whitelistService.removePlayer(botId1, 'Alice');

    const aliceIsWlBot1After = await whitelistService.isWhitelisted(botId1, 'Alice');
    assert.strictEqual(aliceIsWlBot1After, false, 'Alice should be removed from bot1');

    const bot1ListAfter = await whitelistService.listForBot(botId1);
    assert.strictEqual(bot1ListAfter.length, 0, 'bot1 list should be empty after removal');

    // Verify Bob on bot2 is unaffected
    const bobIsWlBot2After = await whitelistService.isWhitelisted(botId2, 'Bob');
    assert.strictEqual(bobIsWlBot2After, true, 'Bob should still be whitelisted on bot2');

    console.log('✅ All whitelistService unit tests passed!');
  } finally {
    // Cleanup test data
    await db.delete(schema.playerWhitelist).where(eq(schema.playerWhitelist.botId, botId1)).run();
    await db.delete(schema.playerWhitelist).where(eq(schema.playerWhitelist.botId, botId2)).run();
    await db.delete(schema.bots).where(eq(schema.bots.id, botId1)).run();
    await db.delete(schema.bots).where(eq(schema.bots.id, botId2)).run();
    await db.delete(schema.users).where(eq(schema.users.id, userId)).run();
  }
}

runTests().catch((err) => {
  console.error('❌ whitelistService unit tests failed:', err);
  process.exit(1);
});
