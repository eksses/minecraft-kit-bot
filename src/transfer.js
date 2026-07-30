const fs = require('fs');
const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

let botInstance = null;
let chestsData = {};

module.exports = (bot) => {
  botInstance = bot;
  console.log('[LIVE-DEBUG] Bot instance set:', botInstance ? 'Available' : 'Not available');

  // Function to load chest data from JSON file
  const loadChestData = () => {
    try {
      const data = fs.readFileSync('./chestData.json', 'utf8');
      chestsData = JSON.parse(data);
      console.log('[LIVE-DEBUG] Chest data loaded successfully (transfer module):', Object.keys(chestsData));
    } catch (err) {
      console.error('[LIVE-DEBUG] Error loading chest data:', err.message);
    }
  };

  // Load chest data on module initialization
  loadChestData();

  const takeItemFromChest = async (chestName, amount = 1, player) => {
    if (!botInstance) {
      throw new Error('Bot instance is not available.');
    }

    console.log(`[LIVE-DEBUG] Starting takeItemFromChest: chestName="${chestName}", amount=${amount}, player="${player}"`);
    const chestData = chestsData[chestName];

    if (chestData && chestData.x !== undefined && chestData.y !== undefined && chestData.z !== undefined && chestData.item) {
      const chestPos = new Vec3(chestData.x, chestData.y, chestData.z);
      console.log(`[LIVE-DEBUG] Target chest "${chestName}" position: (${chestPos.x}, ${chestPos.y}, ${chestPos.z}), expected item: ${chestData.item}`);

      botInstance.clearControlStates();
      botInstance.pathfinder.setGoal(new goals.GoalNear(chestPos.x, chestPos.y, chestPos.z, 1));

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          botInstance.pathfinder.setGoal(null);
          reject(new Error(`Pathfinding timeout to chest "${chestName}" at (${chestPos.x}, ${chestPos.y}, ${chestPos.z})`));
        }, 30000);

        botInstance.once('goal_reached', async () => {
          clearTimeout(timeout);
          console.log(`[LIVE-DEBUG] Goal reached for chest "${chestName}".`);
          
          try {
            const chestBlock = botInstance.blockAt(chestPos);
            console.log(`[LIVE-DEBUG] Block at (${chestPos.x}, ${chestPos.y}, ${chestPos.z}): ${chestBlock ? chestBlock.name : 'NULL'}`);
            
            if (!chestBlock) {
              throw new Error(`Block at (${chestPos.x}, ${chestPos.y}, ${chestPos.z}) not found in world.`);
            }

            // Align view angle before opening
            try {
              await botInstance.lookAt(chestPos.offset(0.5, 0.5, 0.5));
            } catch (_) {}

            console.log(`[LIVE-DEBUG] Opening container at (${chestPos.x}, ${chestPos.y}, ${chestPos.z})...`);
            
            let chest;
            if (typeof botInstance.openChest === 'function') {
              chest = await botInstance.openChest(chestBlock);
            } else {
              chest = await botInstance.openContainer(chestBlock);
            }
            
            console.log(`[LIVE-DEBUG] Container opened successfully! Total slots: ${chest.slots.length}`);

            const rawItemName = chestData.item.toLowerCase().replace(/ /g, '_');
            let itemId = null;

            if (botInstance.registry && botInstance.registry.itemsByName[rawItemName]) {
              itemId = botInstance.registry.itemsByName[rawItemName].id;
              console.log(`[LIVE-DEBUG] Resolved item "${chestData.item}" via registry ID: ${itemId}`);
            } else {
              // Fallback to container items
              const containerItems = chest.containerItems ? chest.containerItems() : chest.slots.filter(Boolean);
              if (containerItems.length > 0) {
                itemId = containerItems[0].type;
                console.log(`[LIVE-DEBUG] Fallback to first item in container ID: ${itemId} (${containerItems[0].name})`);
              }
            }

            if (itemId == null) {
              chest.close();
              throw new Error(`Item "${chestData.item}" not recognized and chest is empty.`);
            }

            console.log(`[LIVE-DEBUG] Withdrawing item ID ${itemId} x${amount}...`);
            await chest.withdraw(itemId, null, amount);
            chest.close();
            console.log(`[LIVE-DEBUG] Container closed after withdrawal.`);

            if (player) {
              console.log(`[LIVE-DEBUG] Whispering and sending /tpa to ${player}`);
              botInstance.chat(`/w ${player} Took ${amount} ${chestData.item} from "${chestName}" chest.`);
              botInstance.chat(`/tpa ${player}`);
            }

            botInstance.pathfinder.setGoal(null);
            resolve();
          } catch (error) {
            console.error(`[LIVE-DEBUG] Error during chest interaction:`, error.message);
            botInstance.pathfinder.setGoal(null);
            reject(error);
          }
        });
      });
    } else {
      throw new Error(`Chest "${chestName}" data not found or incomplete.`);
    }
  };

  return {
    loadChestData,
    takeItemFromChest,
    chestsData,
  };
};
