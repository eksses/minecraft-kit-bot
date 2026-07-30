import { EventEmitter } from 'events';
import { db } from '../db/index.js';
import { chestLocations } from '../db/schema.js';
import { eq, and, like } from 'drizzle-orm';

export class TradingService extends EventEmitter {
  constructor(botLifecycleManager) {
    super();
    this.botLifecycleManager = botLifecycleManager;
  }

  async fulfillOrder(botId, playerName, chestName, count = 1) {
    const bot = this.botLifecycleManager.getBot(botId);
    if (!bot) {
      return { success: false, error: 'Bot not found' };
    }

    if (bot.status !== 'IDLE' && bot.status !== 'WORKING') {
      return { success: false, error: 'Bot is busy' };
    }

    const chest = await this.findChestByName(botId, chestName);
    if (!chest) {
      return { success: false, error: 'Chest "' + chestName + '" not found' };
    }

    const itemName = chest.itemName;
    bot.takeItem(chest.x, chest.y, chest.z, itemName, count, playerName);

    bot.once('item_taken', () => {
      this.emit('order_complete', { playerName, chestName, itemName, count });
    });

    bot.once('item_take_error', (err) => {
      bot.sendCommand('/w ' + playerName + ' Sorry, could not get ' + itemName + ': ' + err.error);
      this.emit('order_failed', { playerName, chestName, itemName, error: err.error });
    });

    return { success: true, chest: chest.name, itemName: chest.itemName };
  }

  async findChestByName(botId, chestName) {
    if (!chestName) return null;
    const normalizedName = chestName.toLowerCase().replace(/ /g, '_');

    const chests = await db.query.chestLocations.findMany({
      where: and(
        eq(chestLocations.botId, botId),
        eq(chestLocations.status, 'active'),
      ),
    });

    for (const chest of chests) {
      if (chest.name && chest.name.toLowerCase().replace(/ /g, '_') === normalizedName) {
        return chest;
      }
    }

    for (const chest of chests) {
      if (chest.name && chest.name.toLowerCase().includes(normalizedName)) {
        return chest;
      }
    }

    return null;
  }

  async getAvailableItems(botId) {
    const chests = await db.query.chestLocations.findMany({
      where: and(
        eq(chestLocations.botId, botId),
        eq(chestLocations.status, 'active'),
      ),
    });

    const items = new Map();
    for (const chest of chests) {
      if (chest.name && !chest.name.startsWith('empty:')) {
        const existing = items.get(chest.name) || { name: chest.name, itemName: chest.itemName, count: 0, chests: [] };
        existing.count += chest.itemCount || 0;
        existing.chests.push({ x: chest.x, y: chest.y, z: chest.z });
        items.set(chest.name, existing);
      }
    }

    return Array.from(items.values());
  }
}
