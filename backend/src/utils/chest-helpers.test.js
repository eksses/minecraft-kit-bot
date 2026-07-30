import { openChestSafely } from './chest-helpers.js';
import assert from 'assert';

async function testOpenChestSafely() {
  console.log('Testing openChestSafely safeguard...');

  // Test 1: Null block or bot handling
  const nullResult = await openChestSafely(null, null);
  assert.strictEqual(nullResult, null, 'Should return null when bot or block is missing');

  // Test 2: Mock bot and block behavior
  let pathfinderStopped = false;
  let unequipped = false;
  let sneakState = null;
  let lookedAt = null;
  let ticksWaited = 0;
  let containerOpened = false;

  const mockBlock = {
    position: {
      x: 10,
      y: 64,
      z: 20,
      offset: (dx, dy, dz) => ({ x: 10 + dx, y: 64 + dy, z: 20 + dz }),
    },
  };

  const mockBot = {
    pathfinder: {
      stop: () => { pathfinderStopped = true; },
      goto: async () => {},
    },
    unequip: async (slot) => {
      if (slot === 'hand') unequipped = true;
    },
    setControlState: (control, state) => {
      if (control === 'sneak') sneakState = state;
    },
    entity: {
      position: {
        distanceTo: () => 1.5,
      },
    },
    lookAt: async (pos) => {
      lookedAt = pos;
    },
    waitForTicks: async (count) => {
      ticksWaited = count;
    },
    openContainer: async (block) => {
      containerOpened = true;
      return { slots: [], close: () => {} };
    },
  };

  const container = await openChestSafely(mockBot, mockBlock);

  assert.strictEqual(pathfinderStopped, true, 'Pathfinder should stop');
  assert.strictEqual(unequipped, true, 'Hand should be unequipped');
  assert.strictEqual(sneakState, false, 'Sneak control state should be set to false');
  assert.deepStrictEqual(lookedAt, { x: 10.5, y: 64.5, z: 20.5 }, 'Bot should look at chest center');
  assert.strictEqual(ticksWaited, 3, 'Bot should wait 3 server ticks');
  assert.strictEqual(containerOpened, true, 'Container should be opened via openContainer');
  assert.ok(container, 'Container should be returned');

  console.log('✅ openChestSafely unit tests passed successfully');
}

async function testSaveScanResultsToDb() {
  console.log('Testing saveScanResultsToDb de-duplication and cleanup...');
  const { saveScanResultsToDb } = await import('./chest-helpers.js');
  const { db, schema } = await import('../db/index.js');
  const { chestService } = await import('../services/chest.js');
  const { eq } = await import('drizzle-orm');

  const existingUser = await db.query.users.findFirst();
  let testUserId = existingUser?.id;
  if (!testUserId) {
    testUserId = 'test-user-' + Date.now();
    await db.insert(schema.users).values({
      id: testUserId,
      username: 'testuser',
      passwordHash: 'dummy',
      createdAt: new Date(),
    });
  }

  const testBotId = 'test-bot-dedup-' + Date.now();

  const mockBot = {
    id: testBotId,
    userId: testUserId,
    position: { x: 100, y: 64, z: 200 },
  };

  const initialScanData = {
    found: 2,
    chests: [
      { name: 'grass_block', x: 105, y: 64, z: 205, item: 'grass_block', itemCount: 64, lastScanned: Date.now() },
      { name: 'diamond_sword', x: 110, y: 64, z: 210, item: 'diamond_sword', itemCount: 1, lastScanned: Date.now() },
    ],
  };

  // 1. Initial save
  await saveScanResultsToDb(mockBot, initialScanData, 32);

  let storedChests = await db.select().from(schema.chestLocations).where(eq(schema.chestLocations.botId, testBotId));
  assert.strictEqual(storedChests.length, 2, 'Initial scan should store 2 unique chests');

  // 2. Rescan same location with moved/updated coordinates (diamond_sword moved to 112, 64, 212)
  const rescanData = {
    found: 2,
    chests: [
      { name: 'grass_block', x: 105, y: 64, z: 205, item: 'grass_block', itemCount: 64, lastScanned: Date.now() },
      { name: 'diamond_sword', x: 112, y: 64, z: 212, item: 'diamond_sword', itemCount: 1, lastScanned: Date.now() },
    ],
  };

  await saveScanResultsToDb(mockBot, rescanData, 32);

  storedChests = await db.select().from(schema.chestLocations).where(eq(schema.chestLocations.botId, testBotId));
  assert.strictEqual(storedChests.length, 2, 'Rescan should update existing chest without creating duplicates');

  const updatedDiamond = storedChests.find(c => c.name === 'diamond_sword');
  assert.strictEqual(updatedDiamond.x, 112, 'Diamond sword X should be updated');

  // 3. Rescan area where diamond_sword was REMOVED (only grass_block remains in range)
  const removedScanData = {
    found: 1,
    chests: [
      { name: 'grass_block', x: 105, y: 64, z: 205, item: 'grass_block', itemCount: 64, lastScanned: Date.now() },
    ],
  };

  await saveScanResultsToDb(mockBot, removedScanData, 32);

  storedChests = await db.select().from(schema.chestLocations).where(eq(schema.chestLocations.botId, testBotId));
  assert.strictEqual(storedChests.length, 1, 'Removed chest should be deleted from DB on rescan');
  assert.strictEqual(storedChests[0].name, 'grass_block');
  assert.strictEqual(chestService.get('diamond_sword'), null, 'Removed chest should be deleted from chestData.json');

  // Clean up test records
  await db.delete(schema.chestLocations).where(eq(schema.chestLocations.botId, testBotId));
  console.log('✅ saveScanResultsToDb de-duplication and cleanup unit tests passed successfully');
}

testOpenChestSafely().then(() => testSaveScanResultsToDb()).catch((err) => {
  console.error('❌ Unit test failed:', err);
  process.exit(1);
});
