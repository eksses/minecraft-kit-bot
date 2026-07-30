# Minecraft Kit Delivery Bot (MDB)

Automated Minecraft kit delivery bot for anarchy servers like **2b2t**, **6b6t**, and Java Edition servers. Built with **Mineflayer**, **Hono**, and a responsive **React PWA**.

![Version](https://img.shields.io/badge/version-3.0.0-00ff41?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-ffffff?style=flat-square)
![Minecraft Bot](https://img.shields.io/badge/Mineflayer-1.21.x-brightgreen?style=flat-square)
![Kit Delivery](https://img.shields.io/badge/Kit_Delivery-TPA_%26_Elytra-blue?style=flat-square)

---

## ⚡ Keywords & Capabilities

`minecraft kit delivery bot` • `2b2t kit bot` • `6b6t delivery bot` • `anarchy server kit bot` • `mineflayer delivery bot` • `automated kit bot` • `minecraft shop bot` • `minecraft item delivery bot` • `elytra delivery bot` • `minecraft stash delivery`

- **Dual Transport Modes**: Support for **TPA Teleport** and **Autonomous Elytra Flight** with `@eksses/eafe`.
- **Target Coordinate Resolution**: Direct $(X, Z)$ user targets or randomized bounding box coordinates.
- **Pre-Flight Distance & Supplies**: Automatic calculation of required Firework Rockets and Elytra durability.
- **Inventory Purification**: Automatically stashes non-flight items so the bot carries strictly required gear.
- **Post-Delivery Extraction**: Choice of **FLY_HOME**, **ECHEST_SAVE_AND_DIE**, or **DIRECT_DIE** with an automated suicide hazard waterfall (Lava $\rightarrow$ Mob $\rightarrow$ Water $\rightarrow$ Wander).

---

## 🚀 How To Use

### 1. Install & Run

```bash
git clone https://github.com/eksses/minecraft-kit-bot.git
cd minecraft-kit-bot
npm run install:all
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` (Default login: `admin` / `admin`).

### 2. How Kit Delivery Works

1. **Add Bot**: Enter your Minecraft server IP, port, version, and account credentials under **Bots** $\rightarrow$ **Add Bot**.
2. **Scan Base Chests**: Click **Scan** to discover chests and signs around your base.
3. **Dispatch Delivery**:
   - **TPA Mode**: Select an item/chest, type client username, click **Deliver**. The bot pathfinds to the chest, withdraws items, and sends `/tpa <player>`.
   - **Elytra Mode**: The bot calculates fuel/elytra durability, purifies its inventory, flies to target coordinates, places a delivery chest, transfers items, sends chat coordinates, and executes your configured return/die routine.

---

## ⚙️ Delivery Configuration Setup

Configure global delivery rules under **Settings** $\rightarrow$ **Delivery**:

- **Transport Mode**: `TPA` or `ELYTRA`
- **Target Coordinate Mode**: `USER` (whisper / direct coords) or `RANDOM_REGION` (bounded region)
- **Post-Delivery Action**:
  - `FLY_HOME`: Round-trip flight back to base.
  - `ECHEST_SAVE_AND_DIE`: Save rockets/elytra in Ender Chest, then suicide respawn.
  - `DIRECT_DIE`: Immediate suicide respawn back to base bed.
- **Storage Keys**: Map staging chests for `ender`, `chest`, `elytra`, and `rocket`.

---

## 🛠️ Features Overview

- **Fleet Command**: Control multiple bots and swarms simultaneously.
- **Automatic Retries & Failover**: Automatic task re-queuing if a bot gets disconnected or kicked.
- **Web Console & Chat**: Live interactive chat and command relay for all bots.
- **Mobile Responsive**: Clean bottom navigation bar and touch-friendly interface.

---

## 💻 Production Build

```bash
npm run build
npm start
```

Runs on port `8081` (serves static PWA + API endpoints).

---

## 📜 License

ISC License — see [package.json](package.json)
