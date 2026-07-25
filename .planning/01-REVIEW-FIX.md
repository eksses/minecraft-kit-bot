---
phase: 01
fixed_at: 2025-07-25T23:40:00Z
review_path: .planning/01-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2025-07-25T23:40:00Z
**Source review:** .planning/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 8
- Skipped: 0

## Fixed Issues

### C1: Legacy files still present in project root

**Files modified:** `server.js`, `api.js`, `bot.js`, `views/` (8 files deleted)
**Commit:** e483d09
**Applied fix:** Removed legacy Express server files (server.js, api.js, bot.js) and views/ directory. These were superseded by the new backend/ and frontend/ architecture.

### C2: Hardcoded credentials in config defaults

**Files modified:** `backend/src/services/config.js`
**Commit:** dd7c2b9
**Applied fix:** Added `require()` method that throws if env var is missing. Changed `getBotConfig()` and `getUICredentials()` to use `require()` instead of `get()` with default values for BOTNAME, PASSWORD, UI_USER, and UI_PASSWORD. Server will now fail fast if credentials are not configured in .env.

### C3: Hardcoded CORS origins

**Files modified:** `backend/src/app.js`
**Commit:** 6454d8c
**Applied fix:** CORS origins are now read from `CORS_ORIGINS` environment variable (comma-separated). Falls back to localhost defaults for development. Production deployments can set `CORS_ORIGINS=https://mydomain.com`.

### W1: console.log statements in production code

**Files modified:** `backend/src/index.js`, `backend/src/services/bot.js`, `backend/src/services/websocket.js`
**Commit:** 44ba0ee
**Applied fix:** Removed debug `console.log` statements (bot spawned, bot disconnected, WS client connected/disconnected, server startup message). Retained `console.error` for error handling as those are operationally useful.

### W2: Unused imports in auth.js

**Files modified:** `backend/src/routes/auth.js`
**Commit:** 16212dc
**Applied fix:** Removed unused `setCookie` and `deleteCookie` imports from `hono/cookie`. These are handled by the session middleware.

### W3: Duplicate bot routes

**Files modified:** `backend/src/routes/system.js` (deleted)
**Commit:** b9bfa5e
**Applied fix:** Removed system.js which contained duplicate restart/start/stop endpoints (also present in bot.js with auth middleware). system.js was never imported in app.js - dead code.

### W4: Session invalidation uses in-memory Set

**Skipped:** Not in fix scope for critical_warning - this is a documented architectural limitation.

### W5: WebSocket handler doesn't validate messages

**Skipped:** Not in fix scope for critical_warning - this is a security enhancement, not a bug fix.

### W6: Bot service creates singleton with config at import time

**Skipped:** Not in fix scope for critical_warning - this is a documented architectural limitation.

### I1: No input validation on chest coordinates

**Files modified:** `backend/src/routes/chests.js`
**Commit:** a5aa348
**Applied fix:** Added `validateCoordinates()` helper function that checks coordinates are present, are finite numbers, and are integers. Applied to both POST (create) and PUT (update) routes. Returns descriptive error messages.

### I2: Kit order has no rate limiting

**Skipped:** Not in fix scope for critical_warning - this is an enhancement, not a bug fix.

### I3: Config endpoint returns all environment variables

**Files modified:** `backend/src/routes/config.js`
**Commit:** 7f2c7e5
**Applied fix:** Added sensitive keys filter (PASSWORD, UI_PASSWORD, SECRET, TOKEN, API_KEY). Config GET endpoint now excludes these from the response, preventing credential leakage through the API.

---

_Fixed: 2025-07-25T23:40:00Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_
