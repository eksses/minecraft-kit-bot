import mineflayer from 'mineflayer';
import pathfinderModule from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';
import { EventEmitter } from 'events';
import { chestService } from './chest.js';
import { configService } from './config.js';
import { ChestScanner } from './chest-scanner.js';
import { openChestSafely } from '../utils/chest-helpers.js';
import { DeliveryEngine } from './deliveryEngine.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

const { pathfinder: pathfinderPlugin, Movements, goals } = pathfinderModule;

export class BotService extends EventEmitter {
  constructor(botConfig) {
    super();
    this.botConfig = botConfig;
    this.bot = null;
    this.movements = null;
    this.connected = false;
    this.scanner = null; // Will be initialized after spawn
    this.deliveryEngine = new DeliveryEngine();
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
        this.bot.service = this;
        this.bot.deliveryEngine = this.deliveryEngine;
        this.bot.chat(`/login ${this.botConfig.password}`);
        
        // Set bot metadata on the mineflayer object for ChestScanner DB writes
        // CR-02: These underscore-prefixed properties are read by ChestScanner.saveChestToDb
        try {
          const botRecord = await db.query.bots.findFirst({
            where: and(
              eq(schema.bots.username, this.botConfig.username),
            ),
          });
          if (botRecord) {
            this.bot._botId = botRecord.id;
            this.bot._userId = botRecord.userId;
            this.bot._serverId = botRecord.serverId;
          }
        } catch (err) {
          console.error('Failed to load bot metadata:', err.message);
        }
        
        // Initialize ChestScanner (D-17: progress events wired)
        this.scanner = new ChestScanner(this.bot, db);
        
        // Wire progress events to EventEmitter for WebSocket forwarding
        this.scanner.on('progress', (data) => {
          this.emit('scan-progress', { ...data, botId: this.botConfig.username });
        });
        
        this.scanner.on('complete', (results) => {
          this.emit('scan-complete', { ...results, botId: this.botConfig.username });
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
  
  /**
   * Safely and reliably pathfind to a target block/coordinate with pre-checks, movement tuning, fallback retry, and cleanup.
   */
  async pathTo(pos, range = 2.0, timeoutMs = 25000) {
    if (!this.bot || !this.bot.pathfinder) {
      throw new Error('Bot pathfinder is not initialized');
    }

    const targetVec = { x: Number(pos.x), y: Number(pos.y), z: Number(pos.z) };

    // 1. Distance pre-check: if bot is already standing next to target (<= 2.3 blocks), no pathing needed
    if (this.bot.entity?.position) {
      const currentDist = this.bot.entity.position.distanceTo(targetVec);
      if (currentDist <= Math.max(range, 2.0) + 0.3) {
        if (this.bot.pathfinder.isMoving()) {
          this.bot.pathfinder.stop();
        }
        return;
      }
    }

    // Tune pathfinder movements for smooth, collision-free walking
    if (this.bot.pathfinder.movements) {
      this.bot.pathfinder.movements.canDig = false;
      this.bot.pathfinder.movements.scafoldingBlocks = [];
      this.bot.pathfinder.movements.allowSprinting = false;
      this.bot.pathfinder.movements.allowFreeMotion = true;
      this.bot.pathfinder.movements.allowParkour = true;
    }

    const attemptPathing = (goal, timeoutMs) => {
      return new Promise((resolve, reject) => {
        let settled = false;

        const finish = (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (this.bot) {
            this.bot.removeListener('goal_reached', onGoalReached);
            this.bot.removeListener('path_stop', onPathStop);
            this.bot.removeListener('path_reset', onPathReset);
          }
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        const onGoalReached = () => finish();

        const onPathStop = () => {
          if (this.bot?.entity?.position && this.bot.entity.position.distanceTo(targetVec) <= Math.max(range, 2.0) + 0.5) {
            finish();
          } else {
            finish(new Error('Pathfinding stopped before reaching goal'));
          }
        };

        const onPathReset = (reason) => {
          if (reason === 'goal_updated' || reason === 'did_not_converge') {
            finish(new Error(`Pathfinding reset: ${reason}`));
          }
        };

        const timer = setTimeout(() => {
          if (this.bot?.pathfinder) {
            this.bot.pathfinder.stop();
          }
          finish(new Error(`Pathfinding timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        this.bot.once('goal_reached', onGoalReached);
        this.bot.once('path_stop', onPathStop);
        this.bot.once('path_reset', onPathReset);

        this.bot.pathfinder.setGoal(goal);
      });
    };

    // 2. Primary attempt: GoalGetToBlock or GoalNear(2.0)
    const primaryGoal = (typeof goals.GoalGetToBlock === 'function')
      ? new goals.GoalGetToBlock(targetVec.x, targetVec.y, targetVec.z)
      : new goals.GoalNear(targetVec.x, targetVec.y, targetVec.z, range);

    try {
      await attemptPathing(primaryGoal, Math.floor(timeoutMs * 0.6));
      return;
    } catch (primaryErr) {
      // Check if bot reached close enough distance during primary attempt
      if (this.bot.entity?.position) {
        if (this.bot.entity.position.distanceTo(targetVec) <= Math.max(range, 2.0) + 0.5) {
          if (this.bot.pathfinder.isMoving()) this.bot.pathfinder.stop();
          return;
        }
      }

      // 3. Fallback attempt: GoalNear with larger range (2.5)
      const fallbackGoal = new goals.GoalNear(targetVec.x, targetVec.y, targetVec.z, Math.max(range, 2.5));
      try {
        await attemptPathing(fallbackGoal, Math.floor(timeoutMs * 0.4));
        return;
      } catch (_) {
        if (this.bot.entity?.position && this.bot.entity.position.distanceTo(targetVec) <= 3.0) {
          if (this.bot.pathfinder.isMoving()) this.bot.pathfinder.stop();
          return;
        }
        throw new Error(`Could not pathfind to (${targetVec.x}, ${targetVec.y}, ${targetVec.z}): ${primaryErr.message}`);
      }
    }
  }

  async takeItemFromChest(chestName, amount, player) {
    if (!this.bot || !this.connected) throw new Error('Bot not connected');
    
    const chestData = chestService.get(chestName);
    if (!chestData) throw new Error(`Chest "${chestName}" not found`);
    
    const { x, y, z, item } = chestData;
    const chestPos = new Vec3(x, y, z);
    
    await this.pathTo(chestPos, 1);
    
    const chestBlock = this.bot.blockAt(chestPos);
    if (!chestBlock) throw new Error('Chest block not found');
    
    const chest = await openChestSafely(this.bot, chestBlock);
    if (!chest) throw new Error('Failed to open chest container safely');
    
    const itemDef = this.bot.registry.itemsByName[item];
    if (!itemDef) throw new Error(`Item "${item}" not found in Minecraft registry`);
    
    await chest.withdraw(itemDef.id, null, amount);
    chest.close();
    
    this.bot.chat(`/w ${player} Took ${amount} ${item} from "${chestName}" chest.`);
    this.bot.chat(`/tpa ${player}`);
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
    // Find this bot's ID from the database (WR-04: uniqueness via bot record lookup)
    // Note: botConfig.username is unique per BotService instance since it's a singleton
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
