import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { sessionMiddleware } from './middleware/session.js';
import { authRoutes } from './routes/auth.js';
import { botRoutes } from './routes/bot.js';
import { chestRoutes } from './routes/chests.js';
import { kitRoutes } from './routes/kits.js';
import { configRoutes } from './routes/config.js';
import { integrationRoutes } from './routes/integrations.js';
import { fleetRoutes } from './routes/fleet.js';
import { pluginRoutes } from './routes/plugins.js';
import { pluginUIRoutes } from './routes/plugin-ui.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_PATH = join(__dirname, '../../frontend/dist');

export function createApp() {
  const app = new Hono();
  
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081'];
  
  app.use('*', logger());
  app.use('*', cors({
    origin: corsOrigins,
    credentials: true,
  }));
  
  app.use('*', sessionMiddleware);
  
  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));
  
  // Legacy routes (keep for backward compatibility)
  app.route('/api/auth', authRoutes);
  app.route('/api/bot', botRoutes);
  app.route('/api/chests', chestRoutes);
  app.route('/api/kits', kitRoutes);
  app.route('/api/config', configRoutes);
  app.route('/api/integrations', integrationRoutes);
  
  // New fleet management routes
  app.route('/api/fleet', fleetRoutes);
  
  // Plugin management routes
  app.route('/api/plugins', pluginRoutes);

  // Plugin UI registry routes
  app.route('/api/plugin-ui', pluginUIRoutes);
  
  app.get('*', serveStatic({ root: DIST_PATH }));
  
  return app;
}