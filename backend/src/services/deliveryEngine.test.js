import assert from 'assert';
import { DeliveryEngine } from './deliveryEngine.js';

console.log('Testing DeliveryEngine core config & supply calculation...');

const engine = new DeliveryEngine();

// Config defaults check
const config = engine.getConfig();
assert.strictEqual(config.DELIVERY_MODE, 'TPA');
assert.strictEqual(config.POST_DELIVERY_ACTION, 'FLY_HOME');
assert.strictEqual(config.STORAGE_KEYS.ender, 'ender');
assert.strictEqual(config.STORAGE_KEYS.chest, 'chest');

// Supply calculation for round-trip (FLY_HOME: multiplier = 2)
const basePos = { x: 0, y: 64, z: 0 };
const targetPos = { x: 600, y: 64, z: 800 }; // distance = 1000 blocks
const suppliesFlyHome = engine.calculateSupplies(basePos, targetPos, 'FLY_HOME');

assert.strictEqual(suppliesFlyHome.distance, 1000);
assert.strictEqual(suppliesFlyHome.totalDistance, 2000); // 2x round trip
assert.ok(suppliesFlyHome.rockets >= 20); // ~2000/120 + 5 buffer
assert.ok(suppliesFlyHome.elytraDurability > 0);

// Supply calculation for one-way (DIRECT_DIE: multiplier = 1)
const suppliesDirectDie = engine.calculateSupplies(basePos, targetPos, 'DIRECT_DIE');
assert.strictEqual(suppliesDirectDie.totalDistance, 1000);
assert.ok(suppliesDirectDie.rockets < suppliesFlyHome.rockets);

console.log('✅ Task 1: DeliveryEngine core unit tests passed!');

// Task 2: Inventory purification test
const mockInventoryItems = [
  { name: 'firework_rocket', count: 64 },
  { name: 'elytra', count: 1 },
  { name: 'ender_chest', count: 1 },
  { name: 'cobblestone', count: 32 },
  { name: 'diamond_sword', count: 1 }
];

const purified = engine.filterPurifiedItems(mockInventoryItems);
assert.strictEqual(purified.kept.length, 3);
assert.strictEqual(purified.toDeposit.length, 2);
assert.deepStrictEqual(purified.toDeposit.map(i => i.name), ['cobblestone', 'diamond_sword']);
console.log('✅ Task 2: Inventory purification unit test passed!');

// Task 3: Delivery notification string format test
const dropPos = { x: 125, y: 64, z: -350 };
const msg = engine.formatDeliveryMessage(dropPos);
assert.strictEqual(msg, 'Delivery complete! Chest placed at X: 125 Y: 64 Z: -350.');
console.log('✅ Task 3: Delivery notification string format test passed!');

// Task 4: Suicide waterfall hazard selection test
const hazards = [
  { type: 'water', pos: { x: 5, y: 64, z: 5 } },
  { type: 'lava', pos: { x: 10, y: 64, z: 10 } },
  { type: 'mob', pos: { x: 2, y: 64, z: 2 } }
];

const selected = engine.selectSuicideHazard(hazards);
assert.strictEqual(selected.type, 'lava'); // Lava highest priority
console.log('✅ Task 4: Suicide waterfall hazard selection priority test passed!');

console.log('🎉 ALL DeliveryEngine unit tests passed successfully!');
