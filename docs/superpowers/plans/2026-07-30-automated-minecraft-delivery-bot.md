# Automated Minecraft Delivery Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Automated Minecraft Delivery Bot system supporting TPA & Elytra transport modes, supply calculations, base inventory purification, Ender/Standard Chest deployment, and post-delivery return routines (including suicide waterfall).

**Architecture:** A modular `DeliveryEngine` service (`backend/src/services/deliveryEngine.js`) built on Mineflayer and `@eksses/eafe`. Integrates with `BotService`, `src/transfer.js`, Hono REST API, and SQLite db config.

**Tech Stack:** Node.js, Mineflayer, `@eksses/eafe`, mineflayer-pathfinder, Hono, Drizzle ORM / SQLite.

## Global Constraints

- JavaScript only (no TypeScript)
- Use `@eksses/eafe` for autonomous elytra flight and resource calculations
- Inventory purification must strictly filter inventory to only firework rockets, elytra(s), and 1x Ender Chest
- Post-delivery notifications must match: `"Delivery complete! Chest placed at X: [X] Y: [Y] Z: [Z]."`

---

### Task 1: Delivery Engine Service Core & Supply Calculation

**Files:**
- Create: `backend/src/services/deliveryEngine.js`
- Test: `backend/src/services/deliveryEngine.test.js`

**Interfaces:**
- Consumes: `@eksses/eafe`, `backend/src/services/config.js`
- Produces: `DeliveryEngine` class with `getConfig()`, `updateConfig(updates)`, `calculateSupplies(basePos, targetPos, postDeliveryAction)`

- [ ] **Step 1: Write failing test for configuration and pre-flight supply calculation**

```javascript
// backend/src/services/deliveryEngine.test.js
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
assert.ok(suppliesFlyHome.elytraDurability >= 2000);

// Supply calculation for one-way (DIRECT_DIE: multiplier = 1)
const suppliesDirectDie = engine.calculateSupplies(basePos, targetPos, 'DIRECT_DIE');
assert.strictEqual(suppliesDirectDie.totalDistance, 1000);
assert.ok(suppliesDirectDie.rockets < suppliesFlyHome.rockets);

console.log('✅ DeliveryEngine core unit tests passed!');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: FAIL ("Cannot find module './deliveryEngine.js'")

- [ ] **Step 3: Write minimal implementation for DeliveryEngine config & calculation**

```javascript
// backend/src/services/deliveryEngine.js
import { calculateRequiredElytraDurability } from '@eksses/eafe';

export class DeliveryEngine {
  constructor(config = {}) {
    this.config = {
      DELIVERY_MODE: config.DELIVERY_MODE || 'TPA',
      TARGET_COORD_MODE: config.TARGET_COORD_MODE || 'USER',
      POST_DELIVERY_ACTION: config.POST_DELIVERY_ACTION || 'FLY_HOME',
      STORAGE_KEYS: {
        ender: config.STORAGE_KEYS?.ender || 'ender',
        chest: config.STORAGE_KEYS?.chest || 'chest',
        elytra: config.STORAGE_KEYS?.elytra || 'elytra',
        rocket: config.STORAGE_KEYS?.rocket || 'rocket',
      },
      BASE_COORDINATES: config.BASE_COORDINATES || { x: 0, y: 64, z: 0 },
      RANDOM_REGION_BOUNDS: config.RANDOM_REGION_BOUNDS || { x1: -1000, z1: -1000, x2: 1000, z2: 1000 },
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(updates) {
    if (updates.STORAGE_KEYS) {
      this.config.STORAGE_KEYS = { ...this.config.STORAGE_KEYS, ...updates.STORAGE_KEYS };
      delete updates.STORAGE_KEYS;
    }
    Object.assign(this.config, updates);
    return this.getConfig();
  }

  calculateSupplies(basePos, targetPos, postDeliveryAction = this.config.POST_DELIVERY_ACTION) {
    const dx = targetPos.x - basePos.x;
    const dy = (targetPos.y || 64) - (basePos.y || 64);
    const dz = targetPos.z - basePos.z;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));

    const multiplier = postDeliveryAction === 'FLY_HOME' ? 2 : 1;
    const totalDistance = distance * multiplier;

    // Fuel divider = 120 blocks per rocket (MED mode), add 5 buffer rockets
    const rockets = Math.max(5, Math.ceil(totalDistance / 120) + 5);
    const elytraDurability = calculateRequiredElytraDurability
      ? calculateRequiredElytraDurability(totalDistance)
      : Math.ceil(totalDistance * 0.7);

    const elytraCount = Math.ceil(elytraDurability / 432); // standard elytra max durability ~432

    return {
      distance,
      totalDistance,
      multiplier,
      rockets,
      elytraDurability,
      elytraCount,
    };
  }

  resolveTargetCoordinates(userTarget) {
    if (this.config.TARGET_COORD_MODE === 'RANDOM_REGION') {
      const { x1, z1, x2, z2 } = this.config.RANDOM_REGION_BOUNDS;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minZ = Math.min(z1, z2);
      const maxZ = Math.max(z1, z2);

      const targetX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
      const targetZ = Math.floor(Math.random() * (maxZ - minZ + 1)) + minZ;
      return { x: targetX, y: 70, z: targetZ };
    }
    return userTarget;
  }
}

export default DeliveryEngine;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: PASS ("✅ DeliveryEngine core unit tests passed!")

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/deliveryEngine.js backend/src/services/deliveryEngine.test.js
git commit -m "feat(delivery): add DeliveryEngine core configuration and pre-flight supply calculation"
```

---

### Task 2: Base Preparation & Inventory Purification Routine

**Files:**
- Modify: `backend/src/services/deliveryEngine.js`
- Modify: `backend/src/services/deliveryEngine.test.js`

**Interfaces:**
- Consumes: `mineflayer` bot instance, `openChestSafely`
- Produces: `DeliveryEngine.prepareBaseAndPurify(bot, deliveryItems)`

- [ ] **Step 1: Write test for inventory purification logic**

Add to `backend/src/services/deliveryEngine.test.js`:

```javascript
// Test purification filter method
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
console.log('✅ Inventory purification unit test passed!');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: FAIL ("engine.filterPurifiedItems is not a function")

- [ ] **Step 3: Implement `filterPurifiedItems` and `prepareBaseAndPurify` in `DeliveryEngine`**

Add methods to `DeliveryEngine` class in `backend/src/services/deliveryEngine.js`:

```javascript
  filterPurifiedItems(items) {
    const allowed = ['firework_rocket', 'elytra', 'ender_chest', 'minecraft:firework_rocket', 'minecraft:elytra', 'minecraft:ender_chest'];
    const kept = [];
    const toDeposit = [];

    for (const item of items) {
      if (!item) continue;
      if (allowed.includes(item.name)) {
        kept.push(item);
      } else {
        toDeposit.push(item);
      }
    }

    return { kept, toDeposit };
  }

  async prepareBaseAndPurify(bot, chestService, deliveryItems, targetPos) {
    if (!bot) throw new Error('Bot instance is required');

    // 1. Calculate flight supplies
    const basePos = bot.entity?.position ? { x: Math.floor(bot.entity.position.x), y: Math.floor(bot.entity.position.y), z: Math.floor(bot.entity.position.z) } : this.config.BASE_COORDINATES;
    const supplies = this.calculateSupplies(basePos, targetPos);

    // 2. Retrieve utility chests
    const keys = this.config.STORAGE_KEYS;
    const enderChestData = chestService.get(keys.ender);
    const chestData = chestService.get(keys.chest);
    const elytraData = chestService.get(keys.elytra);
    const rocketData = chestService.get(keys.rocket);

    // Withdraw Ender Chest (1x)
    if (enderChestData) {
      await bot.service?.takeItemFromChest?.(keys.ender, 1, 'system');
    }
    // Withdraw Standard Chest (1x)
    if (chestData) {
      await bot.service?.takeItemFromChest?.(keys.chest, 1, 'system');
    }
    // Withdraw Elytra
    if (elytraData) {
      await bot.service?.takeItemFromChest?.(keys.elytra, supplies.elytraCount, 'system');
    }
    // Withdraw Rockets
    if (rocketData) {
      await bot.service?.takeItemFromChest?.(keys.rocket, supplies.rockets, 'system');
    }

    // 3. Purify Inventory: deposit all non-allowed items back
    const currentInventory = bot.inventory.items();
    const { toDeposit } = this.filterPurifiedItems(currentInventory);

    if (toDeposit.length > 0 && chestData) {
      // Return junk items to storage chest
      const storagePos = new (await import('vec3')).Vec3(chestData.x, chestData.y, chestData.z);
      const storageBlock = bot.blockAt(storagePos);
      if (storageBlock) {
        const { openChestSafely } = await import('../utils/chest-helpers.js');
        const container = await openChestSafely(bot, storageBlock);
        if (container) {
          for (const item of toDeposit) {
            try {
              await container.deposit(item.type, null, item.count);
            } catch (_) {}
          }
          container.close();
        }
      }
    }

    return supplies;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/deliveryEngine.js backend/src/services/deliveryEngine.test.js
git commit -m "feat(delivery): implement base preparation and inventory purification logic"
```

---

### Task 3: Flight Execution, Ender Chest Unload, & Delivery Chest Deployment

**Files:**
- Modify: `backend/src/services/deliveryEngine.js`
- Modify: `backend/src/services/deliveryEngine.test.js`

**Interfaces:**
- Consumes: `@eksses/eafe` `ElytraFlight`
- Produces: `DeliveryEngine.executeFlightAndDelivery(bot, targetPos, deliveryItems)`

- [ ] **Step 1: Write test for delivery notification string formatting**

Add to `backend/src/services/deliveryEngine.test.js`:

```javascript
const dropPos = { x: 125, y: 64, z: -350 };
const msg = engine.formatDeliveryMessage(dropPos);
assert.strictEqual(msg, 'Delivery complete! Chest placed at X: 125 Y: 64 Z: -350.');
console.log('✅ Delivery notification string format test passed!');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: FAIL ("engine.formatDeliveryMessage is not a function")

- [ ] **Step 3: Implement flight navigation and drop-off deployment**

Add methods to `DeliveryEngine` class in `backend/src/services/deliveryEngine.js`:

```javascript
  formatDeliveryMessage(pos) {
    return `Delivery complete! Chest placed at X: ${pos.x} Y: ${pos.y} Z: ${pos.z}.`;
  }

  async executeFlightAndDelivery(bot, targetPos, deliveryItems = []) {
    const { ElytraFlight } = await import('@eksses/eafe');
    const { openChestSafely } = await import('../utils/chest-helpers.js');
    const { Vec3 } = await import('vec3');

    // 1. Flight Execution
    const flight = new ElytraFlight(bot, {
      mode: 'MED',
      safety: true,
    });

    await new Promise((resolve, reject) => {
      flight.fly(targetPos.x, targetPos.z);

      const onPhase = (phase) => {
        if (phase === 'IDLE') {
          flight.removeListener('phase', onPhase);
          flight.removeListener('error', onError);
          resolve();
        }
      };

      const onError = (err) => {
        flight.removeListener('phase', onPhase);
        flight.removeListener('error', onError);
        reject(err);
      };

      flight.on('phase', onPhase);
      flight.on('error', onError);
    });

    // 2. Safe Drop-off Spot Selection
    const botPos = bot.entity.position;
    const dropVec = botPos.offset(1, 0, 0).floored();
    const dropBlock = bot.blockAt(dropVec);

    // Equip standard chest and place it on ground
    const chestItem = bot.inventory.items().find(i => i.name.includes('chest') && !i.name.includes('ender'));
    if (chestItem) {
      await bot.equip(chestItem, 'hand');
      const refBlock = bot.blockAt(dropVec.offset(0, -1, 0));
      if (refBlock) {
        await bot.placeBlock(refBlock, new Vec3(0, 1, 0));
      }
    }

    // 3. Deposit Items inside placed Chest
    const placedChestBlock = bot.blockAt(dropVec);
    if (placedChestBlock) {
      const container = await openChestSafely(bot, placedChestBlock);
      if (container) {
        for (const item of bot.inventory.items()) {
          if (!['firework_rocket', 'elytra', 'ender_chest'].includes(item.name)) {
            try {
              await container.deposit(item.type, null, item.count);
            } catch (_) {}
          }
        }
        container.close();
      }
    }

    // 4. Send Notification Chat Message
    const dropCoords = { x: Math.floor(dropVec.x), y: Math.floor(dropVec.y), z: Math.floor(dropVec.z) };
    const chatMsg = this.formatDeliveryMessage(dropCoords);
    bot.chat(chatMsg);

    return dropCoords;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/deliveryEngine.js backend/src/services/deliveryEngine.test.js
git commit -m "feat(delivery): implement elytra flight navigation, chest placement, and drop-off notification"
```

---

### Task 4: Post-Delivery Return Routines & Suicide Waterfall

**Files:**
- Modify: `backend/src/services/deliveryEngine.js`
- Modify: `backend/src/services/deliveryEngine.test.js`

**Interfaces:**
- Consumes: `DeliveryEngine`, `mineflayer` bot
- Produces: `DeliveryEngine.executePostDeliveryRoutine(bot, basePos)`

- [ ] **Step 1: Write test for suicide waterfall priority ordering**

Add to `backend/src/services/deliveryEngine.test.js`:

```javascript
const hazards = [
  { type: 'lava', pos: { x: 10, y: 64, z: 10 } },
  { type: 'water', pos: { x: 5, y: 64, z: 5 } },
  { type: 'mob', pos: { x: 2, y: 64, z: 2 } }
];

const selected = engine.selectSuicideHazard(hazards);
assert.strictEqual(selected.type, 'lava'); // Lava highest priority
console.log('✅ Suicide waterfall hazard selection priority test passed!');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: FAIL ("engine.selectSuicideHazard is not a function")

- [ ] **Step 3: Implement Post-Delivery Return Routine & Suicide Waterfall**

Add methods to `DeliveryEngine` class in `backend/src/services/deliveryEngine.js`:

```javascript
  selectSuicideHazard(hazards) {
    if (!hazards || hazards.length === 0) return null;
    const priority = { lava: 1, mob: 2, water: 3, wander: 4 };
    return hazards.sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99))[0];
  }

  async executeSuicideWaterfall(bot) {
    const radius = 32;
    const botPos = bot.entity.position;

    // 1. Scan Lava Hazard
    const lavaBlock = bot.findBlock({
      matching: (b) => b.name === 'lava' || b.name === 'flowing_lava',
      maxDistance: radius,
    });

    if (lavaBlock) {
      await bot.service?.pathTo?.(lavaBlock.position, 1);
      bot.setControlState('forward', true);
      return 'lava';
    }

    // 2. Scan Hostile Mob Hazard
    const hostileMob = Object.values(bot.entities).find((e) => {
      if (!e || !e.position || e === bot.entity) return false;
      const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch', 'phantom', 'drowned', 'husk', 'stray'];
      return hostiles.includes(e.name) && botPos.distanceTo(e.position) <= radius;
    });

    if (hostileMob) {
      await bot.service?.pathTo?.(hostileMob.position, 1);
      bot.clearControlStates();
      return 'mob';
    }

    // 3. Scan Water Drowning Hazard
    const waterBlock = bot.findBlock({
      matching: (b) => b.name === 'water' || b.name === 'flowing_water',
      maxDistance: radius,
    });

    if (waterBlock) {
      await bot.service?.pathTo?.(waterBlock.position, 1);
      bot.setControlState('sneak', true);
      return 'water';
    }

    // 4. Wandering Hazard Fallback
    bot.setControlState('forward', true);
    bot.setControlState('sprint', true);
    return 'wander';
  }

  async executePostDeliveryRoutine(bot, basePos = this.config.BASE_COORDINATES) {
    const action = this.config.POST_DELIVERY_ACTION;

    if (action === 'FLY_HOME') {
      const { ElytraFlight } = await import('@eksses/eafe');
      const flight = new ElytraFlight(bot, { mode: 'MED', safety: true });
      await new Promise((resolve) => {
        flight.fly(basePos.x, basePos.z);
        flight.once('phase', (p) => { if (p === 'IDLE') resolve(); });
      });
      return 'FLY_HOME_COMPLETED';
    }

    if (action === 'ECHEST_SAVE_AND_DIE') {
      const { openChestSafely } = await import('../utils/chest-helpers.js');
      const { Vec3 } = await import('vec3');

      // Place Ender Chest
      const botPos = bot.entity.position;
      const echestItem = bot.inventory.items().find(i => i.name.includes('ender_chest'));
      if (echestItem) {
        await bot.equip(echestItem, 'hand');
        const placeVec = botPos.offset(1, 0, 0).floored();
        const refBlock = bot.blockAt(placeVec.offset(0, -1, 0));
        if (refBlock) {
          await bot.placeBlock(refBlock, new Vec3(0, 1, 0));
          const container = await openChestSafely(bot, bot.blockAt(placeVec));
          if (container) {
            for (const item of bot.inventory.items()) {
              if (['firework_rocket', 'elytra', 'minecraft:firework_rocket', 'minecraft:elytra'].includes(item.name)) {
                try { await container.deposit(item.type, null, item.count); } catch (_) {}
              }
            }
            container.close();
          }
        }
      }
      return this.executeSuicideWaterfall(bot);
    }

    if (action === 'DIRECT_DIE') {
      return this.executeSuicideWaterfall(bot);
    }

    return 'UNKNOWN_ACTION';
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/services/deliveryEngine.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/deliveryEngine.js backend/src/services/deliveryEngine.test.js
git commit -m "feat(delivery): implement post-delivery return routines and suicide waterfall"
```

---

### Task 5: Bot Service & REST API Integration

**Files:**
- Modify: `backend/src/services/bot.js`
- Modify: `backend/src/routes/fleet.js`
- Modify: `src/transfer.js`

**Interfaces:**
- Consumes: `DeliveryEngine`
- Produces: API endpoints `/api/fleet/delivery-config` (GET/POST) and bot delivery execution methods.

- [ ] **Step 1: Wire DeliveryEngine into BotService (`backend/src/services/bot.js`)**

Import and instantiate `DeliveryEngine` in `BotService`:

```javascript
import { DeliveryEngine } from './deliveryEngine.js';

// In BotService constructor:
this.deliveryEngine = new DeliveryEngine();
```

- [ ] **Step 2: Wire ELYTRA / TPA delivery into `src/transfer.js`**

Modify `src/transfer.js` to inspect `DELIVERY_MODE` and execute either TPA or Elytra delivery pipeline:

```javascript
    if (deliveryMode === 'ELYTRA' && botInstance.deliveryEngine) {
      botInstance.chat(`/w ${player} Initiating Elytra kit delivery for "${chestName}"...`);
      await botInstance.deliveryEngine.prepareBaseAndPurify(botInstance, chestService, [chestData.item], { x: chestData.x, y: chestData.y, z: chestData.z });
      await botInstance.deliveryEngine.executeFlightAndDelivery(botInstance, { x: chestData.x, y: chestData.y, z: chestData.z }, [chestData.item]);
      await botInstance.deliveryEngine.executePostDeliveryRoutine(botInstance);
      return;
    }
```

- [ ] **Step 3: Add REST API endpoints in `backend/src/routes/fleet.js`**

Add GET & POST routes for `/api/fleet/delivery-config`:

```javascript
app.get('/api/fleet/delivery-config', (c) => {
  return c.json(botService.deliveryEngine.getConfig());
});

app.post('/api/fleet/delivery-config', async (c) => {
  const body = await c.req.json();
  const updated = botService.deliveryEngine.updateConfig(body);
  return c.json(updated);
});
```

- [ ] **Step 4: Verify full test suite passes**

Run: `node backend/src/utils/chest-helpers.test.js && node backend/src/services/deliveryEngine.test.js`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/bot.js backend/src/routes/fleet.js src/transfer.js
git commit -m "feat(delivery): wire DeliveryEngine into BotService, chat commands, and REST API routes"
```
