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

export default openChestSafely;
