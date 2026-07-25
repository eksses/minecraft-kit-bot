# TODO & Milestone Tracker — MDB v3.0

This file tracks the development roadmap, organized by milestones.

---

## Current State (v3.0.0)

### Completed Features

| Area | Implementation | Status |
|------|---------------|--------|
| **Core Bot** | Mineflayer + pathfinder, worker thread isolation | Complete |
| **Fleet Dashboard** | React SPA with real-time stats | Complete |
| **Multi-Bot** | Unlimited bots from single dashboard | Complete |
| **Swarm Intelligence** | NEAREST, LEAST_BUSY, ROUND_ROBIN load balancing | Complete |
| **Task Queue** | Fault-tolerant with auto-retry and failover | Complete |
| **Database** | SQLite + Drizzle ORM (8 tables) | Complete |
| **REST API** | Full fleet management endpoints | Complete |
| **WebSocket** | Real-time bot status, chat, inventory | Complete |
| **React SPA** | Mobile-first PWA with offline support | Complete |
| **Obsidian Command UI** | Sharp corners, no shadows, terminal-inspired | Complete |
| **RBAC** | Admin, Operator, Viewer roles | Complete |
| **Session Auth** | Cookie-based with bcrypt passwords | Complete |
| **Chat Relay** | WebSocket-based in-game chat | Complete |
| **Bot Inspector** | Drawer with inventory grid, logs, commands | Complete |

### In Progress

| Area | Status |
|------|--------|
| **Discord Integration** | Planned |
| **Telegram Integration** | Planned |
| **PM2 Process Manager** | Planned |
| **GitHub Actions CI/CD** | Planned |
| **E2E Testing** | Planned |

---

## Milestones

### Milestone 0 — Foundation ✅

- [x] Add comprehensive documentation
- [x] Improve `.gitignore`
- [x] Populate package.json keywords
- [x] Document architecture (docs/ARCHITECTURE.md)
- [x] Document configuration (docs/CONFIGURATION.md)
- [x] Document API (docs/API.md)

### Milestone 1 — Modular Backend ✅

- [x] Split monolithic server into modular routes
- [x] Extract business logic into services
- [x] Create Hono app factory
- [x] Add global error handling
- [x] Add graceful shutdown
- [x] Add health check endpoint

### Milestone 2 — Database & Multi-Bot ✅

- [x] SQLite + Drizzle ORM schema
- [x] Auto-migration from chestData.json
- [x] Multiple bot instances
- [x] Worker thread isolation per bot
- [x] Bot swarm mode
- [x] Swarm coordinator with load balancing

### Milestone 3 — React SPA + PWA ✅

- [x] React 18 + Vite project
- [x] Component architecture
- [x] Responsive/mobile-first design
- [x] PWA with service worker
- [x] Obsidian Command design system
- [x] Toast notifications
- [x] Bottom navigation (mobile)

### Milestone 4 — RBAC ✅

- [x] User management (admin/operator/viewer)
- [x] Session-based auth with roles
- [x] Middleware role checking
- [x] User management UI
- [x] Audit logging

### Milestone 5 — Integrations (Next)

- [ ] Discord slash commands
- [ ] Discord button interactions
- [ ] Discord embed messages
- [ ] Telegram bot handler
- [ ] Webhook receiver
- [ ] Integration template/documentation

### Milestone 6 — Production Hardening

- [ ] PM2 process manager
- [ ] Health checks and monitoring
- [ ] Rate limiting
- [ ] Input validation
- [ ] Security headers
- [ ] Backup system
- [ ] Zero-downtime updates

### Milestone 7 — Mobile App (Future)

- [ ] React Native or Capacitor
- [ ] Push notification support
- [ ] Offline kit ordering
- [ ] App store deployment

---

## Visual Timeline

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
