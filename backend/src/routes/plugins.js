import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { pluginLoader } from '../services/plugin-loader.js';

export const pluginRoutes = new Hono();

// ============================================================
// List all plugins
// ============================================================
pluginRoutes.get('/', requireAuth, async (c) => {
  const plugins = await db.query.plugins.findMany();
  return c.json({ plugins });
});

// ============================================================
// Get plugin details
// ============================================================
pluginRoutes.get('/:id', requireAuth, async (c) => {
  const pluginId = c.req.param('id');
  const plugin = await db.query.plugins.findFirst({
    where: eq(schema.plugins.id, pluginId),
  });

  if (!plugin) {
    return c.json({ error: 'Plugin not found' }, 404);
  }

  return c.json(plugin);
});

// ============================================================
// Enable / disable a plugin
// ============================================================
pluginRoutes.put('/:id/toggle', requireAuth, async (c) => {
  const pluginId = c.req.param('id');
  const body = await c.req.json();
  const enabled = Boolean(body.enabled);

  const plugin = await db.query.plugins.findFirst({
    where: eq(schema.plugins.id, pluginId),
  });

  if (!plugin) {
    return c.json({ error: 'Plugin not found' }, 404);
  }

  try {
    await pluginLoader.togglePlugin(pluginId, enabled);
    return c.json({ success: true, enabled });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// Get plugin settings
// ============================================================
pluginRoutes.get('/:id/settings', requireAuth, async (c) => {
  const pluginId = c.req.param('id');

  const plugin = await db.query.plugins.findFirst({
    where: eq(schema.plugins.id, pluginId),
  });

  if (!plugin) {
    return c.json({ error: 'Plugin not found' }, 404);
  }

  const rows = await db.query.pluginSettings.findMany({
    where: eq(schema.pluginSettings.pluginId, pluginId),
  });

  // Convert rows to a key-value map
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return c.json({ pluginId, settings });
});

// ============================================================
// Update plugin settings
// ============================================================
pluginRoutes.put('/:id/settings', requireAuth, async (c) => {
  const pluginId = c.req.param('id');
  const body = await c.req.json();

  const plugin = await db.query.plugins.findFirst({
    where: eq(schema.plugins.id, pluginId),
  });

  if (!plugin) {
    return c.json({ error: 'Plugin not found' }, 404);
  }

  const now = new Date();
  const entries = Object.entries(body);

  for (const [key, value] of entries) {
    const serialized = JSON.stringify(value);
    const existing = await db.query.pluginSettings.findFirst({
      where: (cols, { and }) => and(
        eq(cols.pluginId, pluginId),
        eq(cols.key, key),
      ),
    });

    if (existing) {
      await db.update(schema.pluginSettings)
        .set({ value: serialized, updatedAt: now })
        .where((cols, { and }) => and(
          eq(cols.pluginId, pluginId),
          eq(cols.key, key),
        ));
    } else {
      await db.insert(schema.pluginSettings).values({
        pluginId,
        key,
        value: serialized,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return c.json({ success: true });
});

// ============================================================
// Install plugin (stub — real impl needs marketplace / file upload)
// ============================================================
pluginRoutes.post('/:id/install', requireAuth, async (c) => {
  const pluginId = c.req.param('id');
  return c.json({
    success: false,
    error: 'Plugin installation is not yet implemented',
    pluginId,
  }, 501);
});

// ============================================================
// Uninstall plugin (stub — real impl needs file cleanup)
// ============================================================
pluginRoutes.delete('/:id', requireAuth, async (c) => {
  const pluginId = c.req.param('id');
  return c.json({
    success: false,
    error: 'Plugin uninstallation is not yet implemented',
    pluginId,
  }, 501);
});
