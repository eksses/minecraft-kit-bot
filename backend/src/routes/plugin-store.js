import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { pluginStore } from '../services/plugin-store.js';

export const pluginStoreRoutes = new Hono();

// ============================================================
// List available plugins from all repos
// ============================================================
pluginStoreRoutes.get('/available', requireAuth, async (c) => {
  try {
    const available = await pluginStore.getAvailable();
    return c.json({ plugins: available });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// List installed plugins
// ============================================================
pluginStoreRoutes.get('/installed', requireAuth, async (c) => {
  try {
    const installed = await pluginStore.getInstalled();
    return c.json({ plugins: installed });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// List all repositories
// ============================================================
pluginStoreRoutes.get('/repos', requireAuth, async (c) => {
  try {
    const repos = await pluginStore.getRepos();
    return c.json({ repos: repos });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// Add a custom repository
// ============================================================
pluginStoreRoutes.post('/repos', requireAuth, async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.url) {
    return c.json({ error: 'Name and URL are required' }, 400);
  }

  try {
    const repo = await pluginStore.addRepo(body.name, body.url);
    return c.json(repo, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// ============================================================
// Remove a repository
// ============================================================
pluginStoreRoutes.delete('/repos/:id', requireAuth, async (c) => {
  const repoId = c.req.param('id');

  try {
    await pluginStore.removeRepo(repoId);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// ============================================================
// Install a plugin
// ============================================================
pluginStoreRoutes.post('/install/:id', requireAuth, async (c) => {
  const pluginId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  try {
    const result = await pluginStore.install(pluginId, body.downloadUrl);
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// ============================================================
// Uninstall a plugin
// ============================================================
pluginStoreRoutes.delete('/uninstall/:id', requireAuth, async (c) => {
  const pluginId = c.req.param('id');

  try {
    await pluginStore.uninstall(pluginId);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// ============================================================
// Update a plugin
// ============================================================
pluginStoreRoutes.post('/update/:id', requireAuth, async (c) => {
  const pluginId = c.req.param('id');

  try {
    const result = await pluginStore.update(pluginId);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});
