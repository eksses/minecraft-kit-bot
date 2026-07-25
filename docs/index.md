# Documentation Index — Minecraft Kit Delivery Bot

Welcome to the Minecraft Kit Delivery Bot (MDB) documentation. This index provides links to all available documentation.

---

## Getting Started

- **[README](../README.md)** — Project overview, quick start, and features
- **[Contributing](../CONTRIBUTING.md)** — How to contribute, report bugs, and submit PRs

---

## In-Depth Guides

- **[Architecture](ARCHITECTURE.md)** — Project structure, module responsibilities, and data flow
- **[Configuration](CONFIGURATION.md)** — `.env` setup, `chestData.json` format, and environment details
- **[API Reference](API.md)** — Complete REST API documentation with request/response examples

---

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Main Express server; handles web UI, API routes, and chest CRUD |
| `bot.js` | Mineflayer bot logic; chest navigation, item withdrawal, TPA |
| `api.js` | Systemd control API (start/stop/restart the bot service) |
| `src/index.js` | Bot initialization, WebSocket server, chat relay |
| `src/kitlist.js` | Kit listing via in-game whisper commands |
| `chestData.json` | JSON database of saved chest locations and items |
| `.env` | Environment variables for server, bot, and UI configuration |

---

## Quick Links

- [GitHub Repository](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot)
- [Releases](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot/releases)
