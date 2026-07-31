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
let deliveryConfig = workerData.deliveryConfig || {
  DELIVERY_MODE: 'TPA',
  TARGET_COORD_MODE: 'USER',
  POST_DELIVERY_ACTION: 'FLY_HOME',
  STORAGE_KEYS: { ender: 'ender', chest: 'chest', elytra: 'elytra', rocket: 'rocket' },
  BASE_COORDINATES: { x: 0, y: 64, z: 0 },
  RANDOM_REGION_BOUNDS: { x1: -1000, z1: -1000, x2: 1000, z2: 1000 },
};
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

  function handleChatCommand(username, message, isWhisper = false) {
    if (!message || typeof message !== 'string') return;
    if (username === bot.username) return;
    const trimmed = message.trim();

    // Always whisper to bot check: if user speaks in public chat, gently remind to whisper
    if (!isWhisper && trimmed.startsWith('!')) {
      try { bot.chat(\`/w \${username} Please whisper commands directly to me for privacy: /w \${bot.username} <command>\`); } catch (_) {}
      return;
    }

    // Help Command
    if (trimmed === '!help' || trimmed === '!commands' || trimmed === '!h') {
      parentPort.postMessage({
        type: 'chat_command_help',
        data: { username }
      });
      return;
    }

    // Kits List Command
    if (trimmed === '!list' || trimmed === '!kits') {
      parentPort.postMessage({
        type: 'chat_command_list',
        data: { username }
      });
      return;
    }

    // Check Role / Whitelist Command
    if (trimmed === '!role' || trimmed === '!myrole') {
      parentPort.postMessage({
        type: 'chat_command_role',
        data: { username }
      });
      return;
    }

    // Whitelist Admin Management Commands (!wlist add/remove/list)
    const wlistMatch = trimmed.match(/^!wlist\s+(add|remove|list)(?:\\s+([^\\s]+))?(?:\\s+(admin|vip|user))?$/i);
    if (wlistMatch) {
      parentPort.postMessage({
        type: 'chat_command_wlist',
        data: {
          username,
          subcmd: wlistMatch[1].toLowerCase(),
          targetPlayer: wlistMatch[2],
          role: wlistMatch[3] || 'user'
        }
      });
      return;
    }

    // Mode Command (!mode)
    if (trimmed === '!mode' || trimmed === '!status') {
      parentPort.postMessage({
        type: 'chat_command_mode',
        data: { username }
      });
      return;
    }

    // Reset Cooldown Command (!resetcd <player> [kit])
    const resetcdMatch = trimmed.match(/^!resetcd\s+([^\s]+)(?:\s+([^\s]+))?$/i);
    if (resetcdMatch) {
      parentPort.postMessage({
        type: 'chat_command_resetcd',
        data: {
          username,
          targetPlayer: resetcdMatch[1],
          kitName: resetcdMatch[2] || null
        }
      });
      return;
    }

    // Kit Request Command
    const match = trimmed.match(/^(?:!kit|!deliver|!get|\\/trade|!trade)\\s+([^\\s]+)(?:\\s+(-?\\d+)\\s+(-?\\d+))?$/i);
    if (match) {
      const chestName = match[1].trim();
      let targetX, targetZ;
      if (match[2] && match[3]) {
        targetX = parseInt(match[2], 10);
        targetZ = parseInt(match[3], 10);
      }
      parentPort.postMessage({
        type: 'trade_request',
        data: {
          chestName,
          playerName: username,
          targetX,
          targetZ,
          hasExplicitCoords: targetX !== undefined && targetZ !== undefined,
        }
      });
    }
  }

  bot.on('chat', (username, message) => handleChatCommand(username, message, false));
  bot.on('whisper', (username, message) => handleChatCommand(username, message, true));

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
    const { chestX, chestY, chestZ, itemName, count, playerName, targetX, targetZ, hasExplicitCoords } = msg.data;
    handleTakeItem(bot, chestX, chestY, chestZ, itemName, count, playerName, { targetX, targetZ, hasExplicitCoords });
  }

  if (msg.type === 'scan' && bot) {
    const { radius, scanMarkedOnly } = msg.data;
    handleScan(bot, radius, scanMarkedOnly);
  }

  if (msg.type === 'scan_abort') {
    scanAbort = true;
  }

  if (msg.type === 'delivery_config_update') {
    deliveryConfig = { ...deliveryConfig, ...msg.data };
  }

  if (msg.type === 'stop') {
    if (bot) {
      bot.quit('Stopped by operator');
    }
    process.exit(0);
  }
});

async function openChestSafely(bot, block) {
  if (!block) return null;
  try {
    if (bot.pathfinder) {
      bot.pathfinder.stop();
    }
    if (typeof bot.unequip === 'function') {
      try { await bot.unequip('hand'); } catch (_) {}
    }
    if (typeof bot.setControlState === 'function') {
      bot.setControlState('sneak', false);
    }
    const distance = bot.entity && bot.entity.position ? bot.entity.position.distanceTo(block.position) : 0;
    if (distance > 2.5 && bot.pathfinder) {
      const goal = (typeof goals.GoalGetToBlock === 'function')
        ? new goals.GoalGetToBlock(block.position.x, block.position.y, block.position.z)
        : new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2.0);

      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          bot.removeListener('goal_reached', finish);
          bot.removeListener('path_stop', finish);
          resolve();
        };

        const timer = setTimeout(() => {
          if (bot.pathfinder) bot.pathfinder.stop();
          finish();
        }, 10000);

        bot.once('goal_reached', finish);
        bot.once('path_stop', finish);
        bot.pathfinder.setGoal(goal);
      });
      bot.pathfinder.stop();
    }
    if (typeof bot.lookAt === 'function' && block.position && typeof block.position.offset === 'function') {
      await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));
    }
    if (typeof bot.waitForTicks === 'function') {
      await bot.waitForTicks(3);
    } else {
      await new Promise(r => setTimeout(r, 150));
    }

    if (bot.currentWindow) {
      try { bot.close(bot.currentWindow); } catch (_) {}
    }

    const container = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (bot.currentWindow) {
          try { bot.close(bot.currentWindow); } catch (_) {}
        }
        reject(new Error('Container open timeout (server did not send windowOpen)'));
      }, 5000);

      bot.openContainer(block).then((c) => {
        clearTimeout(timer);
        resolve(c);
      }).catch((err) => {
        clearTimeout(timer);
        if (bot.currentWindow) {
          try { bot.close(bot.currentWindow); } catch (_) {}
        }
        reject(err);
      });
    });

    return container;
  } catch (err) {
    console.error('Failed to open chest safely:', err.message);
    return null;
  }
}

async function handleTakeItem(bot, x, y, z, itemName, count, playerName, options = {}) {
  try {
    const { DeliveryEngine } = await import('./backend/src/services/deliveryEngine.js');
    const deliveryEngine = new DeliveryEngine(deliveryConfig, { skipDbLoad: true });

    if (deliveryConfig.DELIVERY_MODE === 'ELYTRA') {
      let targetCoords;
      try {
        const initialTarget = {
          x: options.targetX !== undefined ? options.targetX : x,
          y: 70,
          z: options.targetZ !== undefined ? options.targetZ : z,
          hasExplicitCoords: !!options.hasExplicitCoords,
        };
        targetCoords = await deliveryEngine.resolveTargetCoordinates(initialTarget, bot, playerName);
      } catch (err) {
        parentPort.postMessage({ type: 'item_take_error', data: { error: err.message } });
        return;
      }

      if (playerName) {
        bot.chat('/w ' + playerName + ' Initiating Elytra kit delivery for "' + itemName + '" to (' + targetCoords.x + ', ' + targetCoords.z + ')...');
      }

      const fakeChestService = { get: () => ({ x, y, z, item: itemName }) };
      const preFlight = await deliveryEngine.runPreFlightChecklist(bot, fakeChestService, [itemName], targetCoords);
      if (!preFlight.ok) {
        if (playerName) bot.chat('/w ' + playerName + ' Pre-flight check failed: ' + preFlight.reason);
        throw new Error('Pre-flight check failed: ' + preFlight.reason);
      }

      await deliveryEngine.prepareBaseAndPurify(bot, fakeChestService, [itemName], targetCoords);
      await deliveryEngine.executeFlightAndDelivery(bot, targetCoords, [itemName]);
      await deliveryEngine.executePostDeliveryRoutine(bot);

      parentPort.postMessage({
        type: 'item_taken',
        data: { itemName, count: count || 1, playerName, success: true }
      });
      return;
    }

    const chestPos = new (require('vec3').Vec3)(x, y, z);
    await pathTo(bot, chestPos, 1);

    const chestBlock = bot.blockAt(chestPos);
    if (!chestBlock) throw new Error('Chest block not found at (' + x + ',' + y + ',' + z + ')');
    const chest = await openChestSafely(bot, chestBlock);
    if (!chest) throw new Error('Failed to open chest container at (' + x + ',' + y + ',' + z + ')');

    const itemKey = (itemName || '').toLowerCase().replace(/ /g, '_');
    const itemDef = (bot.registry && bot.registry.itemsByName[itemKey]) ||
                    (bot.registry && bot.registry.itemsByName[itemName]);
    const itemId = itemDef ? itemDef.id : (chest.containerItems && chest.containerItems()[0] ? chest.containerItems()[0].type : null);

    if (itemId == null) {
      chest.close();
      throw new Error('Item ' + itemName + ' not found in registry or chest');
    }

    await chest.withdraw(itemId, null, count || 1);
    chest.close();

    if (playerName) {
      bot.chat('/w ' + playerName + ' Took ' + (count || 1) + ' ' + itemName + ' from chest.');
      bot.chat('/tpa ' + playerName);
    }

    parentPort.postMessage({
      type: 'item_taken',
      data: { itemName, count: count || 1, playerName, success: true }
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
      await new Promise(r => setTimeout(r, 200));
    }
    
    parentPort.postMessage({ type: 'scan_complete', data: { found: results.length, chests: results } });
  } catch (err) {
    parentPort.postMessage({ type: 'scan_error', data: { error: err.message } });
  } finally {
    scanning = false;
  }
}

function findChestBlocks(bot, radius) {
  const botPos = bot.entity ? bot.entity.position : null;
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
  
  if (botPos && typeof botPos.distanceTo === 'function') {
    blocks.sort((a, b) => botPos.distanceTo(a.position) - botPos.distanceTo(b.position));
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

async function pathTo(bot, pos, range = 2.0, timeoutMs = 25000) {
  if (!bot || !bot.pathfinder) {
    throw new Error('Bot pathfinder is not initialized');
  }

  const targetVec = { x: Number(pos.x), y: Number(pos.y), z: Number(pos.z) };

  if (bot.entity && bot.entity.position) {
    const currentDist = bot.entity.position.distanceTo(targetVec);
    if (currentDist <= Math.max(range, 2.0) + 0.3) {
      if (bot.pathfinder.isMoving()) {
        bot.pathfinder.stop();
      }
      return;
    }
  }

  if (bot.pathfinder.movements) {
    bot.pathfinder.movements.canDig = false;
    bot.pathfinder.movements.scafoldingBlocks = [];
    bot.pathfinder.movements.allowSprinting = false;
    bot.pathfinder.movements.allowFreeMotion = true;
    bot.pathfinder.movements.allowParkour = true;
  }

  const attemptPathing = (goal, timeoutMs) => {
    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (bot) {
          bot.removeListener('goal_reached', onGoalReached);
          bot.removeListener('path_stop', onPathStop);
          bot.removeListener('path_reset', onPathReset);
        }
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      const onGoalReached = () => finish();

      const onPathStop = () => {
        if (bot.entity && bot.entity.position && bot.entity.position.distanceTo(targetVec) <= Math.max(range, 2.0) + 0.5) {
          finish();
        } else {
          finish(new Error('Pathfinding stopped before reaching goal'));
        }
      };

      const onPathReset = (reason) => {
        if (reason === 'goal_updated' || reason === 'did_not_converge') {
          finish(new Error('Pathfinding reset: ' + reason));
        }
      };

      const timer = setTimeout(() => {
        if (bot && bot.pathfinder) {
          bot.pathfinder.stop();
        }
        finish(new Error('Pathfinding timeout after ' + timeoutMs + 'ms'));
      }, timeoutMs);

      bot.once('goal_reached', onGoalReached);
      bot.once('path_stop', onPathStop);
      bot.once('path_reset', onPathReset);

      bot.pathfinder.setGoal(goal);
    });
  };

  const primaryGoal = (typeof goals.GoalGetToBlock === 'function')
    ? new goals.GoalGetToBlock(targetVec.x, targetVec.y, targetVec.z)
    : new goals.GoalNear(targetVec.x, targetVec.y, targetVec.z, range);

  try {
    await attemptPathing(primaryGoal, Math.floor(timeoutMs * 0.6));
    return;
  } catch (primaryErr) {
    if (bot.entity && bot.entity.position && bot.entity.position.distanceTo(targetVec) <= Math.max(range, 2.0) + 0.5) {
      if (bot.pathfinder.isMoving()) bot.pathfinder.stop();
      return;
    }

    const fallbackGoal = new goals.GoalNear(targetVec.x, targetVec.y, targetVec.z, Math.max(range, 2.5));
    try {
      await attemptPathing(fallbackGoal, Math.floor(timeoutMs * 0.4));
      return;
    } catch (_) {
      if (bot.entity && bot.entity.position && bot.entity.position.distanceTo(targetVec) <= 3.0) {
        if (bot.pathfinder.isMoving()) bot.pathfinder.stop();
        return;
      }
      throw new Error('Could not pathfind to (' + targetVec.x + ',' + targetVec.y + ',' + targetVec.z + '): ' + primaryErr.message);
    }
  }
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
  
  const container = await openChestSafely(bot, block);
  if (!container) return null;
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

      case 'chat_command_help':
        this.emit('chat_command_help', msg.data);
        break;

      case 'chat_command_role':
        this.emit('chat_command_role', msg.data);
        break;

      case 'chat_command_wlist':
        this.emit('chat_command_wlist', msg.data);
        break;

      case 'chat_command_mode':
        this.emit('chat_command_mode', msg.data);
        break;

      case 'chat_command_resetcd':
        this.emit('chat_command_resetcd', msg.data);
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

  takeItem(chestX, chestY, chestZ, itemName, count, playerName, options = {}) {
    if (this.worker) {
      this.worker.postMessage({ type: 'take_item', data: { chestX, chestY, chestZ, itemName, count, playerName, ...options } });
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