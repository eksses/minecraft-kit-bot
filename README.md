# Minecraft Kit Delivery Bot (MDB) v3.0

A Mineflayer-based Minecraft bot for automated kit delivery on anarchy servers (2b2t, 6b6t, and more). Features a modern Hono backend with React PWA frontend.

[![Version](https://img.shields.io/badge/version-3.0.0-blue)]()
[![License](https://img.shields.io/badge/license-ISC-lightgrey)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)]()
[![Hono](https://img.shields.io/badge/backend-Hono-orange)]()
[![React](https://img.shields.io/badge/frontend-React%2018-blue)]()

---

## Features

- **Kit Delivery** — Save chest locations and items, then order kits for players in-game
- **React PWA Dashboard** — Modern responsive UI with offline support and push notifications
- **Hono Backend** — Fast, lightweight API with modular architecture
- **WebSocket Chat** — Real-time in-game chat relayed to the web interface
- **REST API** — Programmatically order kits, check bot status, and control the bot
- **Multi-Bot Ready** — Architecture designed for multiple bot instances
- **Cross-Platform** — Runs on Linux and Windows

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Minecraft server (anarchy servers like 2b2t or 6b6t recommended)
- npm

### Installation

```bash
# Clone and install all dependencies
git clone https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot.git
cd minecraft-kit-bot
npm run install:all
```

### Configuration

1. Copy `.env.example` to `.env` and configure:
```env
IP=6b6t.org
PORT=25565
BOTNAME=your_bot_name
PASSWORD=your_password
VERSION=1.17
SERVER_PORT=8081
WS_PORT=3000
UI_USER=admin
UI_PASSWORD=secure_password
```

### Running

```bash
# Development (both backend and frontend)
npm run dev

# Production
npm run build
npm start
```

Then open `http://localhost:8081` in a browser.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Contributing](CONTRIBUTING.md) | How to contribute, report issues, and submit PRs |
| [Architecture](docs/ARCHITECTURE.md) | Project structure, module responsibilities, and data flow |
| [Configuration](docs/CONFIGURATION.md) | `.env` variables, `chestData.json` format, and setup details |
| [API Reference](docs/API.md) | Full REST API documentation with examples |
| [Tech Stack](docs/TECH_STACK.md) | Technology rules and non-negotiable constraints |
| [Plans & Discussion](docs/PLANS.md) | Detailed architectural plans and design rationale |
| [Integration Guide](docs/INTEGRATION.md) | How to add new platform integrations |
| [Roadmap](ROADMAP.md) | High-level milestone tracker with timelines |

---

## Project Structure

```
minecraft-kit-bot/
├── backend/                    # Hono backend
│   └── src/
│       ├── index.js           # Entry point
│       ├── app.js             # App factory
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
│   │   ├── store/             # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── botStore.ts
│   │   │   └── chestStore.ts
│   │   └── styles/            # CSS
│   ├── vite.config.ts         # Vite + PWA config
│   └── package.json
├── chestData.json              # Chest database (JSON)
├── .env                        # Environment config
├── package.json                # Root package.json
└── docs/                       # Documentation
```

---

## Tech Stack

MDB uses **plain JavaScript/TypeScript only**. No TypeScript/TSX in frontend (JavaScript only per project policy).

| Layer | Technology |
|-------|------------|
| Frontend | React 18 (Vite) — plain JavaScript, no TSX |
| PWA | Vite PWA Plugin — Service Workers, offline support |
| Push Notifications | Web Push API (browser-native, no Firebase) |
| Backend | Hono (primary) or Express.js |
| Bot Framework | Mineflayer + mineflayer-pathfinder |
| Database | JSON file (dev) / SQLite, Turso, Neon, MySQL, PostgreSQL (prod) |
| State Management | Zustand (lightweight) |
| Styling | CSS Variables (no CSS-in-JS) |
| Process Manager | PM2 (production) |
| Reverse Proxy | Nginx |

---

## Non-Negotiable Rules

- **No TypeScript/TSX** — JavaScript only
- **No Next.js** — Vite + React SPA
- **No Meta-Frameworks** — No Nuxt, SvelteKit, Astro, Remix
- **Backend: Hono or Express only**
- **No Firebase** — Web Push API only
- **No Biometrics** — Session-based auth only
- **No Third-Party Auth** — Local username/password with bcrypt
- **No Heavy Build Tooling** — Vite only

---

## Usage

### Web Dashboard

Navigate to `http://localhost:8081` and log in. From the dashboard you can:

- Manage environment variables
- Start / stop / restart the bot service
- Add, edit, and delete chest kits
- Order kits for players
- View real-time chat
- Configure platform integrations

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Current user |
| `/api/bot/status` | GET | Bot online status |
| `/api/bot/leave` | POST | Bot leaves server |
| `/api/bot/restart` | POST | Restart bot |
| `/api/chests` | GET | List all chests |
| `/api/chests` | POST | Save new chest |
| `/api/chests/:name` | PUT | Update chest |
| `/api/chests/:name` | DELETE | Delete chest |
| `/api/kits/order` | POST | Order kit for player |
| `/api/kits/available` | GET | Available chests for ordering |
| `/api/config` | GET/POST | Get/update configuration |
| `/api/integrations` | GET/POST | Platform integrations |

See [docs/API.md](docs/API.md) for full details.

### WebSocket Chat

```javascript
const ws = new WebSocket('ws://localhost:8081');
ws.onmessage = (event) => {
  const { username, message } = JSON.parse(event.data);
  console.log(`${username}: ${message}`);
};
ws.send('say Hello from web!');
```

---

## Service Management (Linux)

```bash
# Bot panel
sudo systemctl start mdb
sudo systemctl stop mdb
sudo systemctl restart mdb

# API demon
sudo systemctl start mdbr
sudo systemctl stop mdbr
sudo systemctl restart mdbr
```

---

## License

ISC — see [package.json](package.json)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Keywords

2b2t kit delivery bot, 6b6t kit delivery bot, Minecraft kit delivery bot, Mineflayer bot, Minecraft server management, Minecraft kit management, Discord integration, Minecraft anarchy server, Whisper commands, Discord slash commands, JSON file management, Anarchy server administration, Discord-controlled bot, Mineflayer bot for 2b2t, Discord-managed Minecraft bot, Anarchy server administration, Discord-controlled Mineflayer bot