# Minecraft Kit Delivery Bot (MDB)

**MDB** is an automated **Minecraft kit delivery bot** and **anarchy server kit bot** engineered for **2b2t**, **6b6t**, **9b9t**, and Java Edition servers. Built on **Mineflayer**, **Hono**, and a responsive **React PWA dashboard**, MDB gives kit shops, stash managers, and anarchy players an all-in-one **minecraft shop bot** for autonomous **item delivery**, **stash management**, and **automated trading**.

![Version](https://img.shields.io/badge/version-3.0.0-00ff41?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-ffffff?style=flat-square)
![Mineflayer](https://img.shields.io/badge/Mineflayer-1.21.x-brightgreen?style=flat-square)

---

## ⚡ Key Capabilities & Features

- **TPA & Elytra Flight Transport**: Run an **elytra delivery bot** using autonomous flight with `@eksses/eafe` firework rocket math, or standard `/tpa` teleport request deliveries.
- **Automated Kit Order System**: In-game **minecraft trade bot** system. Players whisper the bot to order kits, request item deliveries, or check live kit availability.
- **Base Chest Scanner & Stash Discovery**: Auto-detects chests, double chests, and sign labels across your base for effortless **minecraft stash delivery**.
- **In-Game Whitelist & Player Roles**: Assign `admin`, `vip`, and `user` access levels to control who can order kits from your **mineflayer kit bot**.
- **Multi-Bot Fleet Dashboard**: Control multiple **minecraft delivery bots** concurrently from a mobile-friendly web console with real-time logs and status indicators.
- **Smart Safety & Respawn Waterfall**: Auto inventory purification, gear stashing in Ender Chests (`ECHEST_SAVE_AND_DIE`), and suicide respawn waterfalls (Lava $\rightarrow$ Mob $\rightarrow$ Water $\rightarrow$ Wander).

---

## 🚀 Quick Start

```bash
git clone https://github.com/eksses/minecraft-kit-bot.git
cd minecraft-kit-bot
npm run install:all
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` (Default login: `admin` / `admin`).

---

## 🔒 In-Game Chat Commands

Whisper commands directly to your **minecraft shop bot**:

| Command | Allowed Role | Action |
|---|---|---|
| `/w <bot> !help` | All Users | Show help menu, active role, and delivery mode |
| `/w <bot> !list` | Whitelisted | View all available kit chests scanned by the bot |
| `/w <bot> !kit <name> [X Z]` | Whitelisted | Order kit delivery to player or target coordinates |
| `/w <bot> !role` | All Users | Check your in-game role (`admin`, `vip`, `user`) |
| `/w <bot> !mode` | All Users | View active delivery mode & whitelist status |
| `/w <bot> !wlist add <player> [role]` | Admin Only | Add player to bot whitelist with assigned role |
| `/w <bot> !wlist remove <player>` | Admin Only | Remove player from bot whitelist |
| `/w <bot> !wlist list` | Admin Only | Display full whitelisted player list |

---

## 💻 Production Deployment

```bash
npm run build
npm start
```

Starts the production server on port `8081` (serving static PWA assets + REST API).

---

## 🏷️ Search & Index Keywords

`minecraft kit delivery bot` • `2b2t kit bot` • `6b6t delivery bot` • `9b9t kit bot` • `anarchy server kit bot` • `mineflayer kit bot` • `mineflayer delivery bot` • `automated kit bot` • `minecraft shop bot` • `minecraft item delivery bot` • `elytra delivery bot` • `minecraft stash delivery` • `minecraft trade bot` • `minecraft auto delivery` • `minecraft kit shop` • `minecraft chest scanner` • `2b2t stash bot` • `minecraft kit bot github`
