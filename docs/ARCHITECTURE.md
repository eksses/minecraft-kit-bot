# Architecture & Module Details — MDB v3.0

## Project Structure

```
minecraft-kit-bot/
├── backend/                    # Hono API Server
│   └── src/
│       ├── index.js           # Entry point, binds 0.0.0.0:8081
│       ├── app.js             # Hono app factory with CORS, sessions
│       ├── db/                # SQLite + Drizzle ORM
│       │   ├── schema.js      # 8 tables defined
│       │   └── index.js       # Auto-migration, default user creation
│       ├── services/
│       │   ├── botLifecycle.js    # Worker thread bot isolation
│       │   ├── chest-scanner.js   # Pathfinding-based chest discovery
│       │   ├── swarmCoordinator.js # Task queue, load balancing, failover
│       │   └── realtime.js        # WebSocket server for live updates
│       ├── routes/
│       │   ├── auth.js        # Session auth, user management, RBAC
│       │   └── fleet.js       # Fleet API (servers, bots, swarms, tasks)
│       ├── middleware/
│       │   └── session.js     # Cookie-based session validation
│       └── utils/
│           └── sign-parser.js # Sign text parsing utility
├── frontend/                   # React SPA + PWA
│   └── src/
│       ├── main.jsx           # Entry (AuthProvider + ToastProvider + BrowserRouter)
│       ├── App.jsx            # Router with protected routes
│       ├── index.css          # Obsidian Command design system
│       ├── context/
│       │   └── AuthContext.jsx # Cookie-based auth, handles {user:{}} response
│       ├── services/
│       │   └── api.js         # API client with fleet endpoints
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── Layout.jsx     # App shell (sidebar + main + bottom nav)
│       │   │   ├── Sidebar.jsx    # Desktop sidebar (280px, Lucide icons)
│       │   │   ├── BottomNav.jsx  # Mobile bottom nav (4 items + More)
│       │   │   └── MoreSheet.jsx  # Mobile nav sheet (full list + logout)
│       │   ├── ui/
│       │   │   └── StatusComponents.jsx # StatusBadge, HealthBar, FoodBar, BotCard
│       │   └── ToastContainer.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── FleetDashboard.jsx
│           ├── BotControl.jsx
│           ├── BotDetail.jsx      # Per-bot control panel (5 tabs)
│           ├── SwarmController.jsx
│           ├── TaskQueue.jsx
│           ├── ServerManager.jsx
│           └── Settings.jsx
├── .planning/                  # Project planning documents
├── docs/                       # Documentation
├── data/
│   └── mcdb.db                 # SQLite database
├── .env                        # Environment config
├── package.json                # Root package.json (npm run dev/start/build)
└── README.md
```

## Database Schema (SQLite + Drizzle ORM)

8 tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles (admin/operator/viewer) |
| `servers` | Minecraft server configurations |
| `bots` | Bot instances (name, username, server, status, auth settings) |
| `swarms` | Bot groups with load balancing config |
| `bot_swarms` | Many-to-many: bots ↔ swarms |
| `delivery_queue` | Task queue (type, status, assigned bot, details) |
| `swarm_memory` | Persistent swarm coordination state |
| `bot_logs` | Bot event logs |

### Bot Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | TEXT | Bot display name |
| `username` | TEXT | Minecraft username |
| `server_host` | TEXT | Server IP/hostname (direct connection) |
| `server_port` | INTEGER | Server port (default 25565) |
| `server_version` | TEXT | Minecraft version ('auto' for auto-detect) |
| `auth_mode` | TEXT | ONLINE (premium) or OFFLINE (cracked) |
| `auth_password` | TEXT | Login password for offline servers |
| `status` | TEXT | ONLINE, OFFLINE, CONNECTING, ERROR |

## Backend Architecture

### BotLifecycleManager

Each bot runs in an isolated **worker thread**:
- Auto-reconnect with exponential backoff
- Pathfinder plugin loaded after spawn
- Movements set inside `spawn` event handler
- Status streamed via WebSocket every 5s
- Offline auth: executes `/login <password>` on spawn

### ChestScanner Service

- Pathfinding-based chest discovery
- Sign text parsing (#Key:Value format)
- Per-bot scan configuration
- WebSocket progress updates
- Auto-rescan after deliveries

### SwarmCoordinator

- **Task Allocation:** NEAREST, LEAST_BUSY, ROUND_ROBIN
- **Atomic Locking:** Prevents double-assignment
- **Failover:** Failed tasks auto-requeue
- **Dead Letter:** Unrecoverable tasks marked as FAILED

### RealtimeServer

WebSocket server on same HTTP server:
- Bot status streaming (health, food, position, inventory)
- Chat message relay
- Scan progress updates
- Heartbeat/ping-pong keepalive

### Fleet API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/fleet/dashboard` | GET | Fleet overview stats |
| `/api/fleet/servers` | GET/POST | Server CRUD |
| `/api/fleet/servers/:id` | DELETE | Delete server |
| `/api/fleet/bots` | GET/POST | Bot CRUD |
| `/api/fleet/bots/:id` | GET | Bot details |
| `/api/fleet/bots/:id/start` | POST | Start bot |
| `/api/fleet/bots/:id/stop` | POST | Stop bot |
| `/api/fleet/bots/:id/command` | POST | Send command |
| `/api/fleet/bots/:id/inventory` | GET | Bot inventory |
| `/api/fleet/bots/:id/logs` | GET | Bot logs |
| `/api/fleet/swarms` | GET/POST | Swarm CRUD |
| `/api/fleet/swarms/:id` | DELETE | Delete swarm |
| `/api/fleet/swarms/:id/members` | POST | Add bot to swarm |
| `/api/fleet/swarms/:id/members/:botId` | DELETE | Remove bot |
| `/api/fleet/tasks` | GET/POST | Task queue |
| `/api/fleet/tasks/:id/cancel` | POST | Cancel task |
| `/api/fleet/chests` | GET/POST | Chest locations |
| `/api/fleet/chests/:id` | DELETE | Delete chest |
| `/api/fleet/chests/:botId/scan` | POST | Trigger scan |
| `/api/fleet/chests/:botId/scan-status` | GET | Get scan status |
| `/api/fleet/chests/:botId/scan-config` | GET/PUT | Scan configuration |
| `/api/fleet/memory` | GET/POST | Swarm memory |

## Frontend Architecture

### Design System: Obsidian Command

- **Background:** `#141313`
- **Surface:** `#201f1f`
- **Border:** `#2a2a2a`
- **Primary:** `#ffffff`
- **Status Online:** `#00ff41`
- **Status Warning:** `#ffb000`
- **Status Error:** `#ff3131`
- **Corner Radius:** 0px (sharp)
- **Shadows:** None
- **Typography:** Inter + JetBrains Mono
- **Touch Targets:** 48px minimum

### Pages

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | Centered card login form |
| Fleet Dashboard | `/fleet` | Stats grid, bot list, swarm list |
| Bots | `/fleet/bots` | Bot CRUD with inline server fields |
| Bot Detail | `/fleet/bots/:id` | Per-bot control panel (5 tabs) |
| Servers | `/fleet/servers` | Server configuration cards |
| Swarms | `/fleet/swarms` | Two-column swarm management |
| Tasks | `/fleet/tasks` | Filter chips, task cards |
| Settings | `/settings` | User management table |

### Navigation

- **Desktop:** Fixed 280px sidebar with Lucide icons
- **Mobile:** Bottom nav (Dashboard, Bots, Tasks, More) + MoreSheet with full nav list
- **Bot Detail:** Bottom tab bar (Console, Chests, Inventory, Settings, Logs)

## Data Flow

### Bot Start Flow (Direct Connection)

1. User creates bot with server IP, port, version, auth mode
2. Frontend calls `api.fleet.createBot()` with server fields
3. Backend stores bot with server connection details
4. User clicks Start → `api.fleet.startBot(botId)`
5. Backend spawns worker thread with server connection params
6. Worker connects to Minecraft server
7. On spawn: if offline mode, executes `/login <password>`
8. Status streamed via WebSocket

### Chest Scan Flow

1. User triggers scan on BotDetail page
2. Frontend calls `api.chests.triggerScan(botId, radius)`
3. Backend starts ChestScanner in worker thread
4. Scanner pathfinds to chests, reads signs, stores locations
5. Progress streamed via WebSocket
6. Chests displayed on BotDetail page

### Auth Flow

1. User submits credentials on `/login`
2. Backend validates against `users` table
3. Session cookie set (HttpOnly, Secure, SameSite=Lax)
4. `/api/auth/me` returns `{ user: { id, username, role } }`
5. Frontend unwraps with `res.user || res`

## Security

- Session cookies: HttpOnly, Secure (production), SameSite=Lax
- Role-based access control (admin/operator/viewer)
- No third-party auth (no OAuth, Firebase, etc.)
- No biometrics/WebAuthn
- Passwords stored as bcrypt hash
- CORS configurable via `CORS_ORIGINS` env var

## Deployment

### Development

```bash
npm run dev    # Runs backend (--watch) + frontend (vite --host)
```

### Production

```bash
npm run build  # Builds frontend to frontend/dist
npm start      # Starts backend (HOST=0.0.0.0 PORT=8081)
```

### Public Access

Server binds to `0.0.0.0` for public access:
- Frontend: `http://103.151.60.212:5173`
- Backend API: `http://103.151.60.212:8081`
