import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { botLifecycleManager } from '../services/botLifecycle.js';
import { swarmCoordinator } from '../services/swarmCoordinator.js';

export const fleetRoutes = new Hono();

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
  if (!bot.serverId) {
    return c.json({ error: 'Bot has no server assigned' }, 400);
  }

  // Get server config
  const servers = await db.select()
    .from(schema.servers)
    .where(eq(schema.servers.id, bot.serverId));
  
  if (servers.length === 0) {
    return c.json({ error: 'Server not found' }, 404);
  }

  const server = servers[0];
  
  // Start the bot
  try {
    const instance = await botLifecycleManager.startBot({
      id: bot.id,
      userId: bot.userId,
      name: bot.name,
      username: bot.username,
    }, {
      name: server.name,
      host: server.host,
      port: server.port,
      version: server.version,
      authType: server.authType,
      passwordEncrypted: bot.passwordEncrypted,
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