import { Hono } from 'hono';
import { requireAuth, createSession, destroySession } from '../middleware/session.js';
import { configService } from '../services/config.js';

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
  return c.json({ user: { username: 'admin', role: 'admin' } });
});