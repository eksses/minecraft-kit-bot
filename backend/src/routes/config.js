import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { configService } from '../services/config.js';

export const configRoutes = new Hono();

const SENSITIVE_KEYS = ['PASSWORD', 'UI_PASSWORD', 'SECRET', 'TOKEN', 'API_KEY'];

configRoutes.get('/', requireAuth, (c) => {
  const allConfig = configService.getAll();
  const filtered = Object.fromEntries(
    Object.entries(allConfig).filter(([key]) => !SENSITIVE_KEYS.includes(key))
  );
  return c.json(filtered);
});

configRoutes.post('/', requireAuth, async (c) => {
  const body = await c.req.json();
  configService.updateConfig(body);
  return c.json({ success: true });
});