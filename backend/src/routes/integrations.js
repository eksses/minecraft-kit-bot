import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';

export const integrationRoutes = new Hono();

integrationRoutes.get('/', requireAuth, (c) => {
  return c.json({
    available: ['discord', 'telegram', 'webhook'],
    configured: [],
  });
});

integrationRoutes.post('/:platform', requireAuth, async (c) => {
  const platform = c.req.param('platform');
  const config = await c.req.json();
  
  // Implementation would save integration config
  return c.json({ success: true, platform, config });
});

integrationRoutes.delete('/:platform', requireAuth, async (c) => {
  const platform = c.req.param('platform');
  return c.json({ success: true, platform });
});