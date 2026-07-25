# Plans & Discussion — MDB v3.0

This document discusses the architectural plans, rationale, and design decisions for MDB.

---

## Why MDB v3.0

### The Problem with v2.0

The v2.0 codebase worked for a single bot on a single server. But it had limitations:

- Monolithic `server.js` (301 lines doing everything)
- Flat JSON file database with no concurrency safety
- No multi-bot support
- No swarm capability
- EJS templates with no SPA
- No role-based access control

### What v3.0 Delivers

A system that is:

1. **Modular** — Every feature is a self-contained module
2. **Scalable** — Run one bot or fifty bots from a single dashboard
3. **Resilient** — Worker thread isolation, auto-reconnect, fault-tolerant queue
4. **Accessible** — React SPA that works on mobile and desktop
5. **Secure** — Role-based access with admin, operator, and viewer roles
6. **Intelligent** — Swarm coordination with load balancing and failover

---

## Architecture Decisions

### Why Hono over Express

Hono is lighter, faster, and serverless-compatible. It provides the same API patterns as Express with better performance. The switch from Express to Hono reduced the backend bundle size significantly.

### Why SQLite + Drizzle ORM

SQLite requires zero setup and is portable. Drizzle ORM provides type-safe queries without TypeScript. This combination gives us the simplicity of a file database with the structure of a real database.

### Why Worker Threads for Bots

Each Mineflayer bot runs in an isolated worker thread. This prevents one bot's crash from affecting others. It also allows for better resource management and cleanup.

### Why Obsidian Command Design

The design system follows Minecraft's block-based aesthetic with sharp corners (0px), no shadows, and a terminal-inspired color palette. This creates a "command center" feel appropriate for a bot management platform.

### Why CSS Custom Properties over CSS-in-JS

CSS custom properties provide runtime theming without JavaScript overhead. They're faster than CSS-in-JS libraries and don't require a build step. The Obsidian Command design system is implemented entirely with CSS variables.

---

## Design System

### Obsidian Command

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#141313` | Main canvas |
| Surface | `#201f1f` | Cards, panels |
| Border | `#2a2a2a` | Card borders, dividers |
| Primary | `#ffffff` | Text, icons, active states |
| Status Online | `#00ff41` | Bot online, success |
| Status Warning | `#ffb000` | Bot working, pending |
| Status Error | `#ff3131` | Bot error, offline |
| Corner Radius | 0px | Sharp corners (Minecraft blocks) |
| Shadows | None | Flat design only |
| Touch Targets | 48px | Mobile accessibility |
| Typography | Inter + JetBrains Mono | UI + code/data |

---

## Future Plans

### Discord Integration

The first integration will be Discord with:
- Slash commands (`/kits`, `/order`, `/status`)
- Button interactions for kit management
- Embed messages for order confirmations

### Production Hardening

- PM2 process manager for auto-restart
- Health checks and monitoring
- Rate limiting and input validation
- Security headers and CORS
- Backup system for database

### Mobile App

Native mobile experience via React Native or Capacitor with:
- Push notifications
- Offline kit ordering
- App store deployment

---

## Discussion

### Should we keep JSON support alongside the database?

**Yes.** The database is the primary storage, but JSON export/import remains supported for:
- Backup and migration
- Quick sharing of chest configs
- CI/CD pipeline configuration

### Should PM2 be required?

**No, but recommended.** The system works with Node.js directly for development. PM2 is an optional production process manager.

### How do we handle backward compatibility?

- API endpoints remain compatible
- `chestData.json` is auto-imported on first database migration
- Web dashboard stays accessible during transitions
