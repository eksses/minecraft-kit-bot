import mineflayer from 'mineflayer';
import pathfinderModule from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';
import { EventEmitter } from 'events';
import { chestService } from './chest.js';
import { configService } from './config.js';
import { ChestScanner } from './chest-scanner.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const { pathfinder: pathfinderPlugin, Movements, goals } = pathfinderModule;

export class BotService extends EventEmitter {
  constructor(botConfig) {
    super();
    this.botConfig = botConfig;
    this.bot = null;
    this.movements = null;
    this.connected = false;
    this.scanner = null; // Will be initialized after spawn
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
      
      this.bot.once('spawn', async () => {
        clearTimeout(timeout);
        
        // Initialize pathfinder movements after spawn
        this.movements = new Movements(this.bot);
        this.movements.scafoldingBlocks = [];
        this.bot.pathfinder.setMovements(this.movements);
        
        this.connected = true;
        this.bot.chat(`/login ${this.botConfig.password}`);
        
        // Initialize ChestScanner (D-17: progress events wired)
        this.scanner = new ChestScanner(this.bot, db);
        
        // Wire progress events to EventEmitter for WebSocket forwarding
        this.scanner.on('progress', (data) => {
          this.emit('scan-progress', data);
        });
        
        this.scanner.on('complete', (results) => {
          this.emit('scan-complete', results);
        });
        
        // Auto-scan on connect if configured (D-01, D-02)
        try {
          const scanConfig = await this.getScanConfig();
          if (scanConfig?.autoScanOnConnect) {
            // Delay slightly to let bot settle
            setTimeout(() => {
              this.startScan(scanConfig.scanRadius, {
                scanMarkedOnly: scanConfig.scanMarkedEnabled,
              }).catch((err) => {
                console.error('Auto-scan failed:', err.message);
              });
            }, 5000);
          }
        } catch (err) {
          console.error('Failed to check scan config:', err.message);
        }
        
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
        this.scanner = null;
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
  
  // ============================================================
  // Scan Methods (ChestScanner integration)
  // ============================================================
  
  /**
   * Start a chest scan with given radius and options.
   * @param {number} radius - Scan radius in blocks (1-128)
   * @param {Object} options - { scanMarkedOnly: boolean }
   * @returns {Promise<Object>} Scan results
   */
  async startScan(radius = 32, options = {}) {
    if (!this.scanner) throw new Error('Scanner not initialized');
    return this.scanner.scan(radius, options);
  }
  
  /**
   * Rescan a specific chest after delivery.
   * @param {number} x - Chest X coordinate
   * @param {number} y - Chest Y coordinate
   * @param {number} z - Chest Z coordinate
   * @returns {Promise<Object>} Rescan result
   */
  async rescanChest(x, y, z) {
    if (!this.scanner) throw new Error('Scanner not initialized');
    return this.scanner.rescanChest(x, y, z);
  }
  
  /**
   * Abort the current scan.
   */
  abortScan() {
    if (this.scanner) {
      this.scanner.abort();
    }
  }
  
  /**
   * Check if a scan is currently in progress.
   * @returns {boolean}
   */
  isScanning() {
    return this.scanner?.scanning || false;
  }
  
  // ============================================================
  // Scan Config
  // ============================================================
  
  /**
   * Get scan configuration for this bot from the database.
   * Returns default config if none exists.
   */
  async getScanConfig() {
    // Find this bot's ID from the database
    const botRecord = await db.query.bots.findFirst({
      where: eq(schema.bots.username, this.botConfig.username),
    });
    
    if (!botRecord) {
      // Return defaults if bot not in DB yet
      return {
        scanMarkedEnabled: false,
        autoScanOnConnect: false,
        scanIntervalMs: null,
        scanRadius: 32,
        allowUnnamedOrders: true,
      };
    }
    
    const scanConfig = await db.query.scanConfigs.findFirst({
      where: eq(schema.scanConfigs.botId, botRecord.id),
    });
    
    if (!scanConfig) {
      return {
        scanMarkedEnabled: false,
        autoScanOnConnect: false,
        scanIntervalMs: null,
        scanRadius: 32,
        allowUnnamedOrders: true,
      };
    }
    
    return {
      scanMarkedEnabled: scanConfig.scanMarkedEnabled,
      autoScanOnConnect: scanConfig.autoScanOnConnect,
      scanIntervalMs: scanConfig.scanIntervalMs,
      scanRadius: scanConfig.scanRadius,
      allowUnnamedOrders: scanConfig.allowUnnamedOrders,
    };
  }
  
  // ============================================================
  // Legacy Methods
  // ============================================================
  
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
