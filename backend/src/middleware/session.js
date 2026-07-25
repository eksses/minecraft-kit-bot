import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { configService } from '../services/config.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const invalidatedSessions = new Set();

// In-memory session store (for development)
// In production, use Redis or database
const sessionStore = new Map();

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
  
  // Check session store
  const sessionData = sessionStore.get(sessionId);
  if (sessionData) {
    c.set('session', sessionData);
    return next();
  }
  
  // Fallback to legacy session validation
  const credentials = configService.getUICredentials();
  const isValid = sessionId.length > 10;
  
  if (isValid) {
    // For legacy sessions, create a default user context
    const legacySession = { 
      authenticated: true, 
      id: 'legacy-admin',
      username: credentials.username,
      role: 'admin',
      sessionId 
    };
    sessionStore.set(sessionId, legacySession);
    c.set('session', legacySession);
  } else {
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
  
  // Store session with user data
  const sessionData = {
    authenticated: true,
    id: user.id,
    username: user.username,
    role: user.role,
    sessionId,
  };
  sessionStore.set(sessionId, sessionData);
  
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
    sessionStore.delete(sessionId);
  }
  deleteCookie(c, 'session_id', { path: '/' });
}