import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { botLifecycleManager } from '../services/botLifecycle.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export const chestRoutes = new Hono();

// ============================================================
// Helpers
// ============================================================

function validateCoordinates(x, y, z) {
  if (x === undefined || y === undefined || z === undefined) {
    return { valid: false, error: 'Missing coordinates (x, y, z)' };
  }
  const xNum = Number(x);
  const yNum = Number(y);
  const zNum = Number(z);
  if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || !Number.isFinite(zNum)) {
    return { valid: false, error: 'Coordinates must be valid numbers' };
  }
  if (!Number.isInteger(xNum) || !Number.isInteger(yNum) || !Number.isInteger(zNum)) {
    return { valid: false, error: 'Coordinates must be integers' };
  }
  return { valid: true, x: xNum, y: yNum, z: zNum };
}

/**
 * Verify a bot exists and belongs to the authenticated user.
 * Checks DB first, then tries botLifecycleManager for live instance.
 */
async function verifyBotOwnership(botId, userId) {
  // Check DB first
  const bots = await db.select()
    .from(schema.bots)
    .where(and(
      eq(schema.bots.id, botId),
      eq(schema.bots.userId, userId),
    ));
  if (bots.length === 0) return null;
  return bots[0];
}

// ============================================================
// Scan Endpoints (per-bot, D-01, D-02)
// ============================================================

/**
 * POST /:botId/scan — Trigger a chest scan for a specific bot
 * D-01: On-demand trigger, D-02: Per-bot, D-03: Reject if scan in progress
 * T-02-05: Validate radius 1-128
 * T-02-08: Validate botId belongs to authenticated user
 */
chestRoutes.post('/:botId/scan', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botData = await verifyBotOwnership(botId, session.id);
  if (!botData) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const fleetBot = botLifecycleManager.getBot(botId);
  
  if (!fleetBot) {
    return c.json({ error: 'Bot is not running' }, 400);
  }

  if (fleetBot.status === 'OFFLINE' || fleetBot.status === 'ERROR') {
    return c.json({ error: 'Bot is not connected to server' }, 400);
  }

  const body = await c.req.json();
  const { radius } = body;

  const scanRadius = radius !== undefined ? Number(radius) : 16;
  if (!Number.isInteger(scanRadius) || scanRadius < 1 || scanRadius > 128) {
    return c.json({ error: 'Radius must be an integer between 1 and 128' }, 400);
  }

  const scanConfig = await db.query.scanConfigs.findFirst({
    where: eq(schema.scanConfigs.botId, botId),
  });

  try {
    if (!fleetBot._scanWired) {
      fleetBot._scanWired = true;
      
      fleetBot.on('scan_complete', async (scanData) => {
        try {
          const { saveScanResultsToDb } = await import('../utils/chest-helpers.js');
          await saveScanResultsToDb(fleetBot, scanData, scanRadius);
        } catch (err) {
          console.error('[Scan] Error saving scan results:', err.message);
        }
      });
      
      fleetBot.on('scan_error', (err) => {
        console.error('[Scan] Bot ' + fleetBot.name + ' scan error:', err.error);
      });
    }
    
    fleetBot.startScan(scanRadius, scanConfig?.scanMarkedEnabled || false);

    return c.json({ success: true, message: 'Scan started', radius: scanRadius });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /:botId/scan/status — Get current scan status for a bot
 * T-02-07: Require auth, only return for user's bots
 * WR-08: Currently checks singleton botService scanner state (global, not per-bot).
 * For true per-bot scanning, each BotInstance needs its own ChestScanner instance.
 */
chestRoutes.get('/:botId/scan/status', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botData = await verifyBotOwnership(botId, session.id);
  if (!botData) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const fleetBot = botLifecycleManager.getBot(botId);
  
  if (fleetBot) {
    return c.json({
      running: fleetBot.scanning,
      phase: fleetBot.scanProgress?.phase || null,
      percent: fleetBot.scanProgress?.percent || 0,
      found: fleetBot.scanProgress?.found || 0,
      current: fleetBot.scanProgress?.current || 0,
      total: fleetBot.scanProgress?.total || 0,
    });
  }
  
  return c.json({ running: false });
});

chestRoutes.post('/:botId/scan/abort', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botData = await verifyBotOwnership(botId, session.id);
  if (!botData) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const fleetBot = botLifecycleManager.getBot(botId);
  if (fleetBot) {
    fleetBot.abortScan();
  }
  return c.json({ success: true, message: 'Scan abort requested' });
});

/**
 * GET /:botId/scan/config — Get scan config for a bot
 * T-02-07: Require auth, only return for user's bots
 */
chestRoutes.get('/:botId/scan/config', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botInstance = await verifyBotOwnership(botId, session.id);
  if (!botInstance) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const scanConfig = await db.query.scanConfigs.findFirst({
    where: eq(schema.scanConfigs.botId, botId),
  });

  // Return config or defaults
  return c.json({
    botId,
    scanMarkedEnabled: scanConfig?.scanMarkedEnabled ?? false,
    autoScanOnConnect: scanConfig?.autoScanOnConnect ?? false,
    scanIntervalMs: scanConfig?.scanIntervalMs ?? null,
    scanRadius: scanConfig?.scanRadius ?? 16,
    allowUnnamedOrders: scanConfig?.allowUnnamedOrders ?? true,
  });
});

/**
 * PUT /:botId/scan/config — Update scan config for a bot
 * T-02-06: Validate input, T-02-08: Validate botId ownership
 */
chestRoutes.put('/:botId/scan/config', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botInstance = await verifyBotOwnership(botId, session.id);
  if (!botInstance) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const body = await c.req.json();

  // Validate fields
  const updates = {};
  if (body.scanMarkedEnabled !== undefined) {
    updates.scanMarkedEnabled = Boolean(body.scanMarkedEnabled);
  }
  if (body.autoScanOnConnect !== undefined) {
    updates.autoScanOnConnect = Boolean(body.autoScanOnConnect);
  }
  if (body.scanIntervalMs !== undefined) {
    const val = body.scanIntervalMs === null ? null : Number(body.scanIntervalMs);
    if (val !== null && (!Number.isInteger(val) || val < 0)) {
      return c.json({ error: 'scanIntervalMs must be a non-negative integer or null' }, 400);
    }
    updates.scanIntervalMs = val;
  }
  if (body.scanRadius !== undefined) {
    const val = Number(body.scanRadius);
    if (!Number.isInteger(val) || val < 1 || val > 128) {
      return c.json({ error: 'scanRadius must be an integer between 1 and 128' }, 400);
    }
    updates.scanRadius = val;
  }
  if (body.allowUnnamedOrders !== undefined) {
    updates.allowUnnamedOrders = Boolean(body.allowUnnamedOrders);
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }

  // Upsert scan config
  const existing = await db.query.scanConfigs.findFirst({
    where: eq(schema.scanConfigs.botId, botId),
  });

  if (existing) {
    await db.update(schema.scanConfigs)
      .set(updates)
      .where(eq(schema.scanConfigs.id, existing.id));
  } else {
    await db.insert(schema.scanConfigs).values({
      id: crypto.randomUUID(),
      botId,
      scanMarkedEnabled: updates.scanMarkedEnabled ?? false,
      autoScanOnConnect: updates.autoScanOnConnect ?? false,
      scanIntervalMs: updates.scanIntervalMs ?? null,
      scanRadius: updates.scanRadius ?? 16,
      allowUnnamedOrders: updates.allowUnnamedOrders ?? true,
      createdAt: new Date(),
      ...updates,
    });
  }

  return c.json({ success: true });
});

/**
 * POST /:botId/rescan — Rescan a specific chest for a bot (D-10)
 * T-02-05: Validate coordinates are integers
 */
chestRoutes.post('/:botId/rescan', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botData = await verifyBotOwnership(botId, session.id);
  if (!botData) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const body = await c.req.json();
  const { x, y, z } = body;

  const coordCheck = validateCoordinates(x, y, z);
  if (!coordCheck.valid) {
    return c.json({ error: coordCheck.error }, 400);
  }

  try {
    const result = await botService.rescanChest(coordCheck.x, coordCheck.y, coordCheck.z);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================
// Bot-Scoped Chest Endpoints
// ============================================================

/**
 * GET /:botId — Get chests scoped to a specific bot
 * D-14a: Per-bot data isolation
 */
chestRoutes.get('/:botId', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botData = await verifyBotOwnership(botId, session.id);
  if (!botData) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const chests = await db.query.chestLocations.findMany({
    where: eq(schema.chestLocations.botId, botId),
  });

  return c.json(chests);
});

/**
 * POST /:botId — Create a chest associated with a specific bot
 * D-14a: Per-bot data isolation
 */
chestRoutes.post('/:botId', requireAuth, async (c) => {
  const botId = c.req.param('botId');
  const session = c.get('session');

  const botData = await verifyBotOwnership(botId, session.id);
  if (!botData) {
    return c.json({ error: 'Bot not found or access denied' }, 404);
  }

  const body = await c.req.json();
  const { name, x, y, z, item } = body;

  if (!name || !item) {
    return c.json({ error: 'Missing required fields (name, item)' }, 400);
  }

  const coordCheck = validateCoordinates(x, y, z);
  if (!coordCheck.valid) {
    return c.json({ error: coordCheck.error }, 400);
  }

  try {
    await db.insert(schema.chestLocations).values({
      id: crypto.randomUUID(),
      userId: session.id,
      serverId: botData.serverId || null,
      name,
      x: coordCheck.x,
      y: coordCheck.y,
      z: coordCheck.z,
      itemName: item,
      source: 'manual',
      status: 'active',
      botId,
      createdAt: new Date(),
    });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
