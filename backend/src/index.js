import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { ConfigService } from './services/config.js';
import { initDatabase } from './db/index.js';
import { swarmCoordinator } from './services/swarmCoordinator.js';
import { realtimeServer } from './services/realtime.js';
import { pluginLoader } from './services/plugin-loader.js';

const configService = new ConfigService();

// Initialize database
initDatabase();

// Start swarm coordinator
swarmCoordinator.start();

// Start plugin loader BEFORE creating app so plugin routes are mounted
await pluginLoader.start();

const app = createApp();

const PORT = configService.getServerPort();
const HOST = process.env.HOST || '0.0.0.0';

const server = serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
}, (info) => {
  console.log(`Server running on http://${HOST}:${info.port}`);
});

// Setup real-time WebSocket server
realtimeServer.setup(server);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  pluginLoader.stop();
  swarmCoordinator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  pluginLoader.stop();
  swarmCoordinator.stop();
  process.exit(0);
});