import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { pluginUIRegistry } from '../services/plugin-ui-registry.js';

export const pluginUIRoutes = new Hono();

// ============================================================
// Get all registered UI elements
// ============================================================
pluginUIRoutes.get('/registry', requireAuth, async (c) => {
  const registry = pluginUIRegistry.getAll();
  return c.json(registry);
});

// ============================================================
// Register a nav item (internal API for plugins)
// ============================================================
pluginUIRoutes.post('/nav-items', requireAuth, async (c) => {
  const body = await c.req.json();

  if (!body.pluginId || !body.id || !body.label || !body.path) {
    return c.json({ error: 'Missing required fields: pluginId, id, label, path' }, 400);
  }

  try {
    pluginUIRegistry.addNavItem(body);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// Register a route (internal API for plugins)
// ============================================================
pluginUIRoutes.post('/routes', requireAuth, async (c) => {
  const body = await c.req.json();

  if (!body.pluginId || !body.path || !body.componentName) {
    return c.json({ error: 'Missing required fields: pluginId, path, componentName' }, 400);
  }

  try {
    pluginUIRegistry.addRoute(body);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// Register a settings panel (internal API for plugins)
// ============================================================
pluginUIRoutes.post('/settings-panels', requireAuth, async (c) => {
  const body = await c.req.json();

  if (!body.pluginId || !body.id || !body.title || !body.componentName) {
    return c.json({ error: 'Missing required fields: pluginId, id, title, componentName' }, 400);
  }

  try {
    pluginUIRegistry.addSettingsPanel(body);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// Register a dashboard widget (internal API for plugins)
// ============================================================
pluginUIRoutes.post('/dashboard-widgets', requireAuth, async (c) => {
  const body = await c.req.json();

  if (!body.pluginId || !body.id || !body.title || !body.componentName) {
    return c.json({ error: 'Missing required fields: pluginId, id, title, componentName' }, 400);
  }

  try {
    pluginUIRegistry.addDashboardWidget(body);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});
