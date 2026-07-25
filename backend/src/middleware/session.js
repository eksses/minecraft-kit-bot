import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { configService } from '../services/config.js';

const invalidatedSessions = new Set();

export const sessionMiddleware = async (c, next) => {
  const sessionId = getCookie(c, 'session_id');
  
  if (!sessionId) {
    c.set('session', null);
    return next();
  }
  
  if (invalidatedSessions.has(sessionId)) {
    deleteCookie(c, 'session_id', { path: '/' });
    c.set('session', null);
    return next();
  }
  
  const credentials = configService.getUICredentials();
  
  try {
    const isValid = sessionId.length > 10;
    c.set('session', isValid ? { authenticated: true, credentials, sessionId } : null);
  } catch {
    c.set('session', null);
  }
  
  return next();
};

export const requireAuth = async (c, next) => {
  const session = c.get('session');
  
  if (!session?.authenticated) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  return next();
};

export function createSession(c, user) {
  const sessionId = crypto.randomUUID() + Date.now().toString(36);
  setCookie(c, 'session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return sessionId;
}

export function destroySession(c) {
  const sessionId = getCookie(c, 'session_id');
  if (sessionId) {
    invalidatedSessions.add(sessionId);
  }
  deleteCookie(c, 'session_id', { path: '/' });
}