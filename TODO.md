# TODO & Milestone Tracker — Minecraft Kit Delivery Bot

This file tracks the entire development roadmap, organized by milestones, with current state analysis, improvement suggestions, and implementation plans.

---

## Current State (v2.0.0)

### What the App Has Today

| Area | Current Implementation | Status |
|------|----------------------|--------|
| **Core Bot** | Mineflayer bot with pathfinding, chest navigation, item withdrawal, TPA | Functional |
| **Web Dashboard** | EJS-based dark-themed UI for config, chest CRUD, kit ordering, bot control | Functional |
| **REST API** | `/api/order`, `/api/status`, `/api/bot/leave`, chest CRUD endpoints | Functional |
| **Chest Database** | `chestData.json` flat file | Functional (limited) |
| **WebSocket Chat** | Real-time in-game chat relay via WS | Functional |
| **Discord** | Mentioned as integration path but not implemented in codebase | Not implemented |
| **Authentication** | Session-based login with hardcoded credentials | Basic |
| **Linux Install** | Full install.sh with systemd, Nginx, SSL | Functional |
| **Windows Install** | ZIP release with manual setup | Functional |
| **API Demon** | Separate `api.js` for start/stop/restart systemd services | Functional |
| **Kit Listing** | `!w list` whisper command via `kitlist.js` | Functional |
| **Documentation** | README, CONTRIBUTING.md, docs/ folder | Added |

### What Can Be Improved

| Area | Current Limitation | Improvement |
|------|-------------------|-------------|
| **Frontend** | EJS templates with embedded CSS/JS; no SPA; no PWA; poor mobile experience | React.js SPA + PWA + mobile-first responsive design |
| **Backend Architecture** | Monolithic; `server.js` is 301 lines doing everything; no module separation | Feature-based modular backend with clean separation of concerns |
| **Database** | Flat JSON file (`chestData.json`); no concurrency safety; no validation | Structured database (SQLite/PostgreSQL) with proper schemas and migrations |
| **Scalability** | Single bot instance; no multi-bot support; no swarm capability | Multi-bot architecture with per-bot configs and shared state |
| **Crash Recovery** | No automatic restart logic; manual intervention required on crash | Process manager with auto-restart, health checks, and graceful shutdown |
| **Integration** | Only Discord mentioned; tightly coupled to specific flow | Plugin-based integration system — add Discord, Telegram, or any platform by dropping in a module |
| **Role-Based Access** | Single hardcoded user; no admin/user roles | RBAC with admin, operator, and viewer roles |
| **Notifications** | No push notifications | PWA push notifications + in-app alerts |
| **Testing** | No tests at all | Unit tests, integration tests, and E2E tests |
| **CI/CD** | No CI pipeline | GitHub Actions for lint, test, build, and release |
| **Logging** | `console.log` only | Structured logging with levels (debug, info, warn, error) |
| **Error Handling** | Minimal; uncaught exceptions can crash the process | Global error handlers, try/catch boundaries, and error reporting |
| **Security** | Hardcoded session secret; no HTTPS in dev; no input sanitization | Environment-based secrets, HTTPS support, input validation, rate limiting |

---

## Milestones

### Milestone 0 — Foundation Cleanup (Current)

- [x] Add comprehensive documentation (README, CONTRIBUTING, docs/)
- [x] Improve `.gitignore` with standard patterns
- [x] Populate `package.json` keywords for discoverability
- [x] Document current architecture (docs/ARCHITECTURE.md)
- [x] Document configuration options (docs/CONFIGURATION.md)
- [x] Document API endpoints (docs/API.md)
- [ ] Add linting config (ESLint)
- [ ] Add basic test scaffolding
- [ ] Add `.editorconfig` for consistent formatting

---

### Milestone 1 — Modular Backend Architecture

**Goal:** Refactor the monolithic codebase into feature-based modules so different integrations are easy to add.

- [ ] Split `server.js` into modular route files
  - `routes/auth.js` — authentication routes
  - `routes/chest.js` — chest CRUD API
  - `routes/kit.js` — kit ordering API
  - `routes/bot.js` — bot control routes
  - `routes/integration.js` — third-party integration routes
- [ ] Extract `bot.js` logic into a proper service module
  - `services/botService.js` — bot lifecycle (connect, disconnect, restart)
  - `services/chestService.js` — chest management
  - `services/kitService.js` — kit ordering logic
- [ ] Create a plugin system for integrations
  - `integrations/discord/` — Discord slash command handler
  - `integrations/telegram/` — Telegram bot handler
  - `integrations/webhook/` — Generic webhook receiver
  - `integrations/base.js` — Integration interface definition
- [ ] Add a proper logger (`utils/logger.js`) using `winston` or `pino`
- [ ] Add global error handling middleware
- [ ] Add graceful shutdown handling (SIGTERM, SIGINT)
- [ ] Add health check endpoint (`GET /health`)

---

### Milestone 2 — Database & Multi-Bot Support

**Goal:** Replace flat JSON with a proper database and enable running multiple bots.

- [ ] Choose database solution (SQLite for simplicity, PostgreSQL for production)
- [ ] Design database schema
  - `bots` table — bot instances (id, name, host, port, username, status)
  - `chests` table — chest locations (id, bot_id, name, x, y, z, item)
  - `users` table — users (id, role, username, password_hash)
  - `integrations` table — connected platforms (id, bot_id, platform, config)
  - `orders` table — order history (id, bot_id, chest_id, player, amount, status, timestamp)
- [ ] Create database connection pool and migration system
- [ ] Refactor all modules to use database instead of flat files
- [ ] Support multiple bot instances (multi-memory)
  - Each bot connects to a different Minecraft server
  - Each bot has its own chest data, users, and integrations
  - Dashboard shows all bots with status indicators
- [ ] Bot swarm mode — one bot controls multiple chests on the same server
- [ ] Add bot instance management UI

---

### Milestone 3 — React.js SPA + PWA Frontend

**Goal:** Replace EJS templates with a modern React.js single-page application that works as a PWA.

- [ ] Set up React project structure (`frontend/`)
- [ ] Implement modular component architecture
  - `components/Layout/` — App shell, sidebar, header
  - `components/Dashboard/` — Overview widgets
  - `components/ChestManager/` — CRUD for chests
  - `components/KitOrder/` — Kit ordering interface
  - `components/BotControl/` — Bot start/stop/restart/status
  - `components/Chat/` — WebSocket chat relay
  - `components/Integrations/` — Manage connected platforms
  - `components/UserManagement/` — User roles and permissions
  - `components/Notifications/` — Push notification center
- [ ] Implement responsive design
  - Mobile-first breakpoints
  - Collapsible sidebar for mobile
  - Touch-friendly controls
- [ ] Convert to PWA
  - Service worker for offline capability
  - Web App Manifest
  - Installable on mobile/desktop
- [ ] Add push notifications
  - Browser notification API
  - Permission management
  - Notification triggers for: kit ordered, bot went offline, chest added, error alerts
- [ ] State management (Zustand or Redux Toolkit)
- [ ] API client abstraction layer (`frontend/src/api/`)
- [ ] Dark/light theme toggle

---

### Milestone 4 — Role-Based Access Control (RBAC)

**Goal:** Implement solid role-based controls so admins can manage everything and other users have scoped access.

- [ ] Define roles
  - **Admin** — Full access: bot control, user management, integration config, all CRUD
  - **Operator** — Can order kits, view chest data, view bot status; cannot manage users or integrations
  - **Viewer** — Read-only access to dashboards and status
- [ ] Design permission matrix
  - Map each endpoint/action to roles
  - Store permissions in database
- [ ] Implement middleware
  - `middleware/auth.js` — Session/JWT authentication
  - `middleware/authorize.js` — Role checking per route
- [ ] Build user management UI
  - Create/edit/delete users
  - Assign roles
  - View activity logs
- [ ] Add audit logging — track who did what and when

---

### Milestone 5 — Integrations Ecosystem

**Goal:** Make it dead simple to add new platform integrations.

- [ ] Define the `Integration` interface:
  - `onStart()` — Initialize the integration
  - `onMessage(message)` — Handle incoming messages
  - `onEvent(event)` — Handle bot events (spawn, death, chat)
  - `onStop()` — Clean shutdown
- [ ] Build the Discord integration
  - Slash commands for kit listing and ordering
  - Button interactions for kit management
  - Embed messages for order confirmations
- [ ] Build the Telegram integration
  - Commands for kit listing and ordering
  - Inline buttons for quick actions
- [ ] Build the webhook integration
  - Receive webhook payloads to trigger bot actions
  - Send webhook callbacks on events
- [ ] Create integration template/documentation for third-party devs
- [ ] Integration marketplace concept — discover and install integrations from a registry

---

### Milestone 6 — Reliability & Production Hardening

**Goal:** The backend should never crash and should be production-ready.

- [ ] Add process manager (PM2 or custom)
  - Auto-restart on crash
  - Log rotation
  - Cluster mode for multi-core usage
- [ ] Add health checks
  - Bot connection health
  - Database connection health
  - Memory usage monitoring
  - Alert on degraded state
- [ ] Add rate limiting to API endpoints
- [ ] Add input validation (Zod or Joi)
- [ ] Add CORS configuration
- [ ] Add security headers (helmet)
- [ ] Add request logging with structured format
- [ ] Add backup system for database
- [ ] Add update/upgrade path with zero-downtime restarts

---

### Milestone 7 — Mobile Native Experience (Optional)

**Goal:** Provide a native mobile app experience via React Native or Capacitor.

- [ ] Evaluate React Native vs Capacitor
- [ ] Share API client between PWA and mobile app
- [ ] Add push notification support for mobile (Firebase/APNs)
- [ ] Add offline kit ordering (queue orders when offline, sync when back)
- [ ] Build app store deployment pipeline
