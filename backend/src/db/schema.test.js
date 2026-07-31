import assert from 'node:assert';
import * as schema from './schema.js';

console.log('Testing schema definitions...');

// Test playerWhitelist schema modifications
assert.ok(schema.playerWhitelist, 'playerWhitelist export exists');
assert.ok('botId' in schema.playerWhitelist, 'playerWhitelist has botId column');
assert.ok('playerName' in schema.playerWhitelist, 'playerWhitelist has playerName column');
assert.ok(!schema.playerWhitelist.playerName.isUnique, 'playerWhitelist.playerName does NOT have unique constraint');
assert.strictEqual(schema.playerWhitelist.role.default, 'normal', 'playerWhitelist.role default is normal');

// Test chestLocations schema modifications
assert.ok(schema.chestLocations, 'chestLocations export exists');
assert.ok('minRank' in schema.chestLocations, 'chestLocations has minRank column');
assert.ok('cooldownMinutes' in schema.chestLocations, 'chestLocations has cooldownMinutes column');
assert.ok('maxHourlyLimit' in schema.chestLocations, 'chestLocations has maxHourlyLimit column');
assert.ok('maxDailyLimit' in schema.chestLocations, 'chestLocations has maxDailyLimit column');
assert.ok('maxWithdrawPerOrder' in schema.chestLocations, 'chestLocations has maxWithdrawPerOrder column');
assert.ok('category' in schema.chestLocations, 'chestLocations has category column');

assert.strictEqual(schema.chestLocations.minRank.default, 'public', 'chestLocations.minRank default is public');
assert.strictEqual(schema.chestLocations.cooldownMinutes.default, 0, 'chestLocations.cooldownMinutes default is 0');
assert.strictEqual(schema.chestLocations.maxHourlyLimit.default, 0, 'chestLocations.maxHourlyLimit default is 0');
assert.strictEqual(schema.chestLocations.maxDailyLimit.default, 0, 'chestLocations.maxDailyLimit default is 0');
assert.strictEqual(schema.chestLocations.maxWithdrawPerOrder.default, 64, 'chestLocations.maxWithdrawPerOrder default is 64');
assert.strictEqual(schema.chestLocations.category.default, 'General', 'chestLocations.category default is General');

// Test playerCooldowns table export
assert.ok(schema.playerCooldowns, 'playerCooldowns export exists');
assert.ok('id' in schema.playerCooldowns, 'playerCooldowns has id');
assert.ok('botId' in schema.playerCooldowns, 'playerCooldowns has botId');
assert.ok('playerName' in schema.playerCooldowns, 'playerCooldowns has playerName');
assert.ok('chestId' in schema.playerCooldowns, 'playerCooldowns has chestId');
assert.ok('claimCountHour' in schema.playerCooldowns, 'playerCooldowns has claimCountHour');
assert.ok('claimCountDay' in schema.playerCooldowns, 'playerCooldowns has claimCountDay');
assert.ok('lastClaimAt' in schema.playerCooldowns, 'playerCooldowns has lastClaimAt');
assert.ok('hourlyResetAt' in schema.playerCooldowns, 'playerCooldowns has hourlyResetAt');
assert.ok('dailyResetAt' in schema.playerCooldowns, 'playerCooldowns has dailyResetAt');

console.log('All schema assertions passed!');

// Test initDatabase execution
import { initDatabase } from './index.js';
console.log('Testing initDatabase()...');
initDatabase();
console.log('initDatabase() completed successfully!');

