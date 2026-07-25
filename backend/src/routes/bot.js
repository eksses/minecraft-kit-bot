import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { botService } from '../services/bot.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const botRoutes = new Hono();

botRoutes.get('/status', requireAuth, (c) => {
  const isOnline = botService.bot !== null && botService.connected;
  return c.json({ 
    online: isOnline, 
    username: botService.botConfig?.username || 'Unknown',
    server: botService.botConfig?.host || 'Unknown',
  });
});

botRoutes.post('/leave', requireAuth, async (c) => {
  if (botService.bot && botService.connected) {
    botService.bot.quit('Leaving via API');
    return c.json({ success: true, code: 3 });
  }
  return c.json({ success: false, code: 4 });
});

botRoutes.post('/restart', requireAuth, async (c) => {
  try {
    await execAsync('sudo systemctl restart mdb');
    return c.json({ success: true, message: 'Bot restart initiated' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

botRoutes.post('/start', requireAuth, async (c) => {
  try {
    await execAsync('sudo systemctl start mdb');
    return c.json({ success: true, message: 'Bot started' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

botRoutes.post('/stop', requireAuth, async (c) => {
  try {
    await execAsync('sudo systemctl stop mdb');
    return c.json({ success: true, message: 'Bot stopped' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});