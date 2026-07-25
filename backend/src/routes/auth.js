import { Hono } from 'hono';
import { requireAuth, createSession, destroySession } from '../middleware/session.js';
import { configService } from '../services/config.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  const credentials = configService.getUICredentials();
  
  if (username === credentials.username && password === credentials.password) {
    const user = { 
      id: 'legacy-admin', 
      username, 
      role: 'admin' 
    };
    const sessionId = createSession(c, user);
    return c.json({ success: true, user: { username, role: 'admin' } });
  }
  
  return c.json({ error: 'Invalid credentials' }, 401);
});

authRoutes.post('/logout', requireAuth, (c) => {
  destroySession(c);
  return c.json({ success: true });
});

authRoutes.get('/me', requireAuth, (c) => {
  const session = c.get('session');
  return c.json({ user: { id: session.id, username: session.username, role: session.role } });
});

// ============================================================
// User Management (admin only)
// ============================================================
authRoutes.get('/users', requireAuth, async (c) => {
  const session = c.get('session');
  if (session.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const users = await db.select().from(schema.users);
  return c.json(users);
});

authRoutes.post('/users', requireAuth, async (c) => {
  const session = c.get('session');
  if (session.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json();
  const id = randomUUID();
  const hash = await bcrypt.hash(body.password, 10);
  await db.insert(schema.users).values({
    id,
    username: body.username,
    passwordHash: hash,
    role: body.role || 'viewer',
    createdAt: new Date(),
  });
  return c.json({ id, success: true });
});

authRoutes.delete('/users/:id', requireAuth, async (c) => {
  const session = c.get('session');
  if (session.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const userId = c.req.param('id');
  await db.delete(schema.users).where(eq(schema.users.id, userId));
  return c.json({ success: true });
});