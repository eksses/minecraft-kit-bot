---
status: needs_fix
depth: standard
files_reviewed_list:
  - backend/src/app.js
  - backend/src/index.js
  - backend/src/services/bot.js
  - backend/src/services/chest.js
  - backend/src/services/config.js
  - backend/src/services/websocket.js
  - backend/src/middleware/session.js
  - backend/src/routes/auth.js
  - backend/src/routes/bot.js
  - backend/src/routes/chests.js
  - backend/src/routes/kits.js
  - backend/src/routes/config.js
  - backend/src/routes/integrations.js
  - frontend/src/App.jsx
  - frontend/src/main.jsx
  - frontend/src/services/api.js
  - frontend/src/store/index.js
  - frontend/src/pages/*.jsx
  - frontend/src/components/Layout/Layout.jsx
  - frontend/src/context/AuthContext.jsx
---

# Code Review: Legacy Cleanup & Optimization

## Critical Findings

### C1: Legacy files still present in project root
**Files:** server.js, api.js, bot.js, views/
**Impact:** Confusing, potential security risk, dead code
**Fix:** Remove legacy files after migration is confirmed working

### C2: Hardcoded credentials in config defaults
**File:** backend/src/services/config.js:35,51
**Code:** `password: this.get('PASSWORD', 'changeme_mdb')`, `password: this.get('UI_PASSWORD', 'password')`
**Impact:** Security risk if .env not set
**Fix:** Remove defaults, require .env configuration

### C3: Hardcoded CORS origins
**File:** backend/src/app.js:24
**Code:** `origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081']`
**Impact:** Won't work in production
**Fix:** Make configurable via environment variable

## Warning Findings

### W1: console.log statements in production code
**Files:** backend/src/index.js:18,26, backend/src/services/bot.js:34,56, backend/src/services/websocket.js:9,26
**Impact:** Verbose logging in production
**Fix:** Use proper logger or remove debug logs

### W2: Unused imports in auth.js
**File:** backend/src/routes/auth.js:2
**Code:** `import { setCookie, deleteCookie } from 'hono/cookie';`
**Impact:** Dead code
**Fix:** Remove unused imports

### W3: Duplicate bot routes
**Files:** backend/src/routes/bot.js, backend/src/routes/system.js
**Impact:** Conflicting endpoints
**Fix:** Consolidate into single bot routes file

### W4: Session invalidation uses in-memory Set
**File:** backend/src/middleware/session.js:4
**Code:** `const invalidatedSessions = new Set();`
**Impact:** Sessions lost on server restart, not scalable
**Fix:** Document limitation, consider Redis for production

### W5: WebSocket handler doesn't validate messages
**File:** backend/src/services/websocket.js:13-21
**Impact:** Could send arbitrary chat commands
**Fix:** Add message validation

### W6: Bot service creates singleton with config at import time
**File:** backend/src/services/bot.js:135
**Code:** `export const botService = new BotService(configService.getBotConfig());`
**Impact:** Config changes require restart
**Fix:** Document limitation

## Info Findings

### I1: No input validation on chest coordinates
**File:** backend/src/routes/chests.js:11-25
**Impact:** Could accept invalid coordinates
**Fix:** Add validation middleware

### I2: Kit order has no rate limiting
**File:** backend/src/routes/kits.js:8-32
**Impact:** Could be abused
**Fix:** Add rate limiting

### I3: Config endpoint returns all environment variables
**File:** backend/src/routes/config.js:7-9
**Impact:** May expose sensitive data
**Fix:** Filter sensitive fields