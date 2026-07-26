---
phase: 02-chest-scanner
reviewed: 2026-07-26T00:00:00Z
depth: deep
files_reviewed: 10
files_reviewed_list:
  - backend/src/db/schema.js
  - backend/src/services/chest-scanner.js
  - backend/src/utils/sign-parser.js
  - backend/src/routes/chests.js
  - backend/src/routes/bot.js
  - backend/src/services/bot.js
  - backend/src/services/kit.js
  - backend/src/services/realtime.js
  - frontend/src/pages/ChestManager.jsx
  - frontend/src/services/api.js
findings:
  critical: 4
  warning: 8
  info: 3
  total: 15
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-26
**Depth:** deep
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed all source files modified or created during phase 02-chest-scanner across 3 implementation plans (schema/scanner core, API routes/WebSocket, frontend scan UI). Found 4 critical bugs that cause incorrect behavior or security gaps, 8 warnings for logic errors and code quality, and 3 informational items. The most severe issues are: (1) scan events lack botId causing the entire real-time progress feature to be non-functional, (2) missing property assignments on the mineflayer bot object causing DB writes with undefined keys, (3) `markChestUnavailable`/`updateChestCount` not scoped by botId violating per-bot data isolation, and (4) WebSocket client never authenticates allowing unauthenticated event subscriptions.

## Critical Issues

### CR-01: Scan events missing botId — real-time progress feature completely broken

**File:** `backend/src/services/bot.js:51-57` and `backend/src/services/chest-scanner.js:38,52,55`

**Issue:** The ChestScanner emits `progress` and `complete` events without a `botId` property in the data payload. BotService forwards them as-is to `scan-progress` and `scan-complete`. On the frontend, `ChestManager.jsx:69` and `ChestManager.jsx:75` filter events by `msg.botId === selectedBotId`, which will always be `undefined === selectedBotId` — **no scan event will ever reach the UI**. This makes the entire real-time scan progress feature non-functional.

Additionally, `backend/src/services/realtime.js` does not forward any events from `botService` — it only forwards events from `botLifecycleManager`. So even if the data were correct, events would never reach WebSocket clients.

**Compound failure chain:**
1. ChestScanner emits `{ phase, found/current, total }` — no botId
2. BotService emits `scan-progress` with same data — no botId
3. RealtimeServer never listens to botService — events are dropped
4. Frontend filters on `msg.botId` — always undefined, filter fails

**Fix:**
```javascript
// backend/src/services/bot.js — wrap scanner events with botId
this.scanner.on('progress', (data) => {
  this.emit('scan-progress', { ...data, botId: this.botConfig.username });
});

this.scanner.on('complete', (results) => {
  this.emit('scan-complete', { ...results, botId: this.botConfig.username });
});

// backend/src/services/realtime.js — add scan event forwarding
import { botService } from './bot.js';
// In setup():
botService.on('scan-progress', (data) => {
  this.broadcastToBotSubscribers(data.botId, {
    type: 'scan-progress',
    botId: data.botId,
    data,
  });
});
botService.on('scan-complete', (data) => {
  this.broadcastToBotSubscribers(data.botId, {
    type: 'scan-complete',
    botId: data.botId,
    data,
  });
});
```

---

### CR-02: Mineflayer bot object missing `_botId`/`_userId`/`_serverId` — DB writes use undefined keys

**File:** `backend/src/services/bot.js:48` and `backend/src/services/chest-scanner.js:133,234-236`

**Issue:** `ChestScanner` is initialized with the mineflayer bot object (`this.scanner = new ChestScanner(this.bot, db)`). The scanner's `saveChestToDb` reads `this.bot._botId` (line 133), `this.bot._userId` (line 234), and `this.bot._serverId` (line 236) to populate database columns. These underscore-prefixed properties are **never assigned** to the mineflayer bot object anywhere in the codebase. The mineflayer bot is created by `mineflayer.createBot()` and has no `_botId` field.

**Result:** All chests saved by the scanner will have `botId: undefined`, `userId: undefined`, and `serverId: undefined`. This means:
- Per-bot data isolation (D-14a) is completely broken — chests cannot be queried by botId
- Chests are orphaned — they have no userId, so the `ON DELETE CASCADE` foreign key won't work correctly
- The `botId` upsert check in `saveChestToDb` (line 214-221) will always fail to match existing records, causing duplicate inserts

**Fix:**
```javascript
// backend/src/services/bot.js — after mineflayer bot creation, set metadata
this.bot.once('spawn', async () => {
  // ... existing code ...

  // Set bot metadata on the mineflayer object for ChestScanner access
  this.bot._botId = botRecord?.id; // or pass botId into BotService
  this.bot._userId = this.botConfig.userId;
  this.bot._serverId = this.botConfig.serverId;

  this.scanner = new ChestScanner(this.bot, db);
  // ...
});
```

---

### CR-03: `markChestUnavailable` and `updateChestCount` not scoped by botId — violates per-bot data isolation

**File:** `backend/src/services/chest-scanner.js:279-306`

**Issue:** Both `markChestUnavailable` (line 279) and `updateChestCount` (line 292) use `WHERE x = ? AND y = ? AND z = ?` without including `botId` in the condition. The `saveChestToDb` method (line 213-221) correctly scopes its upsert check by `botId`, but these two methods don't.

If two bots have a chest at the same world coordinates (possible — different users, different servers, or even same server), calling `markChestUnavailable` for bot A would mark bot B's chest as unavailable too. Similarly, `updateChestCount` would update the wrong bot's record.

**Fix:**
```javascript
async markChestUnavailable(x, y, z, botId) {
  await this.db.update(chestLocations)
    .set({ status: 'unavailable' })
    .where(
      and(
        eq(chestLocations.botId, botId),
        eq(chestLocations.x, x),
        eq(chestLocations.y, y),
        eq(chestLocations.z, z)
      )
    );
}

async updateChestCount(x, y, z, count, botId) {
  await this.db.update(chestLocations)
    .set({ itemCount: count, lastScanned: Date.now() })
    .where(
      and(
        eq(chestLocations.botId, botId),
        eq(chestLocations.x, x),
        eq(chestLocations.y, y),
        eq(chestLocations.z, z)
      )
    );
}
```
Update callers in `rescanChest` to pass `this.bot._botId`.

---

### CR-04: WebSocket client never authenticates — unauthenticated users can subscribe to bot events

**File:** `frontend/src/services/api.js:167-177`

**Issue:** `RealtimeClient.connect()` creates a WebSocket connection but never sends an `auth` message. The server (`realtime.js:58-62`) expects a `type: 'auth'` message with `userId` to track the client in `this.clients`. Without auth:
- The client is not tracked in `this.clients`, so `broadcastToAll` messages (status updates, error broadcasts) will never reach this client
- The client CAN still subscribe to bot-specific events via `subscribe_bot` (which only requires a botId, no auth), so health/position/status events work — but this means **anyone can connect and observe any bot's real-time data without authentication**

This is a security gap: an unauthenticated user can connect to the WebSocket, send `subscribe_bot` with any botId, and receive real-time health, position, and inventory data for bots they don't own.

**Fix:**
```javascript
// frontend/src/services/api.js — RealtimeClient.connect()
connect() {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}`;

  try {
    this.ws = new WebSocket(url);
  } catch { return; }

  this.ws.onopen = () => {
    this.connected = true;
    // Authenticate with the server
    this.ws.send(JSON.stringify({ type: 'auth', userId: this._userId }));
    // Re-subscribe to previously subscribed bots
    for (const botId of this.subscribedBots) {
      this.ws.send(JSON.stringify({ type: 'subscribe_bot', botId }));
    }
  };
  // ... rest unchanged
}
```
The `_userId` would need to be set after login (e.g., from the auth response or `/auth/me` endpoint).

---

## Warnings

### WR-01: `pathTo` leaks event listener on timeout — stale `goal_reached` fires for wrong chest

**File:** `backend/src/services/chest-scanner.js:140-151`

**Issue:** When `pathTo` times out (line 144), the promise rejects but the `goal_reached` listener registered on line 146 is never removed. On the next `pathTo` call, a new listener is added. If the bot eventually reaches the old goal, the old listener fires and resolves the *new* promise — causing the scanner to proceed to the wrong chest or skip a chest entirely.

**Fix:**
```javascript
pathTo(pos) {
  return new Promise((resolve, reject) => {
    this.bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 1));
    
    const onGoalReached = () => {
      clearTimeout(timeout);
      this.bot.removeListener('goal_reached', onGoalRejected);
      resolve();
    };
    
    const onGoalRejected = () => {}; // noop for cleanup
    const timeout = setTimeout(() => {
      this.bot.removeListener('goal_reached', onGoalReached);
      reject(new Error('Pathfinding timeout'));
    }, 60000);
    
    this.bot.once('goal_reached', onGoalReached);
  });
}
```

---

### WR-02: `takeItemFromChest` has same event listener leak as `pathTo`

**File:** `backend/src/services/bot.js:134-155`

**Issue:** Same pattern as WR-01 — the `goal_reached` listener (line 135) is never cleaned up on timeout (line 154). Additionally, the 60-second timeout on line 154 runs independently of the pathfinding timeout inside `pathTo` if it were called, creating a double-timeout scenario.

**Fix:** Use the same cleanup pattern as WR-01, removing the `goal_reached` listener on timeout.

---

### WR-03: `isSignOnChestFace` ignores position parameters — validation is incomplete

**File:** `backend/src/utils/sign-parser.js:44-48`

**Issue:** The function accepts `chestPos`, `signPos`, and `signFace` parameters but only checks if `signFace` is in `['north', 'south']`. The `chestPos` and `signPos` are completely ignored. This means the function doesn't verify that the sign is actually adjacent to the chest — a sign 100 blocks away on the north face of *some* block would pass validation.

**Fix:**
```javascript
export function isSignOnChestFace(chestPos, signPos, signFace) {
  const validFaces = ['north', 'south'];
  if (!validFaces.includes(signFace)) return false;
  
  // Verify sign is adjacent to chest on the validated face
  const dz = signPos.z - chestPos.z;
  const dy = signPos.y - chestPos.y;
  const dx = signPos.x - chestPos.x;
  
  if (signFace === 'north') return dz === -1 && dy === 0 && dx === 0;
  if (signFace === 'south') return dz === 1 && dy === 0 && dx === 0;
  return false;
}
```

---

### WR-04: `getScanConfig` queries by username — not guaranteed unique across users

**File:** `backend/src/services/bot.js:212-213`

**Issue:** `getScanConfig` finds the bot record using `eq(schema.bots.username, this.botConfig.username)`. If two users create bots with the same Minecraft username (e.g., same account on different servers), this query returns the first match, which may be the wrong user's bot config.

**Fix:** Pass the bot's database ID into `BotService` or query by both `username` and `userId`:
```javascript
const botRecord = await db.query.bots.findFirst({
  where: and(
    eq(schema.bots.username, this.botConfig.username),
    eq(schema.bots.userId, this.botConfig.userId)
  ),
});
```

---

### WR-05: Legacy chest endpoints have no ownership verification

**File:** `backend/src/routes/chests.js:324-380`

**Issue:** The legacy `GET /`, `POST /`, `PUT /:name`, and `DELETE /:name` endpoints use `chestService` (which operates on a JSON file) without verifying the chest belongs to the authenticated user. A user who knows another user's chest name can update or delete it via `PUT /:name` or `DELETE /:name`. While these are marked as "Legacy" endpoints, they are still active and routable.

**Fix:** Either remove legacy endpoints if they're no longer needed, or add ownership checks:
```javascript
chestRoutes.put('/:name', requireAuth, async (c) => {
  const session = c.get('session');
  const chest = chestService.get(c.req.param('name'));
  if (!chest || chest.userId !== session.id) {
    return c.json({ error: 'Chest not found or access denied' }, 404);
  }
  // ... existing update logic
});
```

---

### WR-06: `sudo systemctl` commands in bot routes — privilege escalation risk and error leakage

**File:** `backend/src/routes/bot.js:28-53`

**Issue:** Lines 30, 39, 48 execute `sudo systemctl restart/start/stop mdb` via `execAsync`. This requires the web server process to have passwordless sudo access for systemctl, which is a privilege escalation surface. Additionally, the `error.message` from `execAsync` (lines 33, 42, 51) is returned to the client, potentially leaking system paths, service configuration, or other sensitive information.

**Fix:** 
1. Use a dedicated service management script with limited permissions instead of raw `sudo systemctl`
2. Return generic error messages to the client:
```javascript
} catch (error) {
  console.error('Restart failed:', error.message);
  return c.json({ success: false, error: 'Service restart failed' }, 500);
}
```

---

### WR-07: Synchronous database and file I/O in async context

**File:** `backend/src/services/kit.js:67,117`

**Issue:** `getUnscannedChests()` (line 67) uses `db.select().from(schema.chestLocations).all()` — a synchronous database query that blocks the Node.js event loop. `saveOrder()` (line 117) uses `writeFileSync` which also blocks. In a request handler, this blocks all other requests until the I/O completes.

**Fix:** Use async alternatives:
```javascript
async getUnscannedChests() {
  const allChests = await db.select().from(schema.chestLocations);
  // ...
}

async saveOrder(order) {
  const orders = await this.getOrderHistory();
  orders.unshift(order);
  if (orders.length > 1000) orders.length = 1000;
  await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}
```

---

### WR-08: Scan status check is global — not per-bot

**File:** `backend/src/routes/chests.js:62-63`

**Issue:** `botService.isScanning()` checks the singleton scanner's state. If user A triggers a scan for bot-1, user B cannot trigger a scan for bot-2 — they get a 409 "Scan already in progress". The route is scoped by botId (`/:botId/scan`) but the scan state check is not.

This is a known architectural limitation acknowledged in the code comments (line 104-105), but it means the API contract is misleading: the endpoint appears per-bot but behaves globally.

**Fix:** Either make the API explicitly global (`POST /scan` without botId) or implement per-bot scanner instances (as noted in the summary: "full multi-bot scanner would need per-BotInstance ChestScanner instances").

---

## Info

### IN-01: Frontend silently swallows errors on bot list load

**File:** `frontend/src/pages/ChestManager.jsx:32`

**Issue:** `api.fleet.getBots().then(setBots).catch(() => {})` — the catch block is empty. If the API call fails (network error, auth expired), the user sees an empty "Select a bot..." dropdown with no error indication.

**Fix:** Show a toast or error state:
```javascript
api.fleet.getBots().then(setBots).catch(() => {
  addToast({ type: 'error', title: 'Failed to load bots' });
});
```

---

### IN-02: Sign parser regex doesn't match empty values

**File:** `backend/src/utils/sign-parser.js:11`

**Issue:** The regex `/#(\w+):([^\s#]+)/g` requires at least one non-whitespace character after the colon (`+` not `?`). A sign line like `#Name:` (empty value) won't match. If the Scan Marked mod produces signs with empty values, they'll be silently ignored.

**Fix:** If empty values should be captured, change `+` to `*`:
```javascript
const regex = /#(\w+):([^\s#]*)/g;
```

---

### IN-03: `readContainerContents` returns empty items array for fully-empty chests

**File:** `backend/src/services/chest-scanner.js:196-204`

**Issue:** If a chest has no items, `readContainerContents` returns `{ items: [], totalSlots: 27 }`. Then on line 116, `contents.items[0]?.name || 'unknown'` evaluates to `'unknown'`, and the chest is saved with name `unnamed:unknown`. This is correct behavior but worth noting: completely empty chests will all get the same name, making them indistinguishable in the UI.

**Fix:** Consider using a hash of coordinates or a timestamp-based fallback name for empty chests.

---

_Reviewed: 2026-07-26_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: deep_
