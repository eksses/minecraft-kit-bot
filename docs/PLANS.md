# Plans & Design Decisions

This document captures the key decisions we've made and why.

## Why Hono Over Express?

Express is great but showing its age. Hono is:
- **Faster** — Benchmarks show 2-3x throughput
- **Smaller** — 14KB vs 200KB+ dependencies
- **Modern** — Built for ESM, works with workers
- **TypeScript-ready** — Even though we're using JavaScript

## Why SQLite Over PostgreSQL?

We wanted **zero-config** setup. SQLite means:
- No database server to install
- No credentials to manage
- The database file is portable (just copy `data/mcdb.db`)
- Works great for single-server deployments

If we need to scale to multiple servers later, we can migrate to PostgreSQL.

## Why Worker Threads for Bots?

Each bot runs in its isolated worker thread because:
- **Stability** — One bot crashing doesn't take down others
- **Performance** — Bots don't block each other
- **Safety** — Bot code can't access the main process

## Why No TypeScript?

The team prefers JavaScript for:
- **Faster development** — No type annotations, no compilation
- **Simpler debugging** — What you see is what you run
- **Lower barrier** — Easier for contributors

We might add TypeScript later if the codebase grows复杂.

## Why Obsidian Command Design?

The UI is inspired by Minecraft's aesthetic:
- **Dark theme** — Easy on the eyes during long sessions
- **Sharp corners** — Matches Minecraft's block-based world
- **No shadows** — Clean, flat design
- **Monospace fonts** — Terminal-like feel for power users

## Why Cookie Sessions Over JWT?

Cookies are simpler and more secure:
- **HttpOnly** — Can't be stolen by JavaScript
- **Secure** — Sent only over HTTPS in production
- **SameSite** — Protects against CSRF
- **No token storage** — Browser handles it automatically

## Why Remove Old Pages?

We removed Chat, ChestManager, Dashboard, and KitOrder because:
- **Chat** — Now integrated into BotDetail
- **ChestManager** — Chests are managed per-bot in BotDetail
- **Dashboard** — Replaced by FleetDashboard
- **KitOrder** — Functionality moved to Tasks

This simplifies navigation and reduces code duplication.

## Future Considerations

**Multi-server scaling:**
If we need to run bots across multiple machines, we'd:
1. Switch to PostgreSQL
2. Add Redis for WebSocket pub/sub
3. Use message queue for bot commands

**Mobile app:**
If we build a native app, we'd:
1. Use React Native
2. Share business logic with the web app
3. Keep the Hono backend as-is

**Plugin system:**
If we want extensibility, we'd:
1. Add a plugin API in the backend
2. Create a plugin manifest format
3. Build a plugin marketplace in the UI
