import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { chestService } from '../services/chest.js';
import { botService } from '../services/bot.js';

export const kitRoutes = new Hono();

kitRoutes.post('/order', requireAuth, async (c) => {
  const { chestName, amount, player } = await c.req.json();
  
  if (!chestName || !amount || !player) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  
  const chestData = chestService.get(chestName);
  if (!chestData) {
    return c.json({ error: 'Chest not found' }, 404);
  }
  
  if (!botService.bot || !botService.connected) {
    return c.json({ error: 'Bot not connected' }, 503);
  }
  
  try {
    await botService.takeItemFromChest(chestName, amount, player);
    return c.json({ 
      success: true, 
      message: `Ordered ${amount} ${chestData.item} from "${chestName}" for ${player}` 
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

kitRoutes.get('/available', requireAuth, (c) => {
  const chests = chestService.getAll();
  const available = Object.entries(chests).map(([name, data]) => ({
    name,
    item: data.item,
    x: data.x,
    y: data.y,
    z: data.z,
  }));
  return c.json(available);
});

kitRoutes.get('/history', requireAuth, (c) => {
  return c.json([]);
});