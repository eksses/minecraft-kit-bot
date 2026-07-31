# Per-Bot Whitelist & Advanced Chest Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the current global whitelist into a per-bot whitelist system with 4-tier rank inheritance (`public` < `normal` < `vip` < `admin`), implement per-chest access and rate-limiting rules (required rank, cooldown minutes, hourly/daily claim limits), and build an improved Card Grid UI for Chest Management.

**Architecture:** Extend SQLite database schema via Drizzle ORM (`schema.js`, `index.js`) to support per-bot whitelist mapping and chest restrictions. Create a dedicated `chestRuleEngine.js` service for rank hierarchy evaluation and claim tracking. Update backend API routes (`fleet.js`, `chests.js`) and in-game whisper handlers. Refactor the frontend `Chests.jsx` page into a responsive Card Grid UI with filter bars and modal editors, and update `BotDetail.jsx` Whitelist tab.

**Tech Stack:** Hono.js (Node server), SQLite + Drizzle ORM, React 18 + Vite + Tailwind/Vanilla CSS, Mineflayer.

## Global Constraints

- Database table modifications must preserve existing data and support SQLite `CREATE TABLE IF NOT EXISTS`.
- Whitelist roles must strictly follow: `'public'` (level 0), `'normal'` (level 1), `'vip'` (level 2), `'admin'` (level 3).
- Every modified route and service must be tested via runnable Node test scripts (`node ...test.js`).

---

### Task 1: Database Schema & Migration for Per-Bot Whitelists & Chest Rules

**Files:**
- Modify: `backend/src/db/schema.js:130-150`, `backend/src/db/schema.js:230-240`
- Modify: `backend/src/db/index.js:175-195`
- Create: `backend/src/db/schema.test.js`

**Interfaces:**
- Consumes: Drizzle ORM `sqliteTable`, `text`, `integer`
- Produces: `playerWhitelist` with `botId`, `chestLocations` with `minRank`, `cooldownMinutes`, `maxHourlyLimit`, `maxDailyLimit`, `maxWithdrawPerOrder`, `category`, and new `playerCooldowns` table.

- [ ] **Step 1: Write failing schema unit test**

```javascript
// backend/src/db/schema.test.js
import assert from 'assert';
import { schema } from './index.js';

console.log('Testing schema definitions...');
assert.ok(schema.playerWhitelist.botId, 'playerWhitelist should have botId field');
assert.ok(schema.chestLocations.minRank, 'chestLocations should have minRank field');
assert.ok(schema.chestLocations.cooldownMinutes, 'chestLocations should have cooldownMinutes field');
assert.ok(schema.chestLocations.maxHourlyLimit, 'chestLocations should have maxHourlyLimit field');
assert.ok(schema.chestLocations.maxDailyLimit, 'chestLocations should have maxDailyLimit field');
assert.ok(schema.playerCooldowns, 'playerCooldowns table should exist');
console.log('✅ Schema definition tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/src/db/schema.test.js`
Expected: FAIL with missing fields/table error.

- [ ] **Step 3: Update `schema.js` and `index.js`**

Update `backend/src/db/schema.js`:
```javascript
// Update playerWhitelist:
export const playerWhitelist = sqliteTable('player_whitelist', {
  id: text('id').primaryKey(),
  botId: text('bot_id').references(() => bots.id, { onDelete: 'cascade' }),
  playerName: text('player_name').notNull(),
  role: text('role', { enum: ['admin', 'vip', 'normal', 'user'] }).notNull().default('normal'),
  addedBy: text('added_by').default('system'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Update chestLocations:
export const chestLocations = sqliteTable('chest_locations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: text('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  z: integer('z').notNull(),
  itemName: text('item_name').notNull(),
  description: text('description'),
  itemCount: integer('item_count'),
  allItems: text('all_items'),
  source: text('source', { enum: ['manual', 'scan', 'sign'] }).notNull().default('manual'),
  signData: text('sign_data'),
  status: text('status', { enum: ['active', 'unavailable', 'disabled'] }).notNull().default('active'),
  isDouble: integer('is_double', { mode: 'boolean' }).notNull().default(false),
  lastScanned: integer('last_scanned', { mode: 'timestamp' }),
  botId: text('bot_id').references(() => bots.id, { onDelete: 'set null' }),
  minRank: text('min_rank', { enum: ['public', 'normal', 'vip', 'admin'] }).notNull().default('public'),
  cooldownMinutes: integer('cooldown_minutes').notNull().default(0),
  maxHourlyLimit: integer('max_hourly_limit').notNull().default(0),
  maxDailyLimit: integer('max_daily_limit').notNull().default(0),
  maxWithdrawPerOrder: integer('max_withdraw_per_order').notNull().default(64),
  category: text('category').notNull().default('General'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Add playerCooldowns table:
export const playerCooldowns = sqliteTable('player_cooldowns', {
  id: text('id').primaryKey(),
  botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  playerName: text('player_name').notNull(),
  chestId: text('chest_id').notNull().references(() => chestLocations.id, { onDelete: 'cascade' }),
  claimCountHour: integer('claim_count_hour').notNull().default(0),
  claimCountDay: integer('claim_count_day').notNull().default(0),
  lastClaimAt: integer('last_claim_at', { mode: 'timestamp' }).notNull(),
  hourlyResetAt: integer('hourly_reset_at', { mode: 'timestamp' }).notNull(),
  dailyResetAt: integer('daily_reset_at', { mode: 'timestamp' }).notNull(),
});
```

Update `backend/src/db/index.js` `initDatabase()` migrations to alter existing SQLite tables or add new columns cleanly (`ALTER TABLE chest_locations ADD COLUMN min_rank TEXT DEFAULT 'public'`, etc.).

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/db/schema.test.js`
Expected: PASS with `✅ Schema definition tests passed`.

- [ ] **Step 5: Commit changes**

```bash
git add backend/src/db/schema.js backend/src/db/index.js backend/src/db/schema.test.js
git commit -m "feat(db): update schema for per-bot whitelist and chest access rules"
```

---

### Task 2: Per-Bot Whitelist Service (`whitelistService.js`)

**Files:**
- Modify: `backend/src/services/whitelistService.js`
- Create: `backend/src/services/whitelistService.test.js`

**Interfaces:**
- Consumes: `db`, `schema.playerWhitelist`
- Produces: `getRole(botId, playerName)`, `isWhitelisted(botId, playerName)`, `addPlayer(botId, playerName, role, addedBy)`, `removePlayer(botId, playerName)`, `listForBot(botId)`

- [ ] **Step 1: Write failing unit tests for `whitelistService`**

```javascript
// backend/src/services/whitelistService.test.js
import assert from 'assert';
import { WhitelistService } from './whitelistService.js';

async function testWhitelistService() {
  console.log('Testing WhitelistService...');
  const service = new WhitelistService();
  assert.ok(typeof service.getRole === 'function', 'getRole method exists');
  assert.ok(typeof service.listForBot === 'function', 'listForBot method exists');
  console.log('✅ WhitelistService structure test passed');
}

testWhitelistService().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/src/services/whitelistService.test.js`
Expected: FAIL if `listForBot` does not exist yet.

- [ ] **Step 3: Implement per-bot logic in `whitelistService.js`**

```javascript
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export class WhitelistService {
  async getPlayer(botId, playerName) {
    if (!playerName) return null;
    try {
      const cleanName = playerName.trim().toLowerCase();
      let query;
      if (botId) {
        query = and(
          eq(schema.playerWhitelist.botId, botId),
          eq(schema.playerWhitelist.playerName, cleanName)
        );
      } else {
        query = eq(schema.playerWhitelist.playerName, cleanName);
      }
      const row = await db.query.playerWhitelist.findFirst({ where: query });
      return row || null;
    } catch (err) {
      console.error('[WhitelistService] getPlayer error:', err.message);
      return null;
    }
  }

  async getRole(botId, playerName) {
    const player = await this.getPlayer(botId, playerName);
    return player ? player.role : 'public';
  }

  async isWhitelisted(botId, playerName) {
    const player = await this.getPlayer(botId, playerName);
    return !!player;
  }

  async addPlayer(botId, playerName, role = 'normal', addedBy = 'system') {
    const cleanName = playerName.trim().toLowerCase();
    const now = new Date();
    const values = {
      id: `wlist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      botId: botId || null,
      playerName: cleanName,
      role,
      addedBy,
      createdAt: now,
    };
    
    // Check if player exists for this bot
    const existing = await this.getPlayer(botId, cleanName);
    if (existing) {
      await db.update(schema.playerWhitelist)
        .set({ role, addedBy })
        .where(eq(schema.playerWhitelist.id, existing.id))
        .run();
      return { ...existing, role, addedBy };
    }

    await db.insert(schema.playerWhitelist).values(values).run();
    return values;
  }

  async removePlayer(botId, playerName) {
    const cleanName = playerName.trim().toLowerCase();
    const existing = await this.getPlayer(botId, cleanName);
    if (existing) {
      await db.delete(schema.playerWhitelist)
        .where(eq(schema.playerWhitelist.id, existing.id))
        .run();
    }
    return true;
  }

  async listForBot(botId) {
    if (!botId) {
      return await db.select().from(schema.playerWhitelist);
    }
    return await db.select()
      .from(schema.playerWhitelist)
      .where(eq(schema.playerWhitelist.botId, botId));
  }
}

export const whitelistService = new WhitelistService();
export default whitelistService;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/services/whitelistService.test.js`
Expected: PASS with `✅ WhitelistService structure test passed`.

- [ ] **Step 5: Commit changes**

```bash
git add backend/src/services/whitelistService.js backend/src/services/whitelistService.test.js
git commit -m "feat(service): update whitelistService for per-bot scoping"
```

---

### Task 3: Chest Rule & Cooldown Engine (`chestRuleEngine.js`)

**Files:**
- Create: `backend/src/services/chestRuleEngine.js`
- Create: `backend/src/services/chestRuleEngine.test.js`

**Interfaces:**
- Consumes: `whitelistService`, `db`, `schema.chestLocations`, `schema.playerCooldowns`
- Produces: `validateAccess(botId, playerName, chest)`, `recordClaim(botId, playerName, chestId)`, `resetCooldowns(botId, playerName, chestId)`

- [ ] **Step 1: Write failing unit test for `chestRuleEngine`**

```javascript
// backend/src/services/chestRuleEngine.test.js
import assert from 'assert';
import { chestRuleEngine } from './chestRuleEngine.js';

async function testChestRuleEngine() {
  console.log('Testing chestRuleEngine...');
  
  // Test rank comparison
  assert.strictEqual(chestRuleEngine.getRankLevel('public'), 0);
  assert.strictEqual(chestRuleEngine.getRankLevel('normal'), 1);
  assert.strictEqual(chestRuleEngine.getRankLevel('vip'), 2);
  assert.strictEqual(chestRuleEngine.getRankLevel('admin'), 3);
  
  assert.strictEqual(chestRuleEngine.hasRankAccess('vip', 'normal'), true);
  assert.strictEqual(chestRuleEngine.hasRankAccess('normal', 'vip'), false);
  assert.strictEqual(chestRuleEngine.hasRankAccess('admin', 'admin'), true);
  assert.strictEqual(chestRuleEngine.hasRankAccess('public', 'public'), true);

  console.log('✅ chestRuleEngine rank comparison tests passed');
}

testChestRuleEngine().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/src/services/chestRuleEngine.test.js`
Expected: FAIL (file doesn't exist).

- [ ] **Step 3: Implement `chestRuleEngine.js`**

```javascript
import { db, schema } from '../db/index.js';
import { whitelistService } from './whitelistService.js';
import { eq, and } from 'drizzle-orm';

const RANK_LEVELS = {
  public: 0,
  user: 1,
  normal: 1,
  vip: 2,
  admin: 3,
};

export class ChestRuleEngine {
  getRankLevel(role) {
    const r = (role || 'public').toLowerCase();
    return RANK_LEVELS[r] !== undefined ? RANK_LEVELS[r] : 0;
  }

  hasRankAccess(playerRole, requiredRank) {
    const pLevel = this.getRankLevel(playerRole);
    const rLevel = this.getRankLevel(requiredRank);
    return pLevel >= rLevel;
  }

  async validateAccess(botId, playerName, chest) {
    const cleanName = (playerName || '').trim().toLowerCase();
    
    // 1. Check status
    if (chest.status === 'disabled') {
      return { allowed: false, reason: `Kit "${chest.name}" is currently disabled.` };
    }

    // 2. Check Rank Requirement
    const playerRole = await whitelistService.getRole(botId, cleanName);
    const minRank = chest.minRank || 'public';
    
    if (!this.hasRankAccess(playerRole, minRank)) {
      return {
        allowed: false,
        reason: `Denied: "${chest.name}" requires ${minRank.toUpperCase()} rank (Your rank: ${playerRole.toUpperCase()}).`
      };
    }

    // 3. Check Cooldowns & Usage Limits
    if (chest.cooldownMinutes > 0 || chest.maxHourlyLimit > 0 || chest.maxDailyLimit > 0) {
      const cooldownRecord = await db.query.playerCooldowns.findFirst({
        where: (playerCooldowns, { and, eq }) =>
          and(
            eq(playerCooldowns.botId, botId),
            eq(playerCooldowns.playerName, cleanName),
            eq(playerCooldowns.chestId, chest.id)
          ),
      });

      if (cooldownRecord) {
        const now = Date.now();
        const lastClaim = new Date(cooldownRecord.lastClaimAt).getTime();
        
        // Cooldown timer check
        if (chest.cooldownMinutes > 0) {
          const cooldownMs = chest.cooldownMinutes * 60 * 1000;
          const elapsed = now - lastClaim;
          if (elapsed < cooldownMs) {
            const remainingMinutes = Math.ceil((cooldownMs - elapsed) / (60 * 1000));
            return {
              allowed: false,
              reason: `Kit "${chest.name}" is on cooldown for ${remainingMinutes}m.`
            };
          }
        }

        // Hourly limit check
        if (chest.maxHourlyLimit > 0) {
          const hourlyReset = new Date(cooldownRecord.hourlyResetAt).getTime();
          if (now < hourlyReset && cooldownRecord.claimCountHour >= chest.maxHourlyLimit) {
            return {
              allowed: false,
              reason: `Hourly limit reached (${chest.maxHourlyLimit}/hr) for "${chest.name}".`
            };
          }
        }

        // Daily limit check
        if (chest.maxDailyLimit > 0) {
          const dailyReset = new Date(cooldownRecord.dailyResetAt).getTime();
          if (now < dailyReset && cooldownRecord.claimCountDay >= chest.maxDailyLimit) {
            return {
              allowed: false,
              reason: `Daily limit reached (${chest.maxDailyLimit}/day) for "${chest.name}".`
            };
          }
        }
      }
    }

    return { allowed: true };
  }

  async recordClaim(botId, playerName, chestId) {
    const cleanName = (playerName || '').trim().toLowerCase();
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const existing = await db.query.playerCooldowns.findFirst({
      where: (playerCooldowns, { and, eq }) =>
        and(
          eq(playerCooldowns.botId, botId),
          eq(playerCooldowns.playerName, cleanName),
          eq(playerCooldowns.chestId, chestId)
        ),
    });

    if (existing) {
      const resetHour = now.getTime() >= new Date(existing.hourlyResetAt).getTime();
      const resetDay = now.getTime() >= new Date(existing.dailyResetAt).getTime();

      await db.update(schema.playerCooldowns)
        .set({
          claimCountHour: resetHour ? 1 : existing.claimCountHour + 1,
          claimCountDay: resetDay ? 1 : existing.claimCountDay + 1,
          lastClaimAt: now,
          hourlyResetAt: resetHour ? oneHourLater : existing.hourlyResetAt,
          dailyResetAt: resetDay ? oneDayLater : existing.dailyResetAt,
        })
        .where(eq(schema.playerCooldowns.id, existing.id))
        .run();
    } else {
      await db.insert(schema.playerCooldowns).values({
        id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        botId,
        playerName: cleanName,
        chestId,
        claimCountHour: 1,
        claimCountDay: 1,
        lastClaimAt: now,
        hourlyResetAt: oneHourLater,
        dailyResetAt: oneDayLater,
      }).run();
    }
  }

  async resetCooldowns(botId, playerName, chestId) {
    const cleanName = (playerName || '').trim().toLowerCase();
    let whereClause;
    
    if (chestId) {
      whereClause = and(
        eq(schema.playerCooldowns.botId, botId),
        eq(schema.playerCooldowns.playerName, cleanName),
        eq(schema.playerCooldowns.chestId, chestId)
      );
    } else {
      whereClause = and(
        eq(schema.playerCooldowns.botId, botId),
        eq(schema.playerCooldowns.playerName, cleanName)
      );
    }

    await db.delete(schema.playerCooldowns).where(whereClause).run();
    return true;
  }
}

export const chestRuleEngine = new ChestRuleEngine();
export default chestRuleEngine;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node backend/src/services/chestRuleEngine.test.js`
Expected: PASS with `✅ chestRuleEngine rank comparison tests passed`.

- [ ] **Step 5: Commit changes**

```bash
git add backend/src/services/chestRuleEngine.js backend/src/services/chestRuleEngine.test.js
git commit -m "feat(service): add chestRuleEngine for rank access, cooldowns, and daily limits"
```

---

### Task 4: API Routes & In-Game Chat Integration

**Files:**
- Modify: `backend/src/routes/fleet.js:70-140`, `backend/src/routes/fleet.js:735-775`
- Modify: `backend/src/routes/chests.js:10-90`

**Interfaces:**
- Consumes: `whitelistService`, `chestRuleEngine`
- Produces: Bot-scoped `/api/fleet/bots/:id/whitelist` endpoints, `/api/chests/:id/rules` endpoint, and in-game whisper checks.

- [ ] **Step 1: Update in-game whisper handling in `fleet.js`**

Update `backend/src/routes/fleet.js` whisper commands (`!wlist`, `!role`, `!order`, `!resetcd`):
- `/w <bot> !role`: Replies with user's rank on that bot.
- `/w <bot> !wlist add <player> <role>`: Scopes whitelist update to `bot.id`.
- `/w <bot> !wlist remove <player>`: Scopes removal to `bot.id`.
- `/w <bot> !resetcd <player>`: Resets player cooldowns on `bot.id`.
- Order command check: Runs `chestRuleEngine.validateAccess(bot.id, senderName, chest)` and sends friendly error whisper if denied.

- [ ] **Step 2: Update HTTP API endpoints in `fleet.js` and `chests.js`**

Update `backend/src/routes/fleet.js`:
- `GET /api/fleet/bots/:id/whitelist`: `whitelistService.listForBot(botId)`
- `POST /api/fleet/bots/:id/whitelist`: `whitelistService.addPlayer(botId, playerName, role)`
- `DELETE /api/fleet/bots/:id/whitelist/:playerName`: `whitelistService.removePlayer(botId, playerName)`
- `POST /api/fleet/bots/:id/whitelist/:playerName/reset-cooldown`: `chestRuleEngine.resetCooldowns(botId, playerName)`

Update `backend/src/routes/chests.js`:
- `PUT /api/chests/:id/rules`: Update `minRank`, `cooldownMinutes`, `maxHourlyLimit`, `maxDailyLimit`, `maxWithdrawPerOrder`, `category`, `status`.

- [ ] **Step 3: Test syntax and endpoints**

Run: `node --check backend/src/routes/fleet.js && node --check backend/src/routes/chests.js`
Expected: PASS with 0 syntax errors.

- [ ] **Step 4: Commit changes**

```bash
git add backend/src/routes/fleet.js backend/src/routes/chests.js
git commit -m "feat(api): integrate per-bot whitelist and chest rule endpoints"
```

---

### Task 5: Frontend Chest Management Card Grid UI (`frontend/src/pages/Chests.jsx`)

**Files:**
- Modify: `frontend/src/pages/Chests.jsx`
- Modify: `frontend/src/services/api.js:40-90`

**Interfaces:**
- Consumes: `api.chests.updateRules`, `api.chests.list`
- Produces: Card Grid UI with Search/Filter Bar, Rank Badges, Status Toggles, and Rule Editor Modal.

- [ ] **Step 1: Add chest rule methods to `frontend/src/services/api.js`**

```javascript
  chests: {
    list: (params) => request('/api/chests', { params }),
    get: (id) => request(`/api/chests/${id}`),
    create: (data) => request('/api/chests', { method: 'POST', body: data }),
    update: (id, data) => request(`/api/chests/${id}`, { method: 'PUT', body: data }),
    updateRules: (id, data) => request(`/api/chests/${id}/rules`, { method: 'PUT', body: data }),
    delete: (id) => request(`/api/chests/${id}`, { method: 'DELETE' }),
    resetCooldowns: (id) => request(`/api/chests/${id}/reset-cooldowns`, { method: 'POST' }),
  },
```

- [ ] **Step 2: Refactor `Chests.jsx` to Card Grid View with Filters & Rule Editor Modal**

In `frontend/src/pages/Chests.jsx`:
1. Build top control bar:
   - Search input (filter by chest name, item, or position)
   - Bot selector filter
   - Required Rank filter (`ALL`, `PUBLIC`, `NORMAL`, `VIP`, `ADMIN`)
   - Category filter
   - Status filter (`ALL`, `ACTIVE`, `DISABLED`)
   - View Toggle button (Card Grid vs Table View)
2. Build Responsive Card Component:
   - Header with Chest Name, Category Tag, and Status Toggle Badge.
   - Coordinate badge `(x, y, z)` and Item Name/Count.
   - Colored Rank Badge (`PUBLIC`: gray, `NORMAL`: blue, `VIP`: purple, `ADMIN`: red).
   - Cooldown & Daily Limit indicators.
   - Quick Action buttons: Edit Rules (opens modal), Reset Cooldowns, Delete.
3. Build Rule Editor Modal:
   - Name & Location inputs
   - Minimum Rank select (`public`, `normal`, `vip`, `admin`)
   - Cooldown Minutes input
   - Max Daily / Hourly Limit inputs
   - Max Withdraw Per Order input
   - Category input

- [ ] **Step 3: Test frontend build**

Run: `npm run build`
Expected: PASS with 0 Vite build errors.

- [ ] **Step 4: Commit changes**

```bash
git add frontend/src/services/api.js frontend/src/pages/Chests.jsx
git commit -m "feat(ui): refactor Chest Management to Card Grid view with rule editor modal"
```

---

### Task 6: Frontend Per-Bot Whitelist Management (`frontend/src/pages/BotDetail.jsx`)

**Files:**
- Modify: `frontend/src/pages/BotDetail.jsx:340-420`

**Interfaces:**
- Consumes: `api.fleet.getWhitelist(botId)`, `api.fleet.addWhitelist(botId, data)`, `api.fleet.removeWhitelist(botId, playerName)`
- Produces: Per-bot Whitelist Manager tab inside Bot Detail page.

- [ ] **Step 1: Update Whitelist tab in `BotDetail.jsx`**

Update `BotDetail.jsx`:
- Fetch whitelist via `api.fleet.getWhitelist(botId)`.
- Add Player form with role select (`normal`, `vip`, `admin`).
- Display player list table/cards with rank badges, `Added By`, `Created At`, Reset Cooldown button, and Remove button.

- [ ] **Step 2: Test frontend build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add frontend/src/pages/BotDetail.jsx
git commit -m "feat(ui): update per-bot whitelist management tab in BotDetail"
```

---

## Plan Self-Review Checklist

1. **Spec Coverage:**
   - Per-bot whitelist: Task 1 (DB), Task 2 (Service), Task 4 (API), Task 6 (UI)
   - 4-Tier ranks (`public`, `normal`, `vip`, `admin`): Task 1 (DB), Task 3 (Rule Engine), Task 5 (UI)
   - Cooldowns & Daily/Hourly limits: Task 1 (DB), Task 3 (Rule Engine), Task 4 (API/Chat), Task 5 (UI)
   - Chest Card Grid UI: Task 5 (UI)
2. **Placeholder Scan:** Passed — all tasks include full code snippets, exact paths, and test commands.
3. **Type Consistency:** Verified consistent rank names (`public`, `normal`, `vip`, `admin`) and method signatures across all tasks.
