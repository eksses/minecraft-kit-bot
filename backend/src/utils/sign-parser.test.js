import { parseSignText, extractChestName, isSignOnChestFace } from './sign-parser.js';
import assert from 'assert';

// Test parseSignText
assert.deepStrictEqual(parseSignText(['#Name:MyKit']), { Name: 'MyKit' });
assert.deepStrictEqual(parseSignText(['#Name:MyKit #Item:Diamond']), { Name: 'MyKit', Item: 'Diamond' });
assert.deepStrictEqual(parseSignText(['#Name:MyKit', '#Qty:64']), { Name: 'MyKit', Qty: '64' });
assert.deepStrictEqual(parseSignText([]), {});
assert.deepStrictEqual(parseSignText(['', '']), {});

// Test extractChestName
assert.strictEqual(extractChestName({ Name: 'MyKit' }), 'MyKit');
assert.strictEqual(extractChestName({}), null);

// Test isSignOnChestFace
assert.strictEqual(isSignOnChestFace({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, 'north'), true);
assert.strictEqual(isSignOnChestFace({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 'south'), true);
assert.strictEqual(isSignOnChestFace({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 'up'), false);

console.log('All sign-parser tests passed');