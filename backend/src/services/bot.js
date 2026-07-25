import mineflayer from 'mineflayer';
import pathfinderModule from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';
import { EventEmitter } from 'events';
import { chestService } from './chest.js';
import { configService } from './config.js';

const { pathfinder: pathfinderPlugin, Movements, goals } = pathfinderModule;

export class BotService extends EventEmitter {
  constructor(botConfig) {
    super();
    this.botConfig = botConfig;
    this.bot = null;
    this.movements = null;
    this.connected = false;
  }
  
  async start() {
    if (this.bot) return;
    
    return new Promise((resolve, reject) => {
      this.bot = mineflayer.createBot(this.botConfig);
      this.bot.loadPlugin(pathfinderPlugin);
      
      this.setupEventHandlers();
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      this.bot.once('spawn', () => {
        clearTimeout(timeout);
        
        // Initialize pathfinder movements after spawn
        this.movements = new Movements(this.bot);
        this.movements.scafoldingBlocks = [];
        this.bot.pathfinder.setMovements(this.movements);
        
        this.connected = true;
        this.bot.chat(`/login ${this.botConfig.password}`);
        resolve();
      });
      
      this.bot.once('error', (err) => {
        clearTimeout(timeout);
        console.error('Bot connection error:', err.message);
        this.bot = null;
        this.connected = false;
        reject(err);
      });
      
      this.bot.once('end', (reason) => {
        clearTimeout(timeout);
        this.bot = null;
        this.connected = false;
        this.emit('end');
      });
    });
  }
  
  setupEventHandlers() {
    this.bot.on('chat', (username, message) => {
      this.emit('chat', { username, message, timestamp: Date.now() });
      
      if (message.startsWith('!w ')) {
        const cmd = message.substring(3).trim();
        this.bot.chat(cmd);
      }
    });
    
    this.bot.on('whisper', (username, message) => {
      this.emit('whisper', { username, message, timestamp: Date.now() });
      
      if (message === '!list') {
        const chests = chestService.getAll();
        const list = Object.keys(chests).map((k, i) => `${i + 1}. ${k}`).join('\n');
        this.bot.chat(`/w ${username} ${list || 'No kits available'}`);
      }
    });
    
    this.bot.on('error', (err) => {
      console.error('Bot error:', err);
      this.emit('error', err);
    });
  }
  
  async takeItemFromChest(chestName, amount, player) {
    if (!this.bot || !this.connected) throw new Error('Bot not connected');
    
    const chestData = chestService.get(chestName);
    if (!chestData) throw new Error(`Chest "${chestName}" not found`);
    
    const { x, y, z, item } = chestData;
    const chestPos = new Vec3(x, y, z);
    
    this.bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1));
    
    await new Promise((resolve, reject) => {
      this.bot.once('goal_reached', async () => {
        try {
          const chestBlock = this.bot.blockAt(chestPos);
          if (!chestBlock) throw new Error('Chest block not found');
          
          const chest = await this.bot.openContainer(chestBlock);
          await chest.withdraw(this.bot.registry.itemsByName[item].id, null, amount);
          chest.close();
          
          this.bot.chat(`/w ${player} Took ${amount} ${item} from "${chestName}" chest.`);
          this.bot.chat(`/tpa ${player}`);
          
          this.bot.pathfinder.setGoal(null);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      setTimeout(() => reject(new Error('Pathfinding timeout')), 60000);
    });
  }
  
  leaveServer() {
    if (this.bot && this.connected) {
      this.bot.quit('Leaving server via API');
      return true;
    }
    return false;
  }
  
  getStatus() {
    return this.connected ? 'online' : 'offline';
  }
  
  getBot() {
    return this.bot;
  }
}

export const botService = new BotService(configService.getBotConfig());