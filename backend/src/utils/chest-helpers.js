import pathfinderModule from 'mineflayer-pathfinder';

/**
 * Robust chest-opening helper function to address Paper server interaction packet requirements:
 * 1. Stops pathfinder
 * 2. Unequips main hand & disables sneaking
 * 3. Ensures bot is within interact range (under 2.5 blocks)
 * 4. Rotates head towards center of chest face
 * 5. Waits 3 server ticks (100-150ms) for position & head rotation packet sync
 * 6. Opens container using bot.openContainer(block)
 *
 * @param {Object} bot - Mineflayer bot instance
 * @param {Object} block - Mineflayer block object representing chest
 * @returns {Promise<Object|null>} Mineflayer Container object or null if failed
 */
export async function openChestSafely(bot, block) {
  if (!bot || !block) return null;

  try {
    // 1. Force pathfinder to stop completely
    if (bot.pathfinder && typeof bot.pathfinder.stop === 'function') {
      bot.pathfinder.stop();
    }

    // 2. Unequip main hand to prevent block-placement conflicts & disable sneaking
    if (typeof bot.unequip === 'function') {
      try {
        await bot.unequip('hand');
      } catch (_) {
        // Hand may already be empty or unequip unsupported in current state
      }
    }
    if (typeof bot.setControlState === 'function') {
      bot.setControlState('sneak', false);
    }

    // 3. Ensure bot is close (under 2.5 blocks)
    if (bot.entity && bot.entity.position && block.position) {
      const distance = bot.entity.position.distanceTo(block.position);
      if (distance > 2.5 && bot.pathfinder) {
        const goals = pathfinderModule.goals || pathfinderModule.default?.goals;
        if (goals && typeof bot.pathfinder.setGoal === 'function') {
          const goal = (typeof goals.GoalGetToBlock === 'function')
            ? new goals.GoalGetToBlock(block.position.x, block.position.y, block.position.z)
            : new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2.0);

          await new Promise((resolve) => {
            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              bot.removeListener('goal_reached', finish);
              bot.removeListener('path_stop', finish);
              resolve();
            };

            const timer = setTimeout(() => {
              if (bot.pathfinder) bot.pathfinder.stop();
              finish();
            }, 10000);

            bot.once('goal_reached', finish);
            bot.once('path_stop', finish);
            bot.pathfinder.setGoal(goal);
          });
        }
        if (typeof bot.pathfinder.stop === 'function') {
          bot.pathfinder.stop();
        }
      }
    }

    // 4. Look at the center of the chest face
    if (typeof bot.lookAt === 'function' && block.position && typeof block.position.offset === 'function') {
      await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));
    }

    // 5. Wait 3 server ticks so Paper registers position & head rotation
    if (typeof bot.waitForTicks === 'function') {
      await bot.waitForTicks(3);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // 6. Close stale windows and open container with 5s timeout
    if (bot.currentWindow) {
      try { bot.close(bot.currentWindow); } catch (_) {}
    }

    if (typeof bot.openContainer === 'function') {
      const container = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (bot.currentWindow) {
            try { bot.close(bot.currentWindow); } catch (_) {}
          }
          reject(new Error('Container open timeout (server did not send windowOpen)'));
        }, 5000);

        bot.openContainer(block).then((c) => {
          clearTimeout(timer);
          resolve(c);
        }).catch((err) => {
          clearTimeout(timer);
          if (bot.currentWindow) {
            try { bot.close(bot.currentWindow); } catch (_) {}
          }
          reject(err);
        });
      });
      return container;
    }

    return null;
  } catch (err) {
    console.error(`❌ Failed to open chest at ${block?.position || 'unknown'}: ${err.message}`);
    return null;
  }
}

/**
 * Safely saves scan results to database & chestData.json:
 * 1. Upserts chest by coordinates (x,y,z) OR by name for the given bot/user.
 * 2. De-duplicates matching records so duplicate rows are never created.
 * 3. Removes stale/missing chests within the scanned radius if they are no longer present.
 */
export async function saveScanResultsToDb(bot, scanData, scanRadius = 32) {
  if (!bot || !scanData || !scanData.chests) return;

  const { db, schema } = await import('../db/index.js');
  const { chestService } = await import('../services/chest.js');
  const { eq, and, or } = await import('drizzle-orm');
  const { randomUUID } = await import('crypto');

  const botId = bot.id || bot._botId;
  const userId = bot.userId || bot._userId;
  const serverId = bot.serverConfig?.id || bot._serverId || null;

  if (!botId || !userId) {
    console.warn('[ScanSave] Missing botId or userId for bot scan save');
    return;
  }

  const scannedKeys = new Set();

  for (const chest of scanData.chests) {
    const key = `${chest.x},${chest.y},${chest.z}`;
    scannedKeys.add(key);

    const chestName = chest.name || `unnamed:${chest.item || 'chest'}`;

    // Find existing chest locations for this bot matching coordinates OR name
    const existingList = await db.select()
      .from(schema.chestLocations)
      .where(and(
        eq(schema.chestLocations.botId, botId),
        or(
          and(
            eq(schema.chestLocations.x, chest.x),
            eq(schema.chestLocations.y, chest.y),
            eq(schema.chestLocations.z, chest.z)
          ),
          eq(schema.chestLocations.name, chestName)
        )
      ));

    const primary = existingList[0];

    if (primary) {
      // Update existing record
      await db.update(schema.chestLocations)
        .set({
          name: chestName,
          x: chest.x,
          y: chest.y,
          z: chest.z,
          itemName: chest.item,
          itemCount: chest.itemCount,
          allItems: JSON.stringify(chest.allItems),
          source: chest.source || 'scan',
          signData: chest.signData ? JSON.stringify(chest.signData) : null,
          status: 'active',
          isDouble: chest.isDouble || false,
          lastScanned: new Date(chest.lastScanned || Date.now()),
        })
        .where(eq(schema.chestLocations.id, primary.id));

      // Remove extra duplicate rows
      for (let i = 1; i < existingList.length; i++) {
        await db.delete(schema.chestLocations).where(eq(schema.chestLocations.id, existingList[i].id));
      }
    } else {
      // Insert new record
      await db.insert(schema.chestLocations).values({
        id: randomUUID(),
        userId,
        serverId,
        name: chestName,
        x: chest.x,
        y: chest.y,
        z: chest.z,
        itemName: chest.item,
        itemCount: chest.itemCount,
        allItems: JSON.stringify(chest.allItems),
        source: chest.source || 'scan',
        signData: chest.signData ? JSON.stringify(chest.signData) : null,
        status: 'active',
        isDouble: chest.isDouble || false,
        lastScanned: new Date(chest.lastScanned || Date.now()),
        botId,
        createdAt: new Date(),
      });
    }

    // Save to chestData.json
    if (chestName && chest.item && !chestName.startsWith('empty:')) {
      chestService.save(chestName, {
        x: chest.x,
        y: chest.y,
        z: chest.z,
        item: chest.item,
      });
    }
  }

  // Clean up missing/removed chests within scan radius
  const botPos = bot.position || bot.entity?.position;
  if (botPos) {
    const allBotChests = await db.select()
      .from(schema.chestLocations)
      .where(and(
        eq(schema.chestLocations.botId, botId),
        eq(schema.chestLocations.status, 'active')
      ));

    for (const chest of allBotChests) {
      const dx = Math.abs(chest.x - botPos.x);
      const dy = Math.abs(chest.y - botPos.y);
      const dz = Math.abs(chest.z - botPos.z);

      if (dx <= scanRadius && dy <= scanRadius && dz <= scanRadius) {
        const key = `${chest.x},${chest.y},${chest.z}`;
        if (!scannedKeys.has(key)) {
          console.log(`[ScanCleanup] Removing missing chest "${chest.name}" at (${chest.x}, ${chest.y}, ${chest.z})`);
          await db.delete(schema.chestLocations).where(eq(schema.chestLocations.id, chest.id));
          if (chest.name) {
            try { chestService.delete(chest.name); } catch (_) {}
          }
        }
      }
    }
  }
}

export default openChestSafely;
