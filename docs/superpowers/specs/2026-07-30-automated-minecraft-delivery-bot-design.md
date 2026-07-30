# Design Spec: Automated Minecraft Delivery Bot (Flying Kit Delivery System)

## 1. System Overview

The Automated Minecraft Delivery Bot system manages automated item deliveries on Minecraft servers via two transport modes (**TPA** and **ELYTRA**). It features autonomous flight pathing using `@eksses/eafe`, dynamic target resolution, automated supply calculations, base inventory purification, Ender Chest / Standard Chest drop-off deployment, and post-delivery return routines (including a suicide respawn waterfall).

---

## 2. Configuration & State Settings

The delivery system operates under global configurations stored in system settings and process environment:

| Setting | Type / Values | Description |
|---|---|---|
| `DELIVERY_MODE` | `'TPA'` \| `'ELYTRA'` | Primary transport mode (default: `'TPA'`) |
| `TARGET_COORD_MODE` | `'USER'` \| `'RANDOM_REGION'` | Target coordinate source for Elytra mode |
| `STORAGE_KEY_ENDER` | string | Key name for chest containing Ender Chests (default: `'ender'`) |
| `STORAGE_KEY_CHEST` | string | Key name for chest containing Standard Chests (default: `'chest'`) |
| `STORAGE_KEY_ELYTRA` | string | Key name for chest containing Elytra wings (default: `'elytra'`) |
| `STORAGE_KEY_ROCKET` | string | Key name for chest containing Firework Rockets (default: `'rocket'`) |
| `POST_DELIVERY_ACTION` | `'FLY_HOME'` \| `'ECHEST_SAVE_AND_DIE'` \| `'DIRECT_DIE'` | Routine executed after drop-off |
| `BASE_COORDINATES` | `{ x, y, z }` | Base coordinates for takeoff, home flight, and storage |
| `RANDOM_REGION_BOUNDS` | `{ x1, z1, x2, z2 }` | Bounding rectangle for random region target generation |

---

## 3. Pre-Flight Calculation & Supply Estimation

For `ELYTRA` delivery mode:
1. **Target Coordinate Resolution**:
   - If `TARGET_COORD_MODE == 'USER'`: use target coordinates $(X_{\text{target}}, Y_{\text{target}}, Z_{\text{target}})$ specified in order.
   - If `TARGET_COORD_MODE == 'RANDOM_REGION'`: generate target $(X_{\text{target}}, Z_{\text{target}})$ inside $[X_1, X_2] \times [Z_1, Z_2]$ with ground $Y$ estimate.
2. **Trip Distance Multiplier**:
   - `FLY_HOME`: $\text{Total Distance} = 2 \times \text{Distance}(\text{Base} \rightarrow \text{Target})$
   - `ECHEST_SAVE_AND_DIE` or `DIRECT_DIE`: $\text{Total Distance} = 1 \times \text{Distance}(\text{Base} \rightarrow \text{Target})$
3. **Supply Math**:
   - Firework Rockets required: $\text{Math.ceil}(\text{Total Distance} / 120) + 5$ (buffer).
   - Elytra durability required: calculated via `@eksses/eafe`'s `calculateRequiredElytraDurability(totalDistance)`.

---

## 4. Base Preparation & Inventory Purification

Before flight execution:
1. Withdraw client delivery items from order staging chest.
2. Withdraw utilities from storage key containers:
   - 1x Ender Chest (`minecraft:ender_chest`) from key `ender`.
   - 1x Standard Chest (`minecraft:chest`) from key `chest`.
   - Primary + Backup Elytra wings (`minecraft:elytra`) from key `elytra`.
   - Calculated Firework Rockets (`minecraft:firework_rocket`) from key `rocket`.
3. Base Ender Chest Transfer:
   - Approach Base Ender Chest.
   - Deposit client delivery items + 1x Standard Chest into Base Ender Chest.
4. **Strict Inventory Purification**:
   - Return any remaining non-flight items into storage chests.
   - Verify inventory contains **ONLY**:
     - Firework Rockets (`rocket`)
     - Equipped / Backup Elytra (`elytra`)
     - 1x Ender Chest block (`ender`)

---

## 5. Flight, Drop-Off & Notification Execution

1. **Autonomous Flight**:
   - Instantiate `@eksses/eafe` `ElytraFlight` instance.
   - Launch takeoff and fly to $(X_{\text{target}}, Z_{\text{target}})$.
2. **Safe Landing**:
   - `ElytraFlight` performs spiral descent to solid terrain with $\ge 2$ blocks headroom.
3. **Ender Chest Unload**:
   - Place 1x Ender Chest block on adjacent ground.
   - Open Ender Chest and withdraw delivery items + 1x Standard Chest.
   - Mine/break Ender Chest block and collect it back into inventory.
4. **Delivery Chest Deployment**:
   - Place 1x Standard Chest block on ground at landing position $(X_{\text{drop}}, Y_{\text{drop}}, Z_{\text{drop}})$.
   - Deposit all client delivery items inside Standard Chest and close container.
   - Send chat notification:
     `"Delivery complete! Chest placed at X: [X] Y: [Y] Z: [Z]."`

---

## 6. Post-Delivery Return Routines & Suicide Waterfall

Depending on `POST_DELIVERY_ACTION`:

### Option A: `FLY_HOME`
- Verify remaining rockets and Elytra durability.
- Launch `ElytraFlight` back to Base coordinates $(X_{\text{base}}, Z_{\text{base}})$.
- Land safely at base and return remaining items to storage key containers.

### Option B: `ECHEST_SAVE_AND_DIE`
- Place 1x Ender Chest block.
- Deposit all remaining Firework Rockets and Elytra into Ender Chest.
- Execute **Suicide Respawn Waterfall**.

### Option C: `DIRECT_DIE`
- Skip gear preservation.
- Execute **Suicide Respawn Waterfall**.

### Suicide Respawn Waterfall (Priority Order):
1. **Lava Hazard**: Scan 32-block radius for `minecraft:lava`. Pathfind into lava and submerge.
2. **Hostile Mob Hazard**: Scan radius for hostile mobs (Zombie, Skeleton, Spider, Creeper, etc.). Pathfind to mob and remain still.
3. **Water Drowning Hazard**: Scan radius for deep water ($>2$ blocks). Pathfind to floor and submerge until oxygen runs out.
4. **Wandering Hazard**: Wander randomly until taking environment or mob damage.

---

## 7. API & UI Integration

- Endpoint `GET /api/fleet/delivery-config` & `POST /api/fleet/delivery-config` to inspect and modify delivery settings.
- Integration in `BotService` (`backend/src/services/bot.js`) and `src/transfer.js`.
