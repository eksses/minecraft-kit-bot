import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import { createApp } from './app.js';
import { BotService } from './services/bot.js';
import { ConfigService } from './services/config.js';
import { wsHandler } from './services/websocket.js';

const configService = new ConfigService();
const botService = new BotService(configService.getBotConfig());
const app = createApp();

const PORT = configService.getServerPort();

const server = serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  // Server started successfully
});

const wss = new WebSocketServer({ server });
wsHandler(wss, botService);

// Start bot connection (non-blocking)
botService.start().then(() => {
  console.log('Bot started successfully');
}).catch((err) => {
  console.error('Bot failed to start (server will continue running):', err.message);
});