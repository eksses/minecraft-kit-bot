# Delivery System Design Spec (Web UI & In-Game Chat Commands)

Date: 2026-07-30
Status: Approved

## Overview
This specification details the end-to-end delivery system for the Minecraft Kit Bot. The delivery system operates seamlessly across two interfaces:
1. **Web UI**: Interactive chest management page in the bot details section (`BotDetail.jsx`) displaying key-value chest names with a one-click delivery prompt for target Minecraft usernames.
2. **In-Game Chat Commands**: Mineflayer bot event handling for Minecraft chat and whisper commands (`!kit <name>`, `!deliver <name>`, `/trade <name>`, `!list`, `!kits`).

---

## 1. Data Layer & Chest Seeding

### 1.1 Chest Data Model
Chests are stored with key-value pair identifiers in the SQLite database table `chest_locations` (`schema.chestLocations`). Each chest entry includes:
- `name` (string): The key-value identifier (e.g., `pvp`, `kit1`, `8b8t`, `test2`).
- `x`, `y`, `z` (integers): World coordinates.
- `itemName` (string): The Minecraft item identifier stored within (e.g., `lime_shulker_box`, `diamond_sword`).
- `itemCount` (integer): Quantity available.
- `botId` (UUID): The associated bot.
- `userId` (UUID): Owner user ID.

### 1.2 `chestData.json` Automatic Seeding
- On bot startup, the system parses `chestData.json` containing key-value pair mappings.
- Any chest entry in `chestData.json` not already present in `chest_locations` for the current user/bot is automatically inserted into `chest_locations`.

---

## 2. Web UI Delivery Flow (`BotDetail.jsx`)

### 2.1 Chest List Cards & Display
In `BotDetail.jsx` under the **Chests** tab:
- Each chest is presented as a visual card highlighting its key-value pair `name` (e.g. `pvp`), item details (`itemName`, `itemCount`), and coordinates (`x, y, z`).
- Card actions:
  - **"Deliver Kit"** button (Primary action, green/accent highlight).
  - **"Rescan"** button (Secondary action, refresh icon).

### 2.2 Delivery Modal (`DeliverModal`)
Clicking **"Deliver Kit"** on any chest opens a dedicated modal dialog:
- Title: `Deliver Kit: <chestName>`
- Input 1: **Minecraft Username** (text input, required, autofocus).
- Input 2: **Quantity** (number input, default 1, min 1, max 64).
- Buttons: `Cancel` and `Send Delivery`.
- On submit: Calls `api.chests.orderItem(botId, chestName, count, targetPlayer)`.
- Displays feedback via toast notification (`Delivery request sent for player <targetPlayer>`).

---

## 3. In-Game Chat Commands & Bot Worker Execution

### 3.1 Mineflayer Chat Listener (`botLifecycle.js`)
The bot worker thread (`BOT_WORKER_SCRIPT`) listens to both `chat` and `whisper` events from Mineflayer:
1. **`!list` / `!kits`**:
   - Responds in chat or whisper with all available chest names:
     `Available kits: pvp, kit1, 8b8t`
2. **`!kit <chestName>` / `!deliver <chestName>` / `/trade <chestName>`**:
   - Parses the target `chestName` from the message argument.
   - Sets target `playerName` automatically from the message sender (`username`).
   - Calls `handleTakeItem(bot, chest.x, chest.y, chest.z, chest.itemName, count, playerName)`.

### 3.2 Delivery Execution (`handleTakeItem`)
1. Pathfinds to `(x, y, z)` within distance of 1 block.
2. Opens container and locates the item.
3. Withdraws specified count into bot inventory.
4. Closes container.
5. Sends in-game messages:
   - `/w <playerName> Delivering kit <chestName>!`
   - `/tpa <playerName>` (Teleport request to player for handoff).
6. Fires `item_taken` event for WebSocket broadcast and triggers automatic post-delivery rescan.

---

## 4. API Endpoints & Service Layer Updates

### 4.1 `/api/fleet/bots/:id/trade` (Backend Endpoint)
- Expects payload: `{ chestName, playerName, count }`
- Resolves chest using `tradingService.findChestByName(botId, chestName)`.
- Dispatches delivery command to bot worker.

### 4.2 `TradingService` Fixes
- Standardizes parameter order: `fulfillOrder(botId, playerName, chestName, count)`.
- Supports matching key-value pair names (case-insensitive) as well as fallback substring search.

---

## 5. Verification & Testing Strategy
- Unit/Component test for modal rendering and submission in `BotDetail.jsx`.
- Endpoint test for `/api/fleet/bots/:id/trade`.
- Verification of production build (`npm run build`).
