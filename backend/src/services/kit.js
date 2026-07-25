import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { botService } from './bot.js';
import { chestService } from './chest.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const ORDERS_FILE = join(process.cwd(), 'orders.json');

export const kitService = {
  async orderKit(chestName, amount, player) {
    const chests = chestService.getAll();
    const chest = chests[chestName];
    
    if (!chest || !chest.x || !chest.y || !chest.z || !chest.item) {
      throw new Error('Chest not found or incomplete');
    }
    
    await botService.takeItemFromChest(chestName, amount, player);
    
    // Post-delivery rescan (D-10, D-11, D-12)
    // Rescan the specific chest that was just used to update item counts
    if (chest) {
      try {
        const rescanResult = await botService.rescanChest(chest.x, chest.y, chest.z);
        if (rescanResult.status === 'unavailable') {
          console.warn(`Chest "${chestName}" missing after delivery - marked unavailable`);
        }
      } catch (err) {
        console.error(`Rescan failed for "${chestName}":`, err.message);
        // Don't fail the order if rescan fails
      }
    }
    
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
  
  /**
   * Get chests that haven't been scanned recently or are unavailable.
   * Queries the database for per-bot chest data.
   */
  getUnscannedChests() {
    // Query all chests from database that need rescanning
    // (never scanned or marked unavailable)
    const allChests = db.select().from(schema.chestLocations).all();
    return allChests
      .filter((chest) => !chest.lastScanned || chest.status === 'unavailable')
      .map((chest) => ({
        id: chest.id,
        name: chest.name,
        x: chest.x,
        y: chest.y,
        z: chest.z,
        item: chest.itemName,
        status: chest.status,
        lastScanned: chest.lastScanned,
        botId: chest.botId,
      }));
  },
  
  /**
   * Scan only unavailable chests to rediscover moved/missing ones (D-13).
   * @returns {Promise<Array>} Results for each chest rescan
   */
  async scanUnavailableChests() {
    const unavailable = this.getUnscannedChests();
    const results = [];
    
    for (const chest of unavailable) {
      try {
        const result = await botService.rescanChest(chest.x, chest.y, chest.z);
        results.push({ name: chest.name, ...result });
      } catch (err) {
        results.push({ name: chest.name, status: 'error', error: err.message });
      }
    }
    
    return results;
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
