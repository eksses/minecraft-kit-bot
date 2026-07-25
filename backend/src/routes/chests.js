import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { chestService } from '../services/chest.js';

export const chestRoutes = new Hono();

function validateCoordinates(x, y, z) {
  if (x === undefined || y === undefined || z === undefined) {
    return { valid: false, error: 'Missing coordinates (x, y, z)' };
  }
  const xNum = Number(x);
  const yNum = Number(y);
  const zNum = Number(z);
  if (!Number.isFinite(xNum) || !Number.isFinite(yNum) || !Number.isFinite(zNum)) {
    return { valid: false, error: 'Coordinates must be valid numbers' };
  }
  if (!Number.isInteger(xNum) || !Number.isInteger(yNum) || !Number.isInteger(zNum)) {
    return { valid: false, error: 'Coordinates must be integers' };
  }
  return { valid: true, x: xNum, y: yNum, z: zNum };
}

chestRoutes.get('/', requireAuth, (c) => {
  return c.json(chestService.getAll());
});

chestRoutes.post('/', requireAuth, async (c) => {
  const body = await c.req.json();
  const { name, x, y, z, item } = body;
  
  if (!name || !item) {
    return c.json({ error: 'Missing required fields (name, item)' }, 400);
  }
  
  const coordCheck = validateCoordinates(x, y, z);
  if (!coordCheck.valid) {
    return c.json({ error: coordCheck.error }, 400);
  }
  
  try {
    chestService.saveChest(name, { x: coordCheck.x, y: coordCheck.y, z: coordCheck.z, item });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

chestRoutes.put('/:name', requireAuth, async (c) => {
  const name = c.req.param('name');
  const body = await c.req.json();
  
  if (body.x !== undefined || body.y !== undefined || body.z !== undefined) {
    const coordCheck = validateCoordinates(body.x, body.y, body.z);
    if (!coordCheck.valid) {
      return c.json({ error: coordCheck.error }, 400);
    }
    body.x = coordCheck.x;
    body.y = coordCheck.y;
    body.z = coordCheck.z;
  }
  
  try {
    chestService.updateChest(name, body);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 404);
  }
});

chestRoutes.delete('/:name', requireAuth, async (c) => {
  const name = c.req.param('name');
  
  try {
    chestService.deleteChest(name);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 404);
  }
});