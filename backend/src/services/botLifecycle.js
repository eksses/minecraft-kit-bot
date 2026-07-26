import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// Bot Worker Script (runs in separate thread)
// ============================================================
const BOT_WORKER_SCRIPT = `
const { parentPort, workerData } = require('worker_threads');
const mineflayer = require('mineflayer');
const pathfinderModule = require('mineflayer-pathfinder');

const { pathfinder: pathfinderPlugin, Movements, goals } = pathfinderModule;

let bot = null;
let movements = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

function createBot(config) {
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    version: config.version,
    auth: config.authType || 'offline',
  });

  bot.loadPlugin(pathfinderPlugin);

  bot.once('spawn', () => {
    movements = new Movements(bot);
    movements.scafoldingBlocks = [];
    bot.pathfinder.setMovements(movements);
    reconnectAttempts = 0;
    
    // Handle offline auth - /login or /register on spawn
    if (config.authMode === 'OFFLINE' && config.authPassword) {
      // Try /login first, if it fails (account doesn't exist), try /register
      setTimeout(() => {
        bot.chat('/login ' + config.authPassword);
      }, 1000);
    }
    
    parentPort.postMessage({
      type: 'spawned',
      data: {
        username: bot.username,
        entityId: bot.entity?.id,
        health: bot.health,
        food: bot.food,
      }
    });
  });

  bot.on('health', () => {
    parentPort.postMessage({
      type: 'health',
      data: {
        health: bot.health,
        food: bot.food,
        saturation: bot.foodSaturation,
      }
    });
  });

  bot.on('playerCollect', (collector, collected) => {
    if (collector === bot.entity) {
      parentPort.postMessage({
        type: 'inventory_update',
        data: { items: bot.inventory.items().map(i => ({
          name: i.name,
          count: i.count,
          slot: i.slot,
        }))}
      });
    }
  });

  bot.on('move', () => {
    parentPort.postMessage({
      type: 'position',
      data: {
        x: Math.round(bot.entity.position.x),
        y: Math.round(bot.entity.position.y),
        z: Math.round(bot.entity.position.z),
      }
    });
  });

  bot.on('goal_reached', () => {
    parentPort.postMessage({ type: 'goal_reached' });
  });

  bot.on('path_update', (result) => {
    parentPort.postMessage({
      type: 'path_update',
      data: { status: result.status }
    });
  });

  bot.on('death', () => {
    parentPort.postMessage({ type: 'death' });
  });

  bot.on('kicked', (reason) => {
    parentPort.postMessage({
      type: 'kicked',
      data: { reason: reason.toString() }
    });
  });

  bot.on('error', (err) => {
    parentPort.postMessage({
      type: 'error',
      data: { message: err.message, stack: err.stack }
    });
  });

  bot.on('end', (reason) => {
    parentPort.postMessage({
      type: 'disconnected',
      data: { reason: reason?.toString() || 'Unknown' }
    });
    attemptReconnect(config);
  });
}

function attemptReconnect(config) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    parentPort.postMessage({
      type: 'reconnect_failed',
      data: { attempts: reconnectAttempts }
    });
    return;
  }

  reconnectAttempts++;
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1);
  
  parentPort.postMessage({
    type: 'reconnecting',
    data: { attempt: reconnectAttempts, delay }
  });

  setTimeout(() => createBot(config), delay);
}

// Handle messages from main thread
parentPort.on('message', (msg) => {
  if (msg.type === 'command' && bot) {
    try {
      bot.chat(msg.data.command);
      parentPort.postMessage({ type: 'command_sent', data: { command: msg.data.command } });
    } catch (err) {
      parentPort.postMessage({ type: 'command_error', data: { error: err.message } });
    }
  }
  
  if (msg.type === 'navigate' && bot && movements) {
    const { x, y, z } = msg.data;
    bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1));
  }

  if (msg.type === 'take_item' && bot) {
    const { chestX, chestY, chestZ, itemName, count } = msg.data;
    handleTakeItem(bot, chestX, chestY, chestZ, itemName, count);
  }

  if (msg.type === 'stop') {
    if (bot) {
      bot.quit('Stopped by operator');
    }
    process.exit(0);
  }
});

async function handleTakeItem(bot, x, y, z, itemName, count) {
  try {
    const chestPos = new (require('vec3').Vec3)(x, y, z);
    bot.pathfinder.setGoal(new goals.GoalNear(x, y, z, 1));
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Pathfinding timeout')), 30000);
      bot.once('goal_reached', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    const chestBlock = bot.blockAt(chestPos);
    if (!chestBlock) throw new Error('Chest block not found');
    
    const chest = await bot.openContainer(chestBlock);
    const item = chest.slots.find(s => s?.name === itemName);
    
    if (!item) {
      chest.close();
      throw new Error(\`Item \${itemName} not found in chest\`);
    }

    await chest.withdraw(item.type, null, count || 1);
    chest.close();
    
    parentPort.postMessage({
      type: 'item_taken',
      data: { itemName, count: count || 1, success: true }
    });
  } catch (err) {
    parentPort.postMessage({
      type: 'item_take_error',
      data: { error: err.message }
    });
  }
}

// Start bot with worker data
createBot(workerData);
`;

// ============================================================
// BotInstance Class
// ============================================================
export class BotInstance extends EventEmitter {
  constructor(botData, serverConfig) {
    super();
    this.id = botData.id;
    this.userId = botData.userId;
    this.name = botData.name;
    this.username = botData.username;
    this.serverConfig = serverConfig;
    this.worker = null;
    this.status = 'OFFLINE';
    this.position = { x: 0, y: 0, z: 0 };
    this.health = 20;
    this.food = 20;
    this.saturation = 5;
    this.currentTask = null;
    this.lastSeen = null;
  }

  start() {
    this.worker = new Worker(BOT_WORKER_SCRIPT, {
      eval: true,
      workerData: {
        host: this.serverConfig.host,
        port: this.serverConfig.port,
        username: this.username,
        password: this.serverConfig.passwordEncrypted,
        version: this.serverConfig.version,
        authType: this.serverConfig.authType,
        authMode: this.serverConfig.authMode,
        authPassword: this.serverConfig.authPassword,
      }
    });

    this.worker.on('message', (msg) => this.handleMessage(msg));
    this.worker.on('error', (err) => this.emit('error', err));
    this.worker.on('exit', (code) => this.emit('exit', code));

    this.status = 'OFFLINE';
    this.emit('status_change', this.status);
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'spawned':
        this.status = 'IDLE';
        this.health = msg.data.health;
        this.food = msg.data.food;
        this.lastSeen = new Date();
        this.emit('spawned', msg.data);
        this.emit('status_change', this.status);
        break;

      case 'health':
        this.health = msg.data.health;
        this.food = msg.data.food;
        this.saturation = msg.data.saturation;
        this.emit('health_update', msg.data);
        break;

      case 'position':
        this.position = msg.data;
        this.lastSeen = new Date();
        this.emit('position_update', msg.data);
        break;

      case 'inventory_update':
        this.emit('inventory_update', msg.data);
        break;

      case 'goal_reached':
        this.emit('goal_reached');
        break;

      case 'death':
        this.status = 'ERROR';
        this.emit('death');
        this.emit('status_change', this.status);
        break;

      case 'kicked':
        this.status = 'OFFLINE';
        this.emit('kicked', msg.data.reason);
        this.emit('status_change', this.status);
        break;

      case 'error':
        this.emit('bot_error', msg.data);
        break;

      case 'disconnected':
        this.status = 'OFFLINE';
        this.emit('disconnected', msg.data.reason);
        this.emit('status_change', this.status);
        break;

      case 'reconnecting':
        this.emit('reconnecting', msg.data);
        break;

      case 'reconnect_failed':
        this.status = 'ERROR';
        this.emit('reconnect_failed', msg.data);
        this.emit('status_change', this.status);
        break;

      case 'item_taken':
        this.emit('item_taken', msg.data);
        break;

      case 'item_take_error':
        this.emit('item_take_error', msg.data);
        break;
    }
  }

  sendCommand(command) {
    if (this.worker) {
      this.worker.postMessage({ type: 'command', data: { command } });
    }
  }

  navigate(x, y, z) {
    if (this.worker) {
      this.worker.postMessage({ type: 'navigate', data: { x, y, z } });
    }
  }

  takeItem(chestX, chestY, chestZ, itemName, count) {
    if (this.worker) {
      this.worker.postMessage({ type: 'take_item', data: { chestX, chestY, chestZ, itemName, count } });
    }
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
    }
    this.status = 'OFFLINE';
    this.emit('status_change', this.status);
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      status: this.status,
      position: this.position,
      health: this.health,
      food: this.food,
      saturation: this.saturation,
      lastSeen: this.lastSeen,
      serverConfig: {
        name: this.serverConfig.name,
        host: this.serverConfig.host,
        port: this.serverConfig.port,
      }
    };
  }
}

// ============================================================
// BotLifecycleManager Class
// ============================================================
export class BotLifecycleManager extends EventEmitter {
  constructor() {
    super();
    this.bots = new Map(); // botId -> BotInstance
  }

  async startBot(botData, serverConfig) {
    if (this.bots.has(botData.id)) {
      throw new Error(`Bot ${botData.id} is already running`);
    }

    const instance = new BotInstance(botData, serverConfig);
    
    instance.on('status_change', (status) => {
      this.emit('bot:status', { botId: botData.id, status });
    });

    instance.on('health_update', (data) => {
      this.emit('bot:health', { botId: botData.id, ...data });
    });

    instance.on('position_update', (data) => {
      this.emit('bot:position', { botId: botData.id, ...data });
    });

    instance.on('inventory_update', (data) => {
      this.emit('bot:inventory', { botId: botData.id, ...data });
    });

    instance.on('error', (err) => {
      this.emit('bot:error', { botId: botData.id, error: err.message });
    });

    instance.on('death', () => {
      this.emit('bot:death', { botId: botData.id });
    });

    instance.on('item_taken', (data) => {
      this.emit('bot:item_taken', { botId: botData.id, ...data });
    });

    this.bots.set(botData.id, instance);
    instance.start();
    
    return instance;
  }

  stopBot(botId) {
    const instance = this.bots.get(botId);
    if (instance) {
      instance.stop();
      this.bots.delete(botId);
    }
  }

  getBot(botId) {
    return this.bots.get(botId);
  }

  getAllBots() {
    return Array.from(this.bots.values());
  }

  getBotsByStatus(status) {
    return this.getAllBots().filter(bot => bot.status === status);
  }

  getBotsByUser(userId) {
    return this.getAllBots().filter(bot => bot.userId === userId);
  }

  getBotsBySwarm(swarmId) {
    return this.getAllBots().filter(bot => bot.currentSwarmId === swarmId);
  }

  stopAll() {
    for (const [id, instance] of this.bots) {
      instance.stop();
    }
    this.bots.clear();
  }
}

export const botLifecycleManager = new BotLifecycleManager();