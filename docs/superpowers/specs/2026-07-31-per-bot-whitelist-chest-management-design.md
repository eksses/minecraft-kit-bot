# Design Specification: Per-Bot Whitelist & Advanced Chest Management

**Date:** 2026-07-31  
**Status:** Approved  
**Target:** Minecraft Kit Delivery Bot System  

---

## 1. Executive Summary

This design introduces a per-bot whitelist architecture, a 4-tier rank permission hierarchy (`public`, `normal`, `vip`, `admin`), per-chest/kit access control rules (required rank, cooldown minutes, hourly/daily withdrawal limits), and an improved Card Grid UI for Chest Management.

---

## 2. Data Architecture & Database Schema

### 2.1 `player_whitelist` Table (Per-Bot Whitelists)
- `id`: Primary key string (`wlist_...`)
- `bot_id`: Foreign key to `bots.id` (on delete cascade)
- `player_name`: String (normalized lowercase)
- `role`: Text enum (`'admin'`, `'vip'`, `'normal'`, `'user'`)
- `added_by`: String (`system`, username)
- `created_at`: Timestamp
- **Index**: Unique index on `(bot_id, player_name)` so each bot has an isolated whitelist.

### 2.2 `chest_locations` Table (Kit Rules & Restrictions)
- `min_rank`: Text enum (`'public'`, `'normal'`, `'vip'`, `'admin'`) – default `'public'`
- `cooldown_minutes`: Integer – default `0` (no cooldown)
- `max_hourly_limit`: Integer – default `0` (unlimited claims per hour)
- `max_daily_limit`: Integer – default `0` (unlimited claims per day)
- `max_withdraw_per_order`: Integer – default `64`
- `category`: Text – default `'General'`

### 2.3 `player_cooldowns` Table (Claim & Limit Tracker)
- `id`: Primary key string
- `bot_id`: Foreign key to `bots.id`
- `player_name`: String (lowercase)
- `chest_id`: Foreign key to `chest_locations.id`
- `claim_count_hour`: Integer
- `claim_count_day`: Integer
- `last_claim_at`: Timestamp
- `hourly_reset_at`: Timestamp
- `daily_reset_at`: Timestamp

---

## 3. Access Control & Rank Hierarchy

### 3.1 Rank Hierarchy Order
Permission checks enforce rank inheritance:
$$\text{public (0)} < \text{normal (1)} < \text{vip (2)} < \text{admin (3)}$$

- A player with role `vip` on Bot A can access kits requiring `public`, `normal`, or `vip`.
- A player with role `admin` on Bot A can access all kits on Bot A and manage Bot A's whitelist.
- Kits with `public` rank can be requested by anyone, provided global bot whitelist settings allow it.

### 3.2 Cooldown & Usage Limit Enforcement
When an order request is received (via chat command `/w <bot> !order <kit>` or API):
1. **Bot Whitelist Check**: Fetch player role on the target bot. If bot whitelist is enabled and player is not whitelisted, deny.
2. **Rank Check**: Verify `playerRoleLevel >= chestMinRankLevel`. If lower, deny with message e.g. `Denied: Required rank VIP, your rank: NORMAL`.
3. **Cooldown Check**: Verify `now - lastClaimAt >= cooldownMinutes`. If on cooldown, deny with remaining time e.g. `On cooldown: 14m remaining`.
4. **Hourly & Daily Limit Checks**: Verify `claimCountHour < maxHourlyLimit` and `claimCountDay < maxDailyLimit`.
5. **Execution & Log**: Record claim timestamp and increment counters.

---

## 4. In-Game Chat Commands & Operations

- `/w <bot> !wlist add <player> <role>` – Add/update player on the bot's whitelist (`normal`, `vip`, `admin`). (Admin only)
- `/w <bot> !wlist remove <player>` – Remove player from the bot's whitelist. (Admin only)
- `/w <bot> !wlist list` – Display bot's whitelisted players and their assigned ranks.
- `/w <bot> !role` – Check your current rank on this bot.
- `/w <bot> !resetcd <player> [kit]` – Reset cooldown and daily limits for a player. (Admin only)

---

## 5. Frontend UI Improvements

### 5.1 Improved Chest Management Page (`/chests`)
- **Card Grid View**: Responsive card grid with chest thumbnail preview, item count, coordinates, status badge (`ACTIVE`, `DISABLED`), and rank badge (`PUBLIC`, `NORMAL`, `VIP`, `ADMIN`).
- **Filter & Search Bar**: Real-time search by chest name, item, or location. Filter dropdowns by Bot, Required Rank, Category, and Status.
- **Rule Editor Modal**: Easily edit kit name, location, required rank, cooldown minutes, max daily/hourly limits, and max withdraw count.
- **Quick Action Buttons**: One-click **Toggle Active/Disabled**, **Reset Cooldowns**, and **Delete Chest**.

### 5.2 Bot Whitelist Management Tab (`/fleet/bots/:id` -> Whitelist Tab)
- Per-bot whitelist management with player search, rank assignment dropdown, bulk player import, and manual cooldown reset button.
