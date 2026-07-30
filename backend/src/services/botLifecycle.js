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
let scanning = false;
let scanAbort = false;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

function createBot(config) {
  const mlConfig = {
    host: config.host,
    port: config.port,
    username: config.username,
    auth: config.authType || 'offline',
  };
  if (config.version && config.version !== 'auto') {
    mlConfig.version = config.version;
  }
  if (config.password) {
    mlConfig.password = config.password;
  }
  bot = mineflayer.createBot(mlConfig);

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

  bot.on('messagestr', (message) => {
    const tradeMatch = message.match(/(?:\\[trade\\]|\\/trade)\\s+(.+)/i);
    if (tradeMatch) {
      parentPort.postMessage({
        type: 'trade_request',
        data: { itemName: tradeMatch[1].trim() }
      });
    }
  });

  function handleChatCommand(username, message) {
    if (!message || typeof message !== 'string') return;
    if (username === bot.username) return;
    const trimmed = message.trim();

    if (trimmed === '!list' || trimmed === '!kits') {
      parentPort.postMessage({
        type: 'chat_command_list',
        data: { username }
      });
      return;
    }

    const match = trimmed.match(/^(?:!kit|!deliver|!get|\\/trade|!trade)\\s+(.+)$/i);
    if (match) {
      const chestName = match[1].trim();
      parentPort.postMessage({
        type: 'trade_request',
        data: { chestName, playerName: username }
      });
    }
  }

  bot.on('chat', (username, message) => handleChatCommand(username, message));
  bot.on('whisper', (username, message) => handleChatCommand(username, message));

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
    const { chestX, chestY, chestZ, itemName, count, playerName } = msg.data;
    handleTakeItem(bot, chestX, chestY, chestZ, itemName, count, playerName);
  }

  if (msg.type === 'scan' && bot) {
    const { radius, scanMarkedOnly } = msg.data;
    handleScan(bot, radius, scanMarkedOnly);
  }

  if (msg.type === 'scan_abort') {
    scanAbort = true;
  }

  if (msg.type === 'stop') {
    if (bot) {
      bot.quit('Stopped by operator');
    }
    process.exit(0);
  }
});

async function handleTakeItem(bot, x, y, z, itemName, count, playerName) {
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
    if (!chestBlock) throw new Error('Block at ' + x + ',' + y + ',' + z + ' not found');
    
    // Ensure bot is looking directly at the target chest block before interacting
    try {
      await bot.lookAt(chestPos.offset(0.5, 0.5, 0.5));
    } catch (_) { /* ignore lookAt error */ }

    // Open container with error handling for obstructed or unopenable blocks
    let chest;
    try {
      chest = await bot.openContainer(chestBlock);
    } catch (openErr) {
      const blockAbove = bot.blockAt(chestPos.offset(0, 1, 0));
      if (blockAbove && blockAbove.boundingBox === 'block') {
        throw new Error('Chest at ' + x + ',' + y + ',' + z + ' is obstructed by block above (' + blockAbove.name + ')');
      }
      throw new Error('Could not open chest (' + chestBlock.name + '): ' + openErr.message);
    }
    
    // Find matching item by name or fallback to first non-empty slot
    let item = chest.slots.find(s => s && s.name && (s.name.toLowerCase() === (itemName || '').toLowerCase() || s.name.toLowerCase().includes((itemName || '').toLowerCase())));
    if (!item) {
      item = chest.slots.find(s => s !== null);
    }

    if (!item) {
      chest.close();
      throw new Error('Chest at ' + x + ',' + y + ',' + z + ' is empty');
    }

    const actualItemName = item.name || itemName || 'item';
    await chest.withdraw(item.type, null, count || 1);
    chest.close();
    
    if (playerName) {
      bot.chat('/w ' + playerName + ' Here is ' + (count || 1) + ' ' + actualItemName + '!');
      bot.chat('/tpa ' + playerName);
    }
    
    parentPort.postMessage({
      type: 'item_taken',
      data: { itemName: actualItemName, count: count || 1, playerName: playerName, success: true }
    });
  } catch (err) {
    parentPort.postMessage({
      type: 'item_take_error',
      data: { error: err.message }
    });
  }
}

async function handleScan(bot, radius, scanMarkedOnly) {
  if (scanning) {
    parentPort.postMessage({ type: 'scan_error', data: { error: 'Scan already in progress' } });
    return;
  }
  
  scanning = true;
  scanAbort = false;
  
  try {
    parentPort.postMessage({ type: 'scan_progress', data: { phase: 'discovery', percent: 0 } });
    
    const allBlocks = findChestBlocks(bot, radius);
    const chestBlocks = deduplicateChests(allBlocks);
    const total = chestBlocks.length;
    
    parentPort.postMessage({ type: 'scan_progress', data: { phase: 'scanning', percent: 0, found: total } });
    parentPort.postMessage({ type: 'scan_log', data: { message: 'Found ' + allBlocks.length + ' chest blocks, ' + total + ' unique chests (' + chestBlocks.filter(c => c.isDouble).length + ' double)' } });
    
    const results = [];
    
    for (let i = 0; i < total; i++) {
      if (scanAbort) break;
      
      const blockInfo = chestBlocks[i];
      try {
        const chestData = await scanSingleChest(bot, blockInfo, scanMarkedOnly);
        if (chestData) {
          results.push(chestData);
          parentPort.postMessage({ type: 'scan_log', data: { message: 'Scanned chest at ' + blockInfo.block.position.x + ',' + blockInfo.block.position.y + ',' + blockInfo.block.position.z + ' name=' + chestData.name + ' double=' + chestData.isDouble } });
        }
      } catch (err) {
        parentPort.postMessage({ type: 'scan_chest_error', data: { x: blockInfo.block.position.x, y: blockInfo.block.position.y, z: blockInfo.block.position.z, error: err.message } });
        parentPort.postMessage({ type: 'scan_log', data: { message: 'Error scanning chest at ' + blockInfo.block.position.x + ',' + blockInfo.block.position.y + ',' + blockInfo.block.position.z + ': ' + err.message } });
      }
      
      const percent = Math.round(((i + 1) / total) * 100);
      parentPort.postMessage({ type: 'scan_progress', data: { phase: 'scanning', percent, current: i + 1, total } });
    }
    
    parentPort.postMessage({ type: 'scan_complete', data: { found: results.length, chests: results } });
  } catch (err) {
    parentPort.postMessage({ type: 'scan_error', data: { error: err.message } });
  } finally {
    scanning = false;
  }
}

function findChestBlocks(bot, radius) {
  const botPos = bot.entity.position;
  const blocks = [];
  
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const pos = bot.entity.position.offset(x, y, z);
        const block = bot.blockAt(pos);
        if (block && (block.name === 'chest' || block.name === 'trapped_chest')) {
          blocks.push(block);
        }
      }
    }
  }
  
  return blocks;
}

function deduplicateChests(chestBlocks) {
  const seen = new Set();
  const unique = [];
  
  for (const block of chestBlocks) {
    const key = block.position.x + ',' + block.position.y + ',' + block.position.z;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(block);
    }
  }
  
  const merged = [];
  const usedDouble = new Set();
  
  for (const block of unique) {
    const key = block.position.x + ',' + block.position.y + ',' + block.position.z;
    if (usedDouble.has(key)) continue;
    
    const pos = block.position;
    const neighbors = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 },
    ];
    
    let isDouble = false;
    for (const n of neighbors) {
      const nPos = pos.offset(n.dx, n.dy, n.dz);
      const nBlock = unique.find(b => 
        b.position.x === nPos.x && 
        b.position.y === nPos.y && 
        b.position.z === nPos.z &&
        !usedDouble.has(b.position.x + ',' + b.position.y + ',' + b.position.z)
      );
      if (nBlock) {
        const nKey = nPos.x + ',' + nPos.y + ',' + nPos.z;
        usedDouble.add(nKey);
        isDouble = true;
        break;
      }
    }
    
    merged.push({ block, isDouble });
  }
  
  return merged;
}

function findAttachedSign(bot, chestBlock) {
  const pos = chestBlock.position;
  const faces = [
    { dx: 0, dy: 0, dz: -1, name: 'north' },
    { dx: 0, dy: 0, dz: 1, name: 'south' },
    { dx: -1, dy: 0, dz: 0, name: 'west' },
    { dx: 1, dy: 0, dz: 0, name: 'east' },
    { dx: 0, dy: 1, dz: 0, name: 'above' },
    { dx: 0, dy: -1, dz: 0, name: 'below' },
    { dx: -1, dy: 0, dz: -1, name: 'northwest' },
    { dx: 1, dy: 0, dz: -1, name: 'northeast' },
    { dx: -1, dy: 0, dz: 1, name: 'southwest' },
    { dx: 1, dy: 0, dz: 1, name: 'southeast' },
    { dx: 0, dy: 1, dz: -1, name: 'above_north' },
    { dx: 0, dy: 1, dz: 1, name: 'above_south' },
    { dx: -1, dy: 1, dz: 0, name: 'above_west' },
    { dx: 1, dy: 1, dz: 0, name: 'above_east' },
  ];
  
  for (const face of faces) {
    const signPos = pos.offset(face.dx, face.dy, face.dz);
    const block = bot.blockAt(signPos);
    if (block && (block.name.includes('sign') || block.name.endsWith('_wall_sign'))) {
      return block;
    }
  }
  
  return null;
}

function readSignLines(signBlock) {
  const entity = signBlock?.entity;
  if (!entity) {
    return [];
  }
  
  if (entity.value && typeof entity.value === 'object') {
    const val = entity.value;
    const lines = [];
    for (let i = 1; i <= 4; i++) {
      const key = 'Text' + i;
      const raw = val[key];
      if (!raw) {
        lines.push('');
        continue;
      }
      let text = '';
      if (typeof raw === 'string') {
        text = raw;
      } else if (typeof raw === 'object') {
        text = raw.value || raw.text || '';
      }
      text = text.replace(/^"|"$/g, '').trim();
      lines.push(text);
    }
    return lines;
  }
  
  const lines = [];
  for (let i = 1; i <= 4; i++) {
    const raw = entity['Text' + i] || entity['text' + i] || '';
    let text = '';
    if (typeof raw === 'string') {
      text = raw;
    } else if (typeof raw === 'object' && raw !== null) {
      text = raw.value || raw.text || '';
    }
    text = text.replace(/^"|"$/g, '').trim();
    lines.push(text);
  }
  
  return lines;
}

function parseSignData(lines) {
  const data = {};
  for (const line of lines) {
    const cleaned = line.replace(/["{}]/g, '').trim();
    const parts = cleaned.split('#').filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^(.+?):(.+)$/);
      if (match) {
        data[match[1].trim().toLowerCase()] = match[2].trim();
      }
    }
  }
  return data;
}

function readContainerContents(bot, container) {
  const items = container.slots
    .filter(slot => slot !== null)
    .map(slot => ({
      name: bot.registry.items[slot.type]?.name || 'unknown',
      count: slot.count,
      slot: slot.slot,
    }));
  
  return { items, totalSlots: container.slots.length };
}

async function pathTo(bot, pos) {
  return new Promise((resolve, reject) => {
    bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 1));
    
    const onGoalReached = () => {
      clearTimeout(timeout);
      bot.removeListener('goal_reached', onGoalReached);
      resolve();
    };
    
    const timeout = setTimeout(() => {
      bot.removeListener('goal_reached', onGoalReached);
      reject(new Error('Pathfinding timeout'));
    }, 60000);
    
    bot.once('goal_reached', onGoalReached);
  });
}

async function scanSingleChest(bot, blockInfo, scanMarkedOnly) {
  const { block, isDouble } = blockInfo;
  const pos = block.position;
  
  await pathTo(bot, pos);
  
  let signData = null;
  let chestName = null;
  
  const signBlock = findAttachedSign(bot, block);
  if (signBlock) {
    const lines = readSignLines(signBlock);
    parentPort.postMessage({ type: 'scan_log', data: { message: 'Sign at ' + block.position.x + ',' + block.position.y + ',' + block.position.z + ' lines: ' + JSON.stringify(lines) } });
    signData = parseSignData(lines);
    chestName = signData.name || null;
    
    if (scanMarkedOnly && !chestName) {
      return null;
    }
  }
  
  const container = await bot.openContainer(block);
  const contents = readContainerContents(bot, container);
  container.close();
  
  if (!chestName) {
    const primaryItem = contents.items[0]?.name;
    if (primaryItem) {
      chestName = 'unnamed:' + primaryItem;
    } else {
      chestName = 'empty:' + pos.x + ',' + pos.y + ',' + pos.z;
    }
  }
  
  return {
    name: chestName,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    isDouble: isDouble,
    item: contents.items[0]?.name || 'unknown',
    itemCount: contents.items[0]?.count || 0,
    allItems: contents.items,
    source: signData ? 'sign' : 'scan',
    signData,
    status: 'active',
    lastScanned: Date.now(),
  };
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
    this.scanning = false;
    this.scanProgress = null;
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
    this.worker.on('error', (err) => {
      console.error('[BotLifecycle] Worker error for', this.name, ':', err.message);
      this.status = 'ERROR';
      this.emit('error', err);
      this.emit('status_change', this.status);
    });
    this.worker.on('exit', (code) => {
      console.log('[BotLifecycle] Worker exited for', this.name, 'code:', code);
      if (this.status !== 'OFFLINE') {
        this.status = 'OFFLINE';
        this.emit('status_change', this.status);
      }
      this.emit('exit', code);
    });

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

      case 'scan_progress':
        this.scanProgress = msg.data;
        this.emit('scan_progress', msg.data);
        break;

      case 'scan_complete':
        this.scanning = false;
        this.scanProgress = null;
        this.emit('scan_complete', msg.data);
        break;

      case 'scan_error':
        this.scanning = false;
        this.scanProgress = null;
        this.emit('scan_error', msg.data);
        break;

      case 'scan_chest_error':
        this.emit('scan_chest_error', msg.data);
        break;

      case 'trade_request':
        this.emit('trade_request', msg.data);
        break;

      case 'scan_log':
        console.log('[Scan Worker]', msg.data.message);
        this.emit('scan_log', msg.data);
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

  takeItem(chestX, chestY, chestZ, itemName, count, playerName) {
    if (this.worker) {
      this.worker.postMessage({ type: 'take_item', data: { chestX, chestY, chestZ, itemName, count, playerName } });
    }
  }

  startScan(radius, scanMarkedOnly) {
    if (this.worker && !this.scanning) {
      this.scanning = true;
      this.scanProgress = { phase: 'starting', percent: 0 };
      this.worker.postMessage({ type: 'scan', data: { radius, scanMarkedOnly } });
    }
  }

  abortScan() {
    if (this.worker && this.scanning) {
      this.worker.postMessage({ type: 'scan_abort' });
      this.scanning = false;
      this.scanProgress = null;
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
      const existing = this.bots.get(botData.id);
      if (existing.status !== 'OFFLINE' && existing.status !== 'ERROR') {
        throw new Error(`Bot ${botData.id} is already running`);
      }
      existing.stop();
      this.bots.delete(botData.id);
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