# Minecraft Kit Delivery Bot (MDB)

Automated Minecraft kit delivery bot for 2b2t, 6b6t, and Java anarchy servers. Built with Mineflayer, Hono, and React PWA.

![Version](https://img.shields.io/badge/version-3.0.0-00ff41?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-ffffff?style=flat-square)

---

## Quick Start

```bash
git clone https://github.com/eksses/minecraft-kit-bot.git
cd minecraft-kit-bot
npm run install:all
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` (Default: `admin` / `admin`).

---

## Features

- **TPA & Elytra Delivery**: Auto TPA or autonomous Elytra flight with fuel calculation.
- **In-Game Commands & Whitelist**: Whisper `/w <bot> !help` for in-game orders with `admin`, `vip`, and `user` roles.
- **Chest Scanner**: Auto-scans chests and signs at base.
- **Multi-Bot & Mobile Dashboard**: Control multiple bots with responsive mobile UI.

---

## In-Game Commands

Whisper commands to the bot directly:

| Command | Role | Action |
|---|---|---|
| `/w <bot> !help` | All | Show command list |
| `/w <bot> !list` | Whitelisted | List available kits |
| `/w <bot> !kit <name> [X Z]` | Whitelisted | Order kit delivery |
| `/w <bot> !role` | All | Check your whitelist role |
| `/w <bot> !mode` | All | Show bot settings |
| `/w <bot> !wlist add <player> [role]` | Admin | Add player to whitelist |
| `/w <bot> !wlist remove <player>` | Admin | Remove player |
| `/w <bot> !wlist list` | Admin | Show whitelist |

---

## Production

```bash
npm run build
npm start
```

---

## Keywords

minecraft kit delivery bot, 2b2t kit bot, 6b6t delivery bot, anarchy server kit bot, mineflayer delivery bot, automated kit bot, minecraft shop bot, minecraft item delivery bot, elytra delivery bot, minecraft stash delivery
