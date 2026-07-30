import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { botLifecycleManager } from '../services/botLifecycle.js';
import { swarmCoordinator } from '../services/swarmCoordinator.js';
import { TradingService } from '../services/tradingService.js';
import mc from 'minecraft-protocol';

export const fleetRoutes = new Hono();

// Wire up trade request handling for all bots
const tradingService = new TradingService(botLifecycleManager);

function wireBotEvents(bot) {
  if (bot._eventsWired) return;
  bot._eventsWired = true;

  bot.on('trade_request', async (tradeData) => {
    console.log('[Trade] Bot ' + bot.name + ' received trade request for: ' + tradeData.itemName);
    try {
      await tradingService.fulfillOrder(bot.id, 'player', tradeData.itemName);
    } catch (err) {
      console.error('[Trade] Error fulfilling order:', err.message);
    }
  });

  bot.on('scan_complete', async (scanData) => {
    console.log('[Scan] Bot ' + bot.name + ' completed scan, found ' + scanData.found + ' chests');
    try {
      for (const chest of scanData.chests) {
        await db.insert(schema.chestLocations).values({
          id: randomUUID(),
          userId: bot.userId,
          serverId: bot.serverConfig?.id || null,
          name: chest.name,
          x: chest.x,
          y: chest.y,
          z: chest.z,
          itemName: chest.item,
          itemCount: chest.itemCount,
          allItems: JSON.stringify(chest.allItems),
          source: chest.source,
          signData: chest.signData ? JSON.stringify(chest.signData) : null,
            status: chest.status,
            isDouble: chest.isDouble || false,
            lastScanned: new Date(chest.lastScanned),
          botId: bot.id,
            createdAt: new Date(),
        });
      }
      console.log('[Scan] Saved ' + scanData.chests.length + ' chests to database');
    } catch (err) {
      console.error('[Scan] Error saving chests:', err.message);
    }
  });

  bot.on('scan_error', (err) => {
    console.error('[Scan] Bot ' + bot.name + ' scan error:', err.error);
  });
}

botLifecycleManager.on('bot:spawned', (data) => {
  const bot = botLifecycleManager.getBot(data.botId);
  if (bot) wireBotEvents(bot);
});

// Wire up any already-running bots
for (const [id, bot] of botLifecycleManager.bots) {
  wireBotEvents(bot);
}

// ============================================================
// Server Management
// ============================================================
fleetRoutes.get('/servers', requireAuth, async (c) => {
  const user = c.get('session');
  const servers = await db.select()
    .from(schema.servers)
    .where(eq(schema.servers.userId, user.id));
  return c.json(servers);
});

fleetRoutes.post('/servers', requireAuth, async (c) => {
  const user = c.get('session');
  const body = await c.req.json();
  
  const serverId = randomUUID();
  await db.insert(schema.servers).values({
    id: serverId,
    userId: user.id,
    name: body.name,
    host: body.host,
    port: body.port || 25565,
    version: body.version || '1.17',
    authType: body.authType || 'offline',
    spawnX: body.spawnX,
    spawnY: body.spawnY,
    spawnZ: body.spawnZ,
    pathfindingTimeout: body.pathfindingTimeout || 5000,
    createdAt: new Date(),
  });

  return c.json({ id: serverId, success: true });
});

fleetRoutes.put('/servers/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const serverId = c.req.param('id');
  const body = await c.req.json();
  
  await db.update(schema.servers)
    .set(body)
    .where(and(
      eq(schema.servers.id, serverId),
      eq(schema.servers.userId, user.id)
    ));

  return c.json({ success: true });
});

fleetRoutes.delete('/servers/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const serverId = c.req.param('id');
  
  await db.delete(schema.servers)
    .where(and(
      eq(schema.servers.id, serverId),
      eq(schema.servers.userId, user.id)
    ));

  return c.json({ success: true });
});

// ============================================================
// Bot Management
// ============================================================
fleetRoutes.get('/bots', requireAuth, async (c) => {
  const user = c.get('session');
  const bots = await db.select()
    .from(schema.bots)
    .where(eq(schema.bots.userId, user.id));
  
  // Enrich with live status
  const enrichedBots = bots.map(bot => {
    const instance = botLifecycleManager.getBot(bot.id);
    return {
      ...bot,
      liveStatus: instance ? instance.getStatus() : null,
    };
  });
  
  return c.json(enrichedBots);
});

fleetRoutes.post('/bots', requireAuth, async (c) => {
  const user = c.get('session');
  const body = await c.req.json();
  
  const botId = randomUUID();
  await db.insert(schema.bots).values({
    id: botId,
    userId: user.id,
    serverId: body.serverId,
    swarmId: body.swarmId,
    name: body.name,
    username: body.username,
    passwordEncrypted: body.password,
    serverHost: body.serverHost,
    serverPort: body.serverPort || 25565,
    serverVersion: body.serverVersion || 'auto',
    authMode: body.authMode || 'ONLINE',
    authPassword: body.authPassword,
    status: 'OFFLINE',
    createdAt: new Date(),
  });

  return c.json({ id: botId, success: true });
});

fleetRoutes.post('/bots/:id/start', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  
  // Get bot from database
  const bots = await db.select()
    .from(schema.bots)
    .where(and(
      eq(schema.bots.id, botId),
      eq(schema.bots.userId, user.id)
    ));
  
  if (bots.length === 0) {
    return c.json({ error: 'Bot not found' }, 404);
  }

  const bot = bots[0];
  
  // Get server config - either from assigned server or direct fields
  let serverConfig;
  
  if (bot.serverId) {
    // Legacy: use assigned server
    const servers = await db.select()
      .from(schema.servers)
      .where(eq(schema.servers.id, bot.serverId));
    
    if (servers.length === 0) {
      return c.json({ error: 'Server not found' }, 404);
    }
    const server = servers[0];
    serverConfig = {
      name: server.name,
      host: server.host,
      port: server.port,
      version: server.version,
      authType: server.authType,
      authMode: bot.authMode,
      authPassword: bot.authPassword,
      passwordEncrypted: bot.passwordEncrypted,
    };
  } else if (bot.serverHost) {
    // New: use direct server fields
    serverConfig = {
      name: bot.name + ' Server',
      host: bot.serverHost,
      port: bot.serverPort || 25565,
      version: bot.serverVersion || 'auto',
      authType: bot.authMode === 'OFFLINE' ? 'offline' : 'microsoft',
      authMode: bot.authMode,
      authPassword: bot.authPassword,
      passwordEncrypted: bot.passwordEncrypted,
    };
  } else {
    return c.json({ error: 'Bot has no server configured. Set server host directly or assign a server.' }, 400);
  }
  
  // Start the bot
  try {
    // Auto-detect server version if set to 'auto'
    let detectedVersion = serverConfig.version;
    if (!detectedVersion || detectedVersion === 'auto') {
      try {
        detectedVersion = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Version detection timeout')), 10000);
          const client = mc.createClient({
            host: serverConfig.host,
            port: serverConfig.port,
            username: 'VersionCheck',
          });
          client.on('login', () => {
            clearTimeout(timeout);
            const v = client.version;
            client.end();
            resolve(v);
          });
          client.on('error', (e) => { clearTimeout(timeout); reject(e); });
        });
      } catch (e) {
        detectedVersion = '1.20.4';
      }
      // Save detected version back to DB
      await db.update(schema.bots)
        .set({ serverVersion: detectedVersion })
        .where(eq(schema.bots.id, botId));
    }

    const instance = await botLifecycleManager.startBot({
      id: bot.id,
      userId: bot.userId,
      name: bot.name,
      username: bot.username,
    }, {
      ...serverConfig,
      version: detectedVersion,
      passwordEncrypted: bot.passwordEncrypted,
      authMode: bot.authMode,
      authPassword: bot.authPassword,
    });

    // Update bot status in database
    await db.update(schema.bots)
      .set({ status: 'IDLE', lastSeen: new Date() })
      .where(eq(schema.bots.id, botId));

    return c.json({ success: true, status: 'IDLE' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

fleetRoutes.post('/bots/:id/stop', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  
  botLifecycleManager.stopBot(botId);
  
  await db.update(schema.bots)
    .set({ status: 'OFFLINE' })
    .where(and(
      eq(schema.bots.id, botId),
      eq(schema.bots.userId, user.id)
    ));

  return c.json({ success: true });
});

fleetRoutes.post('/bots/:id/command', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  const body = await c.req.json();
  
  const instance = botLifecycleManager.getBot(botId);
  if (!instance) {
    return c.json({ error: 'Bot not running' }, 400);
  }

  instance.sendCommand(body.command);
  return c.json({ success: true });
});

fleetRoutes.delete('/bots/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  
  // Stop bot if running
  botLifecycleManager.stopBot(botId);
  
  // Delete from database
  await db.delete(schema.bots)
    .where(and(
      eq(schema.bots.id, botId),
      eq(schema.bots.userId, user.id)
    ));

  return c.json({ success: true });
});

// ============================================================
// Swarm Management
// ============================================================
fleetRoutes.get('/swarms', requireAuth, async (c) => {
  const user = c.get('session');
  const swarms = await swarmCoordinator.getUserSwarms(user.id);
  
  // Enrich with stats
  const enrichedSwarms = await Promise.all(
    swarms.map(async (swarm) => {
      const stats = await swarmCoordinator.getSwarmStats(swarm.id);
      return { ...swarm, stats };
    })
  );
  
  return c.json(enrichedSwarms);
});

fleetRoutes.post('/swarms', requireAuth, async (c) => {
  const user = c.get('session');
  const body = await c.req.json();
  
  const swarm = await swarmCoordinator.createSwarm(
    user.id,
    body.name,
    body.description,
    body.loadBalancing,
    body.maxConcurrent
  );

  return c.json(swarm);
});

fleetRoutes.put('/swarms/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  const body = await c.req.json();
  
  await swarmCoordinator.updateSwarm(swarmId, body);
  return c.json({ success: true });
});

fleetRoutes.delete('/swarms/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  
  await swarmCoordinator.deleteSwarm(swarmId);
  return c.json({ success: true });
});

fleetRoutes.post('/swarms/:id/bots', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  const body = await c.req.json();
  
  await swarmCoordinator.addBotToSwarm(body.botId, swarmId);
  return c.json({ success: true });
});

fleetRoutes.delete('/swarms/:id/bots/:botId', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('botId');
  
  await swarmCoordinator.removeBotFromSwarm(botId);
  return c.json({ success: true });
});

fleetRoutes.get('/swarms/:id/bots', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  
  const bots = await swarmCoordinator.getSwarmBots(swarmId);
  return c.json(bots);
});

// ============================================================
// Task Queue Management
// ============================================================
fleetRoutes.get('/swarms/:id/tasks', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  const status = c.req.query('status');
  
  const tasks = await swarmCoordinator.getSwarmTasks(swarmId, status);
  return c.json(tasks);
});

fleetRoutes.post('/swarms/:id/tasks', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  const body = await c.req.json();
  
  const task = await swarmCoordinator.createTask(swarmId, user.id, body);
  return c.json(task);
});

fleetRoutes.delete('/tasks/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const taskId = c.req.param('id');
  
  await swarmCoordinator.cancelTask(taskId);
  return c.json({ success: true });
});

fleetRoutes.get('/swarms/:id/stats', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  
  const stats = await swarmCoordinator.getSwarmStats(swarmId);
  return c.json(stats);
});

// ============================================================
// Swarm Memory
// ============================================================
fleetRoutes.get('/swarms/:id/memory', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  
  const memory = await swarmCoordinator.getAllSwarmMemory(swarmId);
  return c.json(memory);
});

fleetRoutes.post('/swarms/:id/memory', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  const body = await c.req.json();
  
  await swarmCoordinator.setSwarmMemory(swarmId, body.key, body.value, body.expiresAt);
  return c.json({ success: true });
});

fleetRoutes.delete('/swarms/:id/memory/:key', requireAuth, async (c) => {
  const user = c.get('session');
  const swarmId = c.req.param('id');
  const key = c.req.param('key');
  
  await swarmCoordinator.deleteSwarmMemory(swarmId, key);
  return c.json({ success: true });
});

// ============================================================
// Chest Locations
// ============================================================
fleetRoutes.get('/chests', requireAuth, async (c) => {
  const user = c.get('session');
  
  const chests = await db.select()
    .from(schema.chestLocations)
    .where(eq(schema.chestLocations.userId, user.id));
  
  return c.json(chests);
});

fleetRoutes.post('/chests', requireAuth, async (c) => {
  const user = c.get('session');
  const body = await c.req.json();
  
  const chestId = randomUUID();
  await db.insert(schema.chestLocations).values({
    id: chestId,
    userId: user.id,
    serverId: body.serverId,
    name: body.name,
    x: body.x,
    y: body.y,
    z: body.z,
    itemName: body.itemName,
    description: body.description,
    createdAt: new Date(),
  });

  return c.json({ id: chestId, success: true });
});

fleetRoutes.put('/chests/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const chestId = c.req.param('id');
  const body = await c.req.json();
  
  await db.update(schema.chestLocations)
    .set(body)
    .where(and(
      eq(schema.chestLocations.id, chestId),
      eq(schema.chestLocations.userId, user.id)
    ));

  return c.json({ success: true });
});

fleetRoutes.delete('/chests/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const chestId = c.req.param('id');
  
  await db.delete(schema.chestLocations)
    .where(and(
      eq(schema.chestLocations.id, chestId),
      eq(schema.chestLocations.userId, user.id)
    ));

  return c.json({ success: true });
});

// ============================================================
// Global Tasks (all user's tasks across all swarms)
// ============================================================
fleetRoutes.get('/tasks', requireAuth, async (c) => {
  const user = c.get('session');
  const tasks = await db.select()
    .from(schema.deliveryQueue)
    .where(eq(schema.deliveryQueue.userId, user.id));
  return c.json(tasks);
});

// ============================================================
// Single Bot Detail
// ============================================================
fleetRoutes.get('/bots/:id', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  
  const bots = await db.select()
    .from(schema.bots)
    .where(and(
      eq(schema.bots.id, botId),
      eq(schema.bots.userId, user.id)
    ));
  
  if (bots.length === 0) {
    return c.json({ error: 'Bot not found' }, 404);
  }

  const bot = bots[0];
  const instance = botLifecycleManager.getBot(bot.id);
  
  return c.json({
    ...bot,
    liveStatus: instance ? instance.getStatus() : null,
  });
});

fleetRoutes.get('/bots/:id/inventory', requireAuth, async (c) => {
  const botId = c.req.param('id');
  const instance = botLifecycleManager.getBot(botId);
  if (!instance) return c.json([]);
  const status = instance.getStatus();
  return c.json(status.inventory || []);
});

fleetRoutes.get('/bots/:id/logs', requireAuth, async (c) => {
  const botId = c.req.param('id');
  const logs = await db.select()
    .from(schema.botLogs)
    .where(eq(schema.botLogs.botId, botId))
    .limit(50);
  return c.json(logs);
});

// ============================================================
// Fleet Dashboard Stats
// ============================================================
fleetRoutes.get('/dashboard', requireAuth, async (c) => {
  const user = c.get('session');
  
  // Get all user's bots
  const bots = await db.select()
    .from(schema.bots)
    .where(eq(schema.bots.userId, user.id));
  
  // Get all user's swarms
  const swarms = await db.select()
    .from(schema.swarms)
    .where(eq(schema.swarms.userId, user.id));
  
  // Get all user's tasks
  const tasks = await db.select()
    .from(schema.deliveryQueue)
    .where(eq(schema.deliveryQueue.userId, user.id));
  
  // Calculate stats
  const totalBots = bots.length;
  const idleBots = bots.filter(b => b.status === 'IDLE').length;
  const workingBots = bots.filter(b => ['WORKING', 'ON_DELIVERY', 'BUSY'].includes(b.status)).length;
  const offlineBots = bots.filter(b => b.status === 'OFFLINE').length;
  const errorBots = bots.filter(b => b.status === 'ERROR').length;
  
  const totalSwarms = swarms.length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
  const activeTasks = tasks.filter(t => ['LOCKED', 'IN_PROGRESS'].includes(t.status)).length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const failedTasks = tasks.filter(t => t.status === 'FAILED').length;

  return c.json({
    bots: {
      total: totalBots,
      idle: idleBots,
      working: workingBots,
      offline: offlineBots,
      error: errorBots,
    },
    swarms: {
      total: totalSwarms,
    },
    tasks: {
      total: totalTasks,
      pending: pendingTasks,
      active: activeTasks,
      completed: completedTasks,
      failed: failedTasks,
    },
  });
});

// ============================================================
// Trading Routes
// ============================================================
fleetRoutes.post('/bots/:id/trade', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  const body = await c.req.json();
  const { itemName, playerName, count } = body;

  const bot = botLifecycleManager.getBot(botId);
  if (!bot) {
    return c.json({ error: 'Bot not found' }, 404);
  }

  if (bot.userId !== user.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { TradingService } = await import('../services/tradingService.js');
  const tradingService = new TradingService(botLifecycleManager);
  
  const result = await tradingService.fulfillOrder(botId, playerName || 'player', itemName, count || 1);
  return c.json(result);
});

fleetRoutes.get('/bots/:id/items', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');

  const bot = botLifecycleManager.getBot(botId);
  if (!bot) {
    return c.json({ error: 'Bot not found' }, 404);
  }

  if (bot.userId !== user.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { TradingService } = await import('../services/tradingService.js');
  const tradingService = new TradingService(botLifecycleManager);
  
  const items = await tradingService.getAvailableItems(botId);
  return c.json(items);
});