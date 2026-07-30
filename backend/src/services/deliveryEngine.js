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
      ? calculateRequiredElytraDurability(totalDistance, 22, 0)
      : Math.ceil(totalDistance / 22) + 15;

    const elytraCount = Math.max(1, Math.ceil(elytraDurability / 432)); // standard elytra max durability ~432

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

  filterPurifiedItems(items) {
    const allowed = ['firework_rocket', 'elytra', 'ender_chest', 'minecraft:firework_rocket', 'minecraft:elytra', 'minecraft:ender_chest'];
    const kept = [];
    const toDeposit = [];

    for (const item of items || []) {
      if (!item) continue;
      if (allowed.includes(item.name)) {
        kept.push(item);
      } else {
        toDeposit.push(item);
      }
    }

    return { kept, toDeposit };
  }

  formatDeliveryMessage(pos) {
    return `Delivery complete! Chest placed at X: ${pos.x} Y: ${pos.y} Z: ${pos.z}.`;
  }

  selectSuicideHazard(hazards) {
    if (!hazards || hazards.length === 0) return null;
    const priority = { lava: 1, mob: 2, water: 3, wander: 4 };
    return hazards.sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99))[0];
  }

  async prepareBaseAndPurify(bot, chestService, deliveryItems = [], targetPos) {
    if (!bot) throw new Error('Bot instance is required');

    const basePos = bot.entity?.position
      ? { x: Math.floor(bot.entity.position.x), y: Math.floor(bot.entity.position.y), z: Math.floor(bot.entity.position.z) }
      : this.config.BASE_COORDINATES;

    const supplies = this.calculateSupplies(basePos, targetPos);
    const keys = this.config.STORAGE_KEYS;

    // Withdraw utility blocks if chestService is provided
    if (chestService && typeof chestService.get === 'function') {
      if (bot.service?.takeItemFromChest) {
        try { await bot.service.takeItemFromChest(keys.ender, 1, 'system'); } catch (_) {}
        try { await bot.service.takeItemFromChest(keys.chest, 1, 'system'); } catch (_) {}
        try { await bot.service.takeItemFromChest(keys.elytra, supplies.elytraCount, 'system'); } catch (_) {}
        try { await bot.service.takeItemFromChest(keys.rocket, supplies.rockets, 'system'); } catch (_) {}
      }
    }

    // Purify Inventory
    if (bot.inventory?.items) {
      const currentItems = bot.inventory.items();
      const { toDeposit } = this.filterPurifiedItems(currentItems);

      const chestData = chestService?.get?.(keys.chest);
      if (toDeposit.length > 0 && chestData) {
        const { Vec3 } = await import('vec3');
        const storagePos = new Vec3(chestData.x, chestData.y, chestData.z);
        const storageBlock = bot.blockAt(storagePos);
        if (storageBlock) {
          const { openChestSafely } = await import('../utils/chest-helpers.js');
          const container = await openChestSafely(bot, storageBlock);
          if (container) {
            for (const item of toDeposit) {
              try { await container.deposit(item.type, null, item.count); } catch (_) {}
            }
            container.close();
          }
        }
      }
    }

    return supplies;
  }

  async executeFlightAndDelivery(bot, targetPos, deliveryItems = []) {
    const { ElytraFlight } = await import('@eksses/eafe');
    const { openChestSafely } = await import('../utils/chest-helpers.js');
    const { Vec3 } = await import('vec3');

    // 1. Autonomous Elytra Flight
    if (this.config.DELIVERY_MODE === 'ELYTRA') {
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
    }

    // 2. Unload Ender Chest (if present in inventory)
    const botPos = bot.entity?.position || new Vec3(targetPos.x, targetPos.y || 64, targetPos.z);
    const dropVec = botPos.offset(1, 0, 0).floored();

    const echestItem = bot.inventory?.items()?.find(i => i.name.includes('ender_chest'));
    if (echestItem && typeof bot.placeBlock === 'function') {
      try {
        await bot.equip(echestItem, 'hand');
        const refBlock = bot.blockAt(dropVec.offset(0, -1, 0));
        if (refBlock) {
          await bot.placeBlock(refBlock, new Vec3(0, 1, 0));
          const container = await openChestSafely(bot, bot.blockAt(dropVec));
          if (container) {
            // Withdraw items
            container.close();
          }
          if (typeof bot.dig === 'function') {
            await bot.dig(bot.blockAt(dropVec));
          }
        }
      } catch (_) {}
    }

    // 3. Place Standard Chest & Deposit Delivery Items
    const chestItem = bot.inventory?.items()?.find(i => i.name.includes('chest') && !i.name.includes('ender'));
    if (chestItem && typeof bot.placeBlock === 'function') {
      try {
        await bot.equip(chestItem, 'hand');
        const refBlock = bot.blockAt(dropVec.offset(0, -1, 0));
        if (refBlock) {
          await bot.placeBlock(refBlock, new Vec3(0, 1, 0));
        }
      } catch (_) {}
    }

    const placedChestBlock = bot.blockAt ? bot.blockAt(dropVec) : null;
    if (placedChestBlock) {
      const container = await openChestSafely(bot, placedChestBlock);
      if (container) {
        for (const item of bot.inventory?.items() || []) {
          if (!['firework_rocket', 'elytra', 'ender_chest', 'minecraft:firework_rocket', 'minecraft:elytra', 'minecraft:ender_chest'].includes(item.name)) {
            try { await container.deposit(item.type, null, item.count); } catch (_) {}
          }
        }
        container.close();
      }
    }

    // 4. Send Chat Notification
    const dropCoords = { x: Math.floor(dropVec.x), y: Math.floor(dropVec.y), z: Math.floor(dropVec.z) };
    const chatMsg = this.formatDeliveryMessage(dropCoords);
    if (typeof bot.chat === 'function') {
      bot.chat(chatMsg);
    }

    return dropCoords;
  }

  async executeSuicideWaterfall(bot) {
    if (!bot || !bot.entity) return 'wander';
    const radius = 32;
    const botPos = bot.entity.position;

    // 1. Scan Lava Hazard
    if (typeof bot.findBlock === 'function') {
      const lavaBlock = bot.findBlock({
        matching: (b) => b.name === 'lava' || b.name === 'flowing_lava',
        maxDistance: radius,
      });

      if (lavaBlock && bot.service?.pathTo) {
        try { await bot.service.pathTo(lavaBlock.position, 1); } catch (_) {}
        if (typeof bot.setControlState === 'function') bot.setControlState('forward', true);
        return 'lava';
      }
    }

    // 2. Scan Hostile Mob Hazard
    if (bot.entities) {
      const hostileMob = Object.values(bot.entities).find((e) => {
        if (!e || !e.position || e === bot.entity) return false;
        const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch', 'phantom', 'drowned', 'husk', 'stray'];
        return hostiles.includes(e.name) && botPos.distanceTo(e.position) <= radius;
      });

      if (hostileMob && bot.service?.pathTo) {
        try { await bot.service.pathTo(hostileMob.position, 1); } catch (_) {}
        if (typeof bot.clearControlStates === 'function') bot.clearControlStates();
        return 'mob';
      }
    }

    // 3. Scan Water Drowning Hazard
    if (typeof bot.findBlock === 'function') {
      const waterBlock = bot.findBlock({
        matching: (b) => b.name === 'water' || b.name === 'flowing_water',
        maxDistance: radius,
      });

      if (waterBlock && bot.service?.pathTo) {
        try { await bot.service.pathTo(waterBlock.position, 1); } catch (_) {}
        if (typeof bot.setControlState === 'function') bot.setControlState('sneak', true);
        return 'water';
      }
    }

    // 4. Wandering Hazard Fallback
    if (typeof bot.setControlState === 'function') {
      bot.setControlState('forward', true);
      bot.setControlState('sprint', true);
    }
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

      // Place Ender Chest & Stash Flight Gear
      const botPos = bot.entity?.position || new Vec3(basePos.x, basePos.y, basePos.z);
      const echestItem = bot.inventory?.items()?.find(i => i.name.includes('ender_chest'));
      if (echestItem && typeof bot.placeBlock === 'function') {
        const placeVec = botPos.offset(1, 0, 0).floored();
        const refBlock = bot.blockAt ? bot.blockAt(placeVec.offset(0, -1, 0)) : null;
        if (refBlock) {
          try {
            await bot.equip(echestItem, 'hand');
            await bot.placeBlock(refBlock, new Vec3(0, 1, 0));
            const container = await openChestSafely(bot, bot.blockAt(placeVec));
            if (container) {
              for (const item of bot.inventory?.items() || []) {
                if (['firework_rocket', 'elytra', 'minecraft:firework_rocket', 'minecraft:elytra'].includes(item.name)) {
                  try { await container.deposit(item.type, null, item.count); } catch (_) {}
                }
              }
              container.close();
            }
          } catch (_) {}
        }
      }
      return this.executeSuicideWaterfall(bot);
    }

    if (action === 'DIRECT_DIE') {
      return this.executeSuicideWaterfall(bot);
    }

    return 'UNKNOWN_ACTION';
  }
}

export const deliveryEngine = new DeliveryEngine();
export default DeliveryEngine;
