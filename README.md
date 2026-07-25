<div align="center">

# <img src="https://media.giphy.com/media/3ohhwxmNcPvwyRqYKI/giphy.gif" width="40" /> Minecraft Kit Delivery Bot

### The ultimate automated kit delivery system for Minecraft anarchy servers

![Version](https://img.shields.io/badge/version-3.0.0-00ff41?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-ffffff?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Hono](https://img.shields.io/badge/Hono-backend-orange?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-database-003B57?style=flat-square)

<br />

[![Live Demo](https://img.shields.io/badge/LIVE-DEMO-00ff41?style=for-the-badge&logo=minecraft&logoColor=white)](http://103.151.60.212:5173)
[![GitHub Stars](https://img.shields.io/github/stars/R-Samir-Bhuiyan-A/minecraft-kit-bot?style=for-the-badge&logo=github&color=ffffff)](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot)
[![Discord](https://img.shields.io/badge/DISCORD-SERVER-5865F2?style=for-the-badge&logo=discord&logoColor=white)](#)

<br />

<img src="https://github.com/user-attachments/assets/demo-dashboard" width="800" alt="Dashboard Preview" />

</div>

---

## <img src="https://em-content.zobj.net/source/twitter/376/crossed-swords_1f5e1-fe0f.gif" width="24" /> What is MDB?

MDB is a **Mineflayer-based Minecraft bot** for automated kit delivery on anarchy servers like **2b2t** and **6b6t**. It features a modern **Hono backend** with a **React PWA frontend**, designed for reliability, multi-bot management, and real-time control.

```
Player sends TPA request → MDB pathfinds to chest → Withdraws items → Teleports to player
```

---

## <img src="https://em-content.zobj.net/source/twitter/376/fire_1f525.gif" width="24" /> Features

<table>
<tr>
<td width="50%">

### Core Features
- **Kit Delivery** — Automated item withdrawal from chests and TPA to players
- **Fleet Dashboard** — Real-time overview of all bots, swarms, and tasks
- **Multi-Bot Support** — Run unlimited bots from a single dashboard
- **Swarm Intelligence** — Coordinated task distribution across bot swarms
- **Fault-Tolerant Queue** — Automatic retry, failover, and re-queuing

</td>
<td width="50%">

### Platform Features
- **WebSocket Chat** — Real-time in-game chat relay to web interface
- **REST API** — Full programmatic control over all bot operations
- **Role-Based Access** — Admin, Operator, and Viewer permission levels
- **PWA Ready** — Installable on mobile and desktop with offline support
- **Obsidian Command UI** — Sharp-cornered, terminal-inspired design

</td>
</tr>
</table>

---

## <img src="https://em-content.zobj.net/source/twitter/376/rocket_1f680.gif" width="24" /> Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Minecraft server (2b2t, 6b6t, or any Java Edition server)
- npm

### Install & Run

```bash
# Clone the repository
git clone https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot.git
cd minecraft-kit-bot

# Install all dependencies (root + backend + frontend)
npm run install:all

# Copy and configure environment
cp .env.example .env
# Edit .env with your server details

# Start development (backend + frontend simultaneously)
npm run dev
```

Open **http://localhost:5173** and log in with `admin` / `password`

### Production

```bash
npm run build          # Build frontend
npm start              # Start backend (serves static + API)
```

---

## <img src="https://em-content.zobj.net/source/twitter/376/building_construction_1f3d7-fe0f.gif" width="24" /> Architecture

```
minecraft-kit-bot/
├── backend/                    # Hono API Server
│   └── src/
│       ├── index.js           # Entry point (binds 0.0.0.0:8081)
│       ├── app.js             # Hono app with CORS, sessions
│       ├── db/                # SQLite + Drizzle ORM
│       │   ├── schema.js      # 8 tables (users, servers, bots, swarms, tasks...)
│       │   └── index.js       # Auto-migration, default admin user
│       ├── services/
│       │   ├── botLifecycle.js    # Worker thread isolation per bot
│       │   ├── swarmCoordinator.js # Task queue, load balancing, failover
│       │   └── realtime.js        # WebSocket for live bot status
│       └── routes/
│           ├── auth.js        # Session-based auth with RBAC
│           └── fleet.js       # Fleet API (bots, servers, swarms, tasks)
├── frontend/                   # React SPA + PWA
│   └── src/
│       ├── main.jsx           # Entry (AuthProvider + ToastProvider)
│       ├── App.jsx            # Router with 9 protected routes
│       ├── index.css          # Obsidian Command design system
│       ├── context/
│       │   └── AuthContext.jsx # Cookie-based session management
│       ├── services/
│       │   └── api.js         # API client with fleet endpoints
│       ├── components/
│       │   ├── Layout/        # Sidebar (desktop) + BottomNav (mobile)
│       │   ├── ui/            # StatusBadge, HealthBar, BotCard, etc.
│       │   └── ToastContainer.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── FleetDashboard.jsx
│           ├── BotControl.jsx
│           ├── SwarmController.jsx
│           ├── TaskQueue.jsx
│           ├── ServerManager.jsx
│           ├── ChestManager.jsx
│           ├── KitOrder.jsx
│           ├── Chat.jsx
│           └── Settings.jsx
└── .planning/                  # Project planning docs
```

---

## <img src="https://em-content.zobj.net/source/twitter/376/locked_1f512.gif" width="24" /> Design System — Obsidian Command

The UI follows a **Minimalist-Flat** design inspired by Minecraft's block-based aesthetic:

| Element | Value |
|---------|-------|
| Background | `#141313` |
| Surface | `#201f1f` |
| Border | `#2a2a2a` |
| Primary Text | `#e5e2e1` |
| Status Online | `#00ff41` |
| Status Warning | `#ffb000` |
| Status Error | `#ff3131` |
| Corner Radius | `0px` (sharp) |
| Shadows | None |
| Touch Targets | `48px` minimum |
| Typography | Inter + JetBrains Mono |

---

## <img src="https://em-content.zobj.net/source/twitter/376/globe_with_meridians_1f310.gif" width="24" /> API Reference

### Fleet Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fleet/dashboard` | GET | Fleet overview stats |
| `/api/fleet/servers` | GET/POST | Server CRUD |
| `/api/fleet/bots` | GET/POST | Bot CRUD |
| `/api/fleet/bots/:id/start` | POST | Start a bot |
| `/api/fleet/bots/:id/stop` | POST | Stop a bot |
| `/api/fleet/bots/:id/command` | POST | Send chat command |
| `/api/fleet/swarms` | GET/POST | Swarm CRUD |
| `/api/fleet/tasks` | GET/POST | Task queue |
| `/api/fleet/chests` | GET/POST | Chest locations |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login (returns `{ user: { id, username, role } }`) |
| `/api/auth/logout` | POST | Logout (invalidates session) |
| `/api/auth/me` | GET | Current user info |
| `/api/auth/users` | GET | List all users (admin) |

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8081');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: 'bot_status' | 'chat' | 'inventory'
  // data.botId, data.status, data.health, etc.
};
```

---

## <img src="https://em-content.zobj.net/source/twitter/376/wrench_1f527.gif" width="24" /> Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite (JavaScript only, no TypeScript) |
| **Backend** | Hono (lightweight, fast) |
| **Database** | SQLite + Drizzle ORM |
| **Bot Framework** | Mineflayer + mineflayer-pathfinder |
| **Real-time** | WebSocket (live bot status + chat) |
| **Auth** | Cookie-based sessions with RBAC |
| **Styling** | CSS custom properties (Obsidian Command design) |
| **PWA** | Service worker, offline support |

### Non-Negotiable Rules

- **JavaScript only** — No TypeScript, no TSX
- **No Next.js** — Vite + React SPA
- **No Firebase** — Web Push API only
- **No biometrics** — Session-based auth only
- **No heavy build tooling** — Vite only

---

## <img src="https://em-content.zobj.net/source/twitter/376/brain_1f9e0.gif" width="24" /> Swarm Intelligence

MDB supports **coordinated bot swarms** with intelligent task distribution:

```
                    ┌──────────────┐
                    │   Swarm      │
                    │  Coordinator │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────┴──────┐ ┌────┴────┐ ┌───────┴──────┐
     │  Bot Alpha  │ │ Bot Beta│ │ Bot Gamma    │
     │  NEAREST    │ │LEAST    │ │ ROUND_ROBIN  │
     │             │ │BUSY     │ │              │
     └─────────────┘ └─────────┘ └──────────────┘
```

- **Load Balancing:** NEAREST, LEAST_BUSY, ROUND_ROBIN
- **Atomic Task Locking:** Prevents double-assignment
- **Failover:** Failed tasks auto-requeue to next available bot
- **Worker Threads:** Each bot runs in isolation

---

## <img src="https://em-content.zobj.net/source/twitter/376/mobile_phone_1f4f1.gif" width="24" /> Mobile Experience

The UI is **mobile-first** with a responsive design:

- **Bottom Navigation** — 4 primary items + More sheet for full nav
- **Touch Targets** — All interactive elements are 48px minimum
- **Drawer Panels** — Bot details and forms slide in from the right
- **Flat Design** — No shadows, sharp corners, terminal-inspired

---

## <img src="https://em-content.zobj.net/source/twitter/376/books_1f4da.gif" width="24" /> Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Project structure and data flow |
| [API Reference](docs/API.md) | Full REST API documentation |
| [Configuration](docs/CONFIGURATION.md) | Environment variables and setup |
| [Tech Stack](docs/TECH_STACK.md) | Technology rules and constraints |
| [Integration Guide](docs/INTEGRATION.md) | How to add platform integrations |
| [Plans & Design](docs/PLANS.md) | Architectural decisions and rationale |
| [Contributing](CONTRIBUTING.md) | How to contribute |
| [Roadmap](ROADMAP.md) | Milestone tracker |

---

## <img src="https://em-content.zobj.net/source/twitter/376/seedling_1f331.gif" width="24" /> Roadmap

```
[██████████] M0: Foundation      ✅ Complete
[██████████] M1: Modular Backend  ✅ Complete
[██████████] M2: Database + Swarm ✅ Complete
[██████████] M3: React SPA + PWA  ✅ Complete
[██████████] M4: RBAC             ✅ Complete
[███░░░░░░░] M5: Integrations     🔄 In Progress
[░░░░░░░░░░] M6: Production       ⏳ Planned
[░░░░░░░░░░] M7: Mobile App       ⏳ Planned
```

---

## <img src="https://em-content.zobj.net/source/twitter/376/handshake_1f91d.gif" width="24" /> Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/minecraft-kit-bot.git

# Create feature branch
git checkout -b feat/awesome-feature

# Commit (conventional commits)
git commit -m "feat: add awesome feature"

# Push & PR
git push origin feat/awesome-feature
```

---

## <img src="https://em-content.zobj.net/source/twitter/376/scroll_1f4dc.gif" width="24" /> License

ISC License — see [package.json](package.json)

---

<div align="center">

### Built with <img src="https://em-content.zobj.net/source/twitter/376/red_heart_2764-fe0f.gif" width="16" /> for Minecraft

**[Play Live Demo](http://103.151.60.212:5173)** • **[Report Bug](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot/issues)** • **[Request Feature](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot/issues)**

<br />

<img src="https://github.com/user-attachments/assets/footer-minecraft" width="400" />

</div>
