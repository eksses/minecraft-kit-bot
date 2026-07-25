# Architecture & Module Details

## Project Structure

```
minecraft-kit-bot/
├── backend/                    # Hono backend
│   └── src/
│       ├── index.js           # Entry point, HTTP + WS server
│       ├── app.js             # App factory, routes
│       ├── services/          # Business logic
│       │   ├── bot.js         # Mineflayer bot service
│       │   ├── chest.js       # Chest data service
│       │   ├── kit.js         # Kit ordering service
│       │   ├── config.js      # Configuration service
│       │   └── websocket.js   # WebSocket handler
│       ├── routes/            # API routes
│       │   ├── auth.js        # Authentication
│       │   ├── bot.js         # Bot control
│       │   ├── chests.js      # Chest CRUD
│       │   ├── kits.js        # Kit ordering
│       │   ├── config.js      # Configuration
│       │   └── integrations.js # Platform integrations
│       ├── middleware/        # Custom middleware
│       │   └── session.js     # Session management
│       └── utils/             # Utilities
├── frontend/                   # React PWA
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Routes & providers
│   │   ├── context/           # React context
│   │   │   └── AuthContext.tsx
│   │   ├── components/        # Reusable components
│   │   │   ├── Layout/        # Layout with sidebar
│   │   │   └── ToastContainer.tsx
│   │   ├── pages/             # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ChestManager.tsx
│   │   │   ├── KitOrder.tsx
│   │   │   ├── BotControl.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/          # API client
│   │   │   └── api.ts
│   │   ├── store/             # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── botStore.ts
│   │   │   └── chestStore.ts
│   │   ├── styles/            # CSS
│   │   │   └── main.css
│   │   ├── index.css          # Global styles
│   │   └── vite-env.d.ts
│   ├── vite.config.ts         # Vite + PWA config
│   ├── index.html
│   └── package.json
├── chestData.json              # Chest database (JSON)
├── .env.example                # Environment template
├── package.json                # Root package.json
└── docs/                       # Documentation
```

## Backend Architecture

### Services

**BotService** (`backend/src/services/bot.js`)
- Manages Mineflayer bot lifecycle
- Handles pathfinding to chests
- Processes item withdrawal and TPA
- Emits events: chat, whisper, error, end

**ChestService** (`backend/src/services/chest.js`)
- File-based JSON storage for chests
- CRUD operations with validation
- Auto-save on mutations

**KitService** (`backend/src/services/kit.js`)
- Orders kits using bot service
- Tracks order history
- Uses BotService.takeItemFromChest()

**ConfigService** (`backend/src/services/config.js`)
- Loads/parses .env file
- Provides bot, server, UI credentials
- Runtime config updates with auto-reload

**WebSocketHandler** (`backend/src/services/websocket.js`)
- Manages WebSocket connections
- Forwards bot chat to clients
- Heartbeat/ping-pong for keepalive

### Routes

All routes under `/api/*` with session auth:

| Route | Methods | Description |
|-------|---------|-------------|
| `/auth/login` | POST | Session login |
| `/auth/logout` | POST | Destroy session |
| `/auth/me` | GET | Current user |
| `/bot/status` | GET | Bot online status |
| `/bot/leave` | POST | Bot leaves server |
| `/bot/restart` | POST | Restart bot |
| `/chests` | GET | List all chests |
| `/chests` | POST | Create chest |
| `/chests/:name` | PUT | Update chest |
| `/chests/:name` | DELETE | Delete chest |
| `/kits/order` | POST | Order kit for player |
| `/kits/available` | GET | Available chests |
| `/config` | GET/POST | Get/update config |

### Session Middleware

Custom cookie-based session (`backend/src/middleware/session.js`):
- HttpOnly, Secure (production), SameSite=Lax
- 7-day expiry
- Validates against UI credentials from config

## Frontend Architecture

### State Management (Zustand)

**authStore** - Authentication state
- user, isAuthenticated, isLoading
- login(), logout(), checkAuth()

**botStore** - Bot status & info
- status (online/offline/connecting)
- username, server
- chests, orders

**chestStore** - Chest data
- chests object, isLoading, error
- fetchChests(), saveChest(), updateChest(), deleteChest()

### API Client

Centralized in `frontend/src/services/api.ts`:
- Auto-includes credentials (cookies)
- JSON request/response handling
- Error normalization

### Components

**Layout** (`components/Layout/Layout.jsx`)
- Responsive sidebar navigation
- Header with bot status, user menu
- Mobile hamburger menu + overlay

**ToastContainer** (`components/ToastContainer.jsx`)
- Global notifications via Zustand store
- Auto-dismiss after 5s
- Click to dismiss

### Pages

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | Username/password auth |
| Dashboard | `/` | Overview, quick actions |
| ChestManager | `/chests` | CRUD for chests |
| KitOrder | `/kits` | Order kits for players |
| BotControl | `/bot` | Start/stop/restart/leave |
| Chat | `/chat` | Real-time in-game chat |
| Settings | `/settings` | Config, password, about |

## Data Flow

### Kit Order Flow
1. User submits order on `/kits` page
2. Frontend calls `api.kit.order(chestName, amount, player)`
3. Backend `/api/kits/order` validates chest exists
4. Backend calls `botService.takeItemFromChest()`
5. Bot pathfinds to chest, withdraws items
6. Bot whispers player, sends TPA
6. Backend returns success, frontend shows toast

### Chat Flow
1. Frontend connects to `ws://host:8081`
2. Backend WebSocketServer accepts connection
3. Bot chat event → WebSocket broadcast to all clients
4. Frontend sends message → Bot.chat()

### Config Update Flow
1. User edits settings on `/settings`
2. Frontend POSTs to `/api/config`
3. Backend updates `.env`, reloads dotenv
4. Response: "restart required"

## Security

- Session cookies: HttpOnly, Secure, SameSite=Lax
- No third-party auth (no OAuth, Firebase, etc.)
- No biometrics/WebAuthn
- Passwords stored as bcrypt hash in .env
- CORS restricted to frontend origin
- No Firebase/OneSignal/third-party push

## Tech Stack Constraints

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| Frontend | React 18, Vite, Zustand, CSS | TypeScript/TSX, Next.js, CSS-in-JS |
| Backend | Hono, Express, Mineflayer | Fastify, NestJS, other frameworks |
| Database | JSON file, SQLite, Turso, Neon, MySQL, PG | MongoDB, Firebase |
| Notifications | Web Push API | Firebase, OneSignal |
| Auth | Session cookies + bcrypt | OAuth, JWT in localStorage |
| Build | Vite only | Webpack, Rollup configs |

## Deployment

### Development
```bash
npm run dev  # Runs backend (--watch) + frontend (vite)
```

### Production
```bash
npm run build      # Builds frontend to frontend/dist
npm start          # Runs backend (serves static + API)
```

### Linux Service (systemd)
- `mdb` - Main bot panel (backend + frontend)
- `mdbr` - API demon for systemctl start/stop/restart

### Nginx
Reverse proxy to `http://localhost:8081` with SSL termination.