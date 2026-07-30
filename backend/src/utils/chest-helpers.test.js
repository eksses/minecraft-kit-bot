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

testOpenChestSafely().catch((err) => {
  console.error('❌ Unit test failed:', err);
  process.exit(1);
});
