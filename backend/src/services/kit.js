import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { botService } from './bot.js';
import { chestService } from './chest.js';

const ORDERS_FILE = join(process.cwd(), 'orders.json');

export const kitService = {
  async orderKit(chestName, amount, player) {
    const chests = chestService.getAll();
    const chest = chests[chestName];
    
    if (!chest || !chest.x || !chest.y || !chest.z || !chest.item) {
      throw new Error('Chest not found or incomplete');
    }
    
    await botService.takeItemFromChest(chestName, amount, player);
    
    const order = {
      id: Date.now().toString(),
      chestName,
      amount,
      player,
      item: chest.item,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
    
    this.saveOrder(order);
    return order;
  },
  
  getAvailableChests() {
    const chests = chestService.getAll();
    const result = {};
    for (const [name, chest] of Object.entries(chests)) {
      if (chest.x !== undefined && chest.y !== undefined && chest.z !== undefined && chest.item) {
        result[name] = chest;
      }
    }
    return result;
  },
  
  getOrderHistory() {
    if (!existsSync(ORDERS_FILE)) return [];
    try {
      const data = readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },
  
  saveOrder(order) {
    const orders = this.getOrderHistory();
    orders.unshift(order);
    if (orders.length > 1000) orders.length = 1000;
    writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  },
};