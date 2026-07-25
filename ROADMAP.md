# Roadmap — MDB v3.0

High-level milestone overview with current status.

---

## Milestone 0 — Foundation ✅ Complete

- [x] Add comprehensive documentation
- [x] Improve `.gitignore`
- [x] Populate package.json keywords
- [x] Document architecture (docs/ARCHITECTURE.md)
- [x] Document configuration (docs/CONFIGURATION.md)
- [x] Document API (docs/API.md)

---

## Milestone 1 — Modular Backend ✅ Complete

Refactored monolithic server into feature-based modules.

**Key Changes:**
- Split routes into modular files
- Extract business logic into services
- Created Hono app factory
- Added global error handling
- Added graceful shutdown
- Added health check endpoint

---

## Milestone 2 — Database & Multi-Bot ✅ Complete

SQLite + Drizzle ORM with multi-bot swarm support.

**Key Changes:**
- SQLite + Drizzle ORM schema (8 tables)
- Auto-migration from chestData.json
- Worker thread isolation per bot
- Swarm coordinator with load balancing
- Fault-tolerant task queue

---

## Milestone 3 — React SPA + PWA ✅ Complete

Modern React frontend with Obsidian Command design system.

**Key Changes:**
- React 18 + Vite SPA
- Obsidian Command design system
- Mobile-first responsive design
- PWA with service worker
- Toast notifications
- Bottom navigation (mobile)

---

## Milestone 4 — RBAC ✅ Complete

Role-based access control with admin, operator, and viewer roles.

**Key Changes:**
- User management (admin/operator/viewer)
- Session-based auth with roles
- Middleware role checking
- User management UI

---

## Milestone 5 — Integrations 🔄 In Progress

Discord, Telegram, and webhook integrations.

**Key Changes:**
- Discord slash commands
- Discord button interactions
- Telegram bot handler
- Webhook receiver
- Integration template/documentation

---

## Milestone 6 — Production Hardening ⏳ Planned

Make the backend crash-resistant and production-ready.

**Key Changes:**
- PM2 process manager
- Health checks and monitoring
- Rate limiting
- Input validation
- Security headers
- Backup system
- Zero-downtime updates

---

## Milestone 7 — Mobile App ⏳ Planned

Native mobile app experience via React Native or Capacitor.

**Key Changes:**
- React Native or Capacitor
- Push notification support
- Offline kit ordering
- App store deployment

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

---

## How to Contribute

1. Comment on a [GitHub Discussion](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot/discussions)
2. Open an issue with the `enhancement` label
3. Submit a PR for any milestone
