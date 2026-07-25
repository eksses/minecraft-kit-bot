# Phase 2: Chest Scanner & Auto-Discovery - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatic chest discovery via mineflayer pathfinding: scan nearby area for chests/containers, read their contents via container API, store chest data with sign-based naming (Scan Marked mod support), and post-delivery inventory rescan to maintain accurate item counts.

Manual chest entry currently exists (`chestService.save()`). This phase adds automatic discovery and keeps manual entry as fallback.

</domain>

<decisions>
## Implementation Decisions

### Scan Trigger Flow
- **D-01:** Three trigger sources: on-demand (web UI button / `!scan` whisper / API endpoint), auto-scan on bot connect (toggleable per bot), periodic scan (configurable interval per bot)
- **D-02:** Per-bot settings — each bot has its own scan configuration, not global
- **D-03:** If scan already in progress when triggered, reject with error message ("Scan already in progress"). No queuing, no cancel-and-restart.

### Scan Marked Mod Support
- **D-04:** When Scan Marked mod is enabled (per bot setting), only scan chests that have a sign attached to the chest block itself
- **D-05:** Sign must be on front or back face of the chest block — not on adjacent blocks, not on top/bottom
- **D-06:** Custom sign text format: `#Key:Value` pairs, one pair per line or multiple on same line
  - `#Name:MyKit` — required, sets the chest name
  - `#Item:Diamond` — optional, overrides detected item
  - `#Qty:64` — optional, expected quantity hint
  - Any arbitrary `#Key:Value` pairs allowed — fully flexible
  - Only `#Name` is required; all other keys are optional metadata

### Chest Naming Strategy
- **D-07:** Chests without signs (or signs without `#Name` key) are marked as "unnamed" — not given sequential names
- **D-08:** Unnamed chests use item name as display reference (e.g., `unnamed:diamond`)
- **D-09:** Per-bot setting: `allow_unnamed_orders` — when OFF, unnamed chests cannot be used for kit orders

### Post-Delivery Rescan
- **D-10:** After taking items from a chest during delivery, bot rescans that specific chest (not all chests)
- **D-11:** Rescan updates: item count (re-read container contents) + validates chest still exists at expected position
- **D-12:** If chest is missing or moved during rescan: mark as "unavailable" in database (not deleted — admin can investigate)
- **D-13:** Per-bot setting: option to scan only unavailable chests (to rediscover moved/missing chests)

### Per-Bot Data Architecture (CRITICAL)
- **D-14a:** Data isolation model:
  - **Global data** = servers, bots, users (shared across system)
  - **Per-bot data** = chest locations, kits, chat logs, settings, delivery history, scan config
  - Each bot owns its own chest registry — bots do NOT share chest data
  - A chest scanned by Bot A is invisible to Bot B unless explicitly shared

- **D-14b:** UI navigation model:
  - Clicking a bot name → navigates to that bot's control panel (its chests, kits, settings)
  - Swarm view → combined/aggregate view of multiple selected bots' data
  - Swarm shows data from its member bots merged together (not a separate data store)

- **D-14c:** Extended chest data structure (per bot):
  - `id` — unique identifier (UUID)
  - `botId` — which bot this chest belongs to (FOREIGN KEY)
  - `name` — chest name from sign `#Name` or `unnamed:{item}`
  - `x, y, z` — coordinates
  - `item` — primary item type detected
  - `itemCount` — current item count (updated on scan/rescan)
  - `allItems` — array of all items in chest (for reference)
  - `source` — "manual" | "scan" | "sign" (how chest was registered)
  - `signData` — parsed `#Key:Value` pairs from sign (if any)
  - `status` — "active" | "unavailable" | "disabled"
  - `lastScanned` — timestamp of last successful scan
  - `serverId` — which server this chest belongs to

### Scan Behavior
- **D-15:** Scan radius: configurable per bot (default: 32 blocks from bot's current position)
- **D-16:** Bot pathfinds to each discovered chest one by one, opens container, reads contents, then moves to next
- **D-17:** Scan progress reported via WebSocket (real-time updates to frontend)
- **D-18:** Scan results: chests found, items cataloged, any errors (e.g., trapped chest, ender chest)

### OpenCode's Discretion
- Chest detection algorithm (block scan for chest/trapped_chest)
- Container reading implementation details (mineflayer `bot.openContainer()`)
- Sign text parsing implementation
- Error handling for locked/trapped chests
- Batch size limits for large scans

</decisions>

<specifics>
## Specific Ideas

- Sign format inspired by JSON but simplified for Minecraft signs — `#Key:Value` pairs, not actual JSON
- Scan Marked mod integration is optional — bot works without it, just won't filter by signs
- Unnamed chests are visible in UI but can be hidden/disabled per bot
- Rescan is targeted — only the chest used in the last delivery, not full rescan

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bot & Pathfinder
- `backend/src/services/bot.js` — Current bot lifecycle, pathfinder setup, `takeItemFromChest()` implementation
- `backend/src/services/chest.js` — Current chest CRUD (JSON file-based)

### Database Schema
- `backend/src/db/schema.js` — `chestLocations` table (lines 124-135) needs `botId` FK added; current schema has `userId` but NOT `botId`
- `backend/src/db/schema.js` — `bots` table (lines 38-56) — per-bot settings will extend this or use a new `bot_settings` table

### Routes
- `backend/src/routes/chests.js` — Existing chest API endpoints
- `backend/src/routes/bot.js` — Bot control endpoints

### Kit/Delivery
- `backend/src/services/kit.js` — Current `orderKit()` flow, how delivery uses chest data

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `botService` (bot.js) — already has pathfinder, `takeItemFromChest()` with goal_reached pattern
- `chestService` (chest.js) — CRUD operations, JSON file storage (will migrate to SQLite `chestLocations` table)
- `Vec3` import — already used for coordinates
- `goals.GoalNear` — pathfinding to chest coordinates
- `bot.openContainer()` — already used in `takeItemFromChest()`

### Established Patterns
- Pathfinding: set goal → wait for `goal_reached` event → interact → resolve/reject
- Chest interaction: `bot.blockAt(pos)` → `bot.openContainer(block)` → `chest.withdraw()`/`chest.deposit()` → `chest.close()`
- Events emitted via EventEmitter pattern on `BotService`

### Integration Points
- `BotService` class — add scan methods here or create new `ChestScanner` service
- `chestLocations` table in SQLite — extend schema for new fields
- WebSocket `realtime.js` — broadcast scan progress
- Frontend `ChestManager.jsx` — add scan trigger button, display scan results
- Bot whisper handler — add `!scan` command alongside existing `!list`

</code_context>

<deferred>
## Deferred Ideas

- Chest sorting/organization within a storage room — future phase
- Automatic restocking alerts when item count drops below threshold — future phase
- Multi-bot collaborative scanning (divide area, merge results) — future phase
- Chest access logging (who took what, when) — add to backlog

</deferred>

---

*Phase: 02-chest-scanner*
*Context gathered: 2026-07-26*
