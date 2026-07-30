import { createApp } from './backend/src/app.js';
import { serve } from '@hono/node-server';
import { initDatabase } from './backend/src/db/index.js';
import { swarmCoordinator } from './backend/src/services/swarmCoordinator.js';
import { pluginLoader } from './backend/src/services/plugin-loader.js';

initDatabase();
swarmCoordinator.start();
await pluginLoader.start();

const app = createApp();
const server = serve({ fetch: app.fetch, port: 19999, hostname: '127.0.0.1' }, async () => {
  console.log('Test server on 19999');
  
  let r = await fetch('http://127.0.0.1:19999/api/health');
  console.log('GET /api/health:', r.status, await r.text());
  
  r = await fetch('http://127.0.0.1:19999/api/fleet/bots/test-id/start', { method: 'POST' });
  console.log('POST /api/fleet/bots/test-id/start (no auth):', r.status, await r.text());

  r = await fetch('http://127.0.0.1:19999/api/fleet/bots/test-id/start', {
    method: 'POST',
    headers: { Cookie: 'session_id=abc123def456ghijk' }
  });
  console.log('POST /api/fleet/bots/test-id/start (with session):', r.status, await r.text());

  r = await fetch('http://127.0.0.1:19999/api/bot/status', {
    headers: { Cookie: 'session_id=abc123def456ghijk' }
  });
  console.log('GET /api/bot/status:', r.status, await r.text());

  r = await fetch('http://127.0.0.1:19999/api/bot/start', {
    method: 'POST',
    headers: { Cookie: 'session_id=abc123def456ghijk' }
  });
  console.log('POST /api/bot/start (legacy):', r.status, await r.text());
  
  process.exit(0);
});
