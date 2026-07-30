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
    if (!chestData || !chestData.x || !chestData.y || !chestData.z || !chestData.item) {
      throw new Error(`Chest "${chestName}" data not found or incomplete.`);
    }

    const chestPos = new Vec3(chestData.x, chestData.y, chestData.z);

    // If DeliveryEngine is attached and DELIVERY_MODE is ELYTRA, execute full Elytra delivery pipeline
    if (botInstance.deliveryEngine && botInstance.deliveryEngine.getConfig().DELIVERY_MODE === 'ELYTRA') {
      const targetCoords = botInstance.deliveryEngine.resolveTargetCoordinates({ x: chestData.x, y: chestData.y, z: chestData.z });
      botInstance.chat(`/w ${player} Initiating Elytra kit delivery for "${chestName}" to (${targetCoords.x}, ${targetCoords.z})...`);
      
      const fakeChestService = { get: (name) => chestsData[name] || { x: chestData.x, y: chestData.y, z: chestData.z, item: chestData.item } };
      await botInstance.deliveryEngine.prepareBaseAndPurify(botInstance, fakeChestService, [chestData.item], targetCoords);
      await botInstance.deliveryEngine.executeFlightAndDelivery(botInstance, targetCoords, [chestData.item]);
      await botInstance.deliveryEngine.executePostDeliveryRoutine(botInstance);
      return;
    }

    const distance = botInstance.entity?.position ? botInstance.entity.position.distanceTo(chestPos) : 999;

    if (distance > 2.3) {
      const goal = goals.GoalGetToBlock
        ? new goals.GoalGetToBlock(chestPos.x, chestPos.y, chestPos.z)
        : new goals.GoalNear(chestPos.x, chestPos.y, chestPos.z, 2.0);

      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          botInstance.removeListener('goal_reached', finish);
          botInstance.removeListener('path_stop', finish);
          resolve();
        };

        const timer = setTimeout(() => {
          if (botInstance.pathfinder) botInstance.pathfinder.stop();
          finish();
        }, 15000);

        botInstance.once('goal_reached', finish);
        botInstance.once('path_stop', finish);
        botInstance.pathfinder.setGoal(goal);
      });
    }

    const chestBlock = botInstance.blockAt(chestPos);
    if (!chestBlock) throw new Error(`Chest block not found at ${chestPos}`);

    botInstance.pathfinder.stop();
    try { await botInstance.unequip('hand'); } catch (_) {}
    botInstance.setControlState('sneak', false);
    await botInstance.lookAt(chestBlock.position.offset(0.5, 0.5, 0.5));
    await botInstance.waitForTicks(3);

    const chest = await botInstance.openContainer(chestBlock);
    const item = chestData.item;
    const itemDef = botInstance.registry?.itemsByName?.[item];
    if (!itemDef) throw new Error(`Item ${item} not found in registry`);

    await chest.withdraw(itemDef.id, null, amount);
    chest.close();

    botInstance.chat(`/w ${player} Took ${amount} ${item} from "${chestName}" chest.`);
    botInstance.chat(`/tpa ${player}`);
  };

  return {
    loadChestData,
    takeItemFromChest,
    chestsData, // Export chestsData
  };
};
