# Plans & Discussion — Minecraft Kit Delivery Bot

This document discusses the architectural plans, rationale, and design decisions for the future roadmap of MDB.

---

## Why We Need These Changes

### The Problem with the Current Architecture

The current codebase works for a single bot on a single server. But as soon as you want to:

- Run multiple bots for different servers or bases
- Add a Discord integration alongside the web UI
- Let different users have different levels of access
- Deploy without manual restarts after every crash

...the codebase shows its limitations. The monolithic structure, flat-file database, and lack of modularity make each of these changes difficult and fragile.

### What We Want Instead

A system that is:

1. **Modular** — Every feature is a self-contained module. Adding Discord support takes a module, not a rewrite.
2. **Scalable** — Run one bot or fifty bots from a single dashboard.
3. **Resilient** — The backend never crashes silently. It restarts, reports, and recovers.
4. **Accessible** — A modern React SPA that works on mobile and desktop with push notifications.
5. **Secure** — Role-based access so not everyone can delete chests or restart the bot.
6. **Extensible** — A clear integration interface that anyone can implement for a new platform.

---

## Detailed Plans

### Plan 1: Modular Backend

**Philosophy:** Feature-based modules, not layer-based.

Instead of organizing by technical layer (routes → services → models), we organize by feature (chest, kit, bot, auth). Each feature has its own directory with all the code it needs: routes, service logic, validation, and tests.

```
backend/
├── features/
│   ├── auth/
│   │   ├── routes.js
│   │   ├── middleware.js
│   │   ├── service.js
│   │   └── tests/
│   ├── chest/
│   │   ├── routes.js
│   │   ├── service.js
│   │   ├── validator.js
│   │   └── tests/
│   ├── bot/
│   │   ├── service.js
│   │   ├── lifecycle.js
│   │   └── tests/
│   └── integration/
│       ├── router.js
│       ├── base.js
│       ├── discord/
│       │   ├── index.js
│       │   ├── commands.js
│       │   └── events.js
│       └── telegram/
│           ├── index.js
│           └── commands.js
├── shared/
│   ├── logger.js
│   ├── database.js
│   ├── errors.js
│   └── middleware.js
└── server.js  # Thin entry point — just starts the server
```

**Why this matters:** When someone wants to add Telegram support, they look at `features/integration/telegram/` — there's already a Discord integration there to follow. When they want to change how bot lifecycle works, they go to `features/bot/`. Everything is self-contained.

### Plan 2: Plugin-Based Integration System

**Philosophy:** Integrations are plugins. They implement a defined interface and register themselves.

The integration base module defines three lifecycle hooks:

```javascript
// integrations/base.js
module.exports = {
  name: 'discord',
  onStart(bot, config) { /* initialize */ },
  onMessage(bot, message) { /* handle message */ },
  onEvent(bot, event) { /* handle bot events */ },
  onStop(bot) { /* cleanup */ }
};
```

The integration router in `server.js` discovers all integrations from a directory, starts them with the bot instance and config, and routes incoming messages/events to the right integration.

**Why this matters:** Adding a new platform never requires modifying core code. Drop in a new folder, implement the interface, and it works.

### Plan 3: Multi-Bot Architecture

**Philosophy:** One process, many bots. Each bot instance is isolated.

The current codebase runs one bot. The new architecture tracks multiple bot instances:

```javascript
// Each bot has its own config
const bots = {
  'bot-1': {
    config: { host: '6b6t.org', ... },
    instance: mineflayer.createBot({ ... }),
    chests: Map,
    status: 'online'
  },
  'bot-2': {
    config: { host: '2b2t.org', ... },
    instance: mineflayer.createBot({ ... }),
    chests: Map,
    status: 'online'
  }
};
```

The dashboard shows all bots with their status. Users can switch between bots or view a combined view.

**Bot Swarm Mode:** Multiple bots can connect to the same server and coordinate. For example, one bot handles kit delivery while another handles chat moderation.

**Why this matters:** People can run bots for multiple servers from one dashboard. Server admins can run a bot swarm for redundancy and load distribution.

### Plan 4: Database Migration

**Philosophy:** Start with SQLite, Turso, Neon Postgres, MySQL, or PostgreSQL — choose based on deployment needs.

**Schema Design:**

```sql
-- Bot instances
 CREATE TABLE bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 25565,
  username TEXT NOT NULL,
  password TEXT,
  version TEXT DEFAULT '1.17',
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chest locations
CREATE TABLE chests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT REFERENCES bots(id),
  name TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  z INTEGER NOT NULL,
  item TEXT NOT NULL,
  UNIQUE(bot_id, name)
);

-- Users and roles
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order history
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT REFERENCES bots(id),
  chest_id INTEGER REFERENCES chests(id),
  player TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Migration Path:** The flat JSON file is still readable. On first startup, the system reads `chestData.json` and imports the data into the database. After that, all operations go through the database.

### Plan 5: React.js + PWA Frontend

**Philosophy:** Component-driven, mobile-first, PWA-native experience.

**Component Architecture:**

```
frontend/
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # App icons
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Layout.jsx
│   │   ├── Dashboard/
│   │   │   ├── BotStatus.jsx
│   │   │   ├── StatsWidget.jsx
│   │   │   └── AlertsWidget.jsx
│   │   ├── ChestManager/
│   │   │   ├── ChestList.jsx
│   │   │   ├── ChestForm.jsx
│   │   │   └── ChestCard.jsx
│   │   ├── KitOrder/
│   │   │   ├── KitList.jsx
│   │   │   ├── OrderForm.jsx
│   │   │   └── OrderHistory.jsx
│   │   ├── Integrations/
│   │   │   ├── IntegrationList.jsx
│   │   │   └── IntegrationConfig.jsx
│   │   ├── UserManagement/
│   │   │   ├── UserList.jsx
│   │   │   └── RolePicker.jsx
│   │   └── Notifications/
│   │       ├── NotificationCenter.jsx
│   │       └── Toast.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useBots.js
│   │   ├── useChests.js
│   │   └── useNotifications.js
│   ├── services/
│   │   ├── api.js          # API client
│   │   ├── auth.js         # Auth client
│   │   └── ws.js           # WebSocket client
│   ├── store/              # Zustand store
│   │   ├── authStore.js
│   │   ├── botStore.js
│   │   └── chestStore.js
│   ├── utils/
│   │   ├── theme.js
│   │   └── validators.js
│   ├── App.jsx
│   └── main.jsx
```

**Responsive Design Strategy:**

- **Mobile (< 768px):** Bottom navigation, full-screen pages, touch-optimized controls, collapsible sidebar as a hamburger menu
- **Tablet (768–1024px):** Collapsible sidebar, two-column layouts, medium-sized cards
- **Desktop (> 1024px):** Persistent sidebar, multi-column dashboards, expanded data tables, hover tooltips

**PWA Features:**

- Works offline (cached UI and last-fetched data)
- Installable on home screen (iOS, Android, Desktop)
- Push notifications for order confirmations, bot status changes, and alerts
- Background sync — queue orders when offline, send when connection returns

**Why React.js:**

- Component reusability — a `ChestCard` used in the manager page can also be reused in a notification
- Ecosystem — React Router for navigation, Zustand for lightweight state, TanStack Query for server state
- PWA support — libraries like `vite-plugin-pwa` handle service workers and manifests
- Community and hiring pool — easiest to find React developers

### Plan 6: Push Notifications

**Philosophy:** Users should know what's happening without checking the dashboard.

**Notification Triggers:**

| Event | Delivery | Priority |
|-------|----------|----------|
| Kit ordered successfully | Push + In-app | Normal |
| Kit order failed | Push + In-app | High |
| Bot went offline | Push + In-app | Critical |
| Bot came back online | Push + In-app | Normal |
| New chest added | In-app only | Low |
| Integration connected | In-app only | Low |

**Implementation:**

- **Browser Push:** Web Push API with VAPID keys, background service worker
- **Mobile Install:** PWA install prompt triggers notification permission on first launch
- **In-App:** Toast notifications and notification center panel

### Plan 7: Role-Based Access Control (RBAC)

**Roles and Permissions:**

| Action | Admin | Operator | Viewer |
|--------|-------|----------|--------|
| View dashboard | Yes | Yes | Yes |
| View bot status | Yes | Yes | Yes |
| Start/stop/restart bot | Yes | Yes | No |
| Add/edit/delete chests | Yes | Yes | No |
| Order kits | Yes | Yes | No |
| Manage users | Yes | No | No |
| Manage integrations | Yes | No | No |
| View audit logs | Yes | No | No |
| Update .env/config | Yes | No | No |

**Implementation:**

- Permissions stored in the database
- Middleware checks role before allowing access to each route
- Frontend hides UI elements based on role (but server still enforces it)
- Audit log records every action with user, timestamp, and action details

---

## Discussion

### Should we keep JSON support alongside the database?

**Yes.** The database is the primary storage, but JSON export/import should remain supported for:

- Backup and migration
- Quick sharing of chest configs between instances
- CI/CD pipeline configuration (e.g., `chestData.json` in a repo as starting config)

### Should PM2 be required?

**No, but recommended.** The system should work with Node.js directly for development. PM2 is an optional production process manager. The install script should offer to install PM2 as an option.

### What about the existing install.sh?

The install script stays but is updated to:
1. Install PM2 alongside Node.js
2. Support both single-bot and multi-bot setup
3. Generate React frontend build as part of installation
4. Set up proper SSL and HTTPS defaults

### How do we handle backward compatibility?

- The API endpoints remain compatible (same request/response shapes)
- `chestData.json` is auto-imported on first database migration
- The web dashboard stays accessible during the transition
- Version migration scripts handle database schema changes

### What's the minimum viable implementation for Milestone 1?

The minimum change to get a modular backend:

1. Create `routes/` directory and move Express routes into separate files
2. Create `services/` directory and extract business logic from routes
3. Keep `server.js` as a thin entry point (under 50 lines)
4. Add `app.use('/auth', authRoutes)` style mounting
5. Keep the same database (flat JSON) for now — database migration is Milestone 2

This alone makes a huge difference for contributors. New features go in new files, not by editing a 300-line server.js.
