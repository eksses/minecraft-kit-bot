const fs = require('fs');
const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

let botInstance = null;
let chestsData = {}; // Initialize chestsData

module.exports = (bot) => {
    
  botInstance = bot;
  console.log('Bot instance set:', botInstance ? 'Available' : 'Not available');

  let chestsData = {}; // Store chest data

  // Function to load chest data from JSON file
  const loadChestData = () => {
      try {
          const data = fs.readFileSync('chestData.json');
          chestsData = JSON.parse(data);
          console.log('Chest data loaded (transfer)');
      } catch (err) {
          console.error('Error loading chest data:', err);
      }
  };

  // Load chest data on module initialization
  loadChestData();



  const takeItemFromChest = async (chestName, amount, player) => {
    if (!botInstance) {
      throw new Error('Bot instance is not available.');
    }

    const chestData = chestsData[chestName];
    if (chestData && chestData.x && chestData.y && chestData.z && chestData.item) {
      const chestPos = new Vec3(chestData.x, chestData.y, chestData.z);
      botInstance.pathfinder.setGoal(new goals.GoalNear(chestPos.x, chestPos.y, chestPos.z, 1));

      await new Promise((resolve, reject) => {
        botInstance.once('goal_reached', async () => {
          try {
            const chestBlock = botInstance.blockAt(chestPos);
            if (!chestBlock) throw new Error(`Chest block at (${chestPos.x}, ${chestPos.y}, ${chestPos.z}) not found.`);

            botInstance.clearControlStates();
            const topFace = new Vec3(0, 1, 0);
            try {
              await botInstance.lookAt(chestPos.offset(0.5, 0.95, 0.5));
            } catch (_) {}

            let chest;
            if (typeof botInstance.openChest === 'function') {
              chest = await botInstance.openChest(chestBlock, topFace);
            } else {
              chest = await botInstance.openContainer(chestBlock, topFace);
            }

            const item = chestData.item;
            await chest.withdraw(botInstance.registry.itemsByName[item].id, null, amount);
            chest.close();

            botInstance.chat(`/w ${player} Took ${amount} ${item} from "${chestName}" chest.`);
            botInstance.chat(`/tpa ${player}`);
            botInstance.pathfinder.setGoal(null);
            resolve();
          } catch (error) {
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
    chestsData, // Export chestsData
  };
};
