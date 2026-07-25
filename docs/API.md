# API Reference — MDB v3.0

Complete REST API documentation for the Minecraft Kit Delivery Bot.

---

## Base URL

```
http://localhost:8081
```

Or from public IP: `http://103.151.60.212:8081`

---

## Authentication

All protected endpoints require a session cookie. Login first:

### Login

```
POST /api/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### Get Current User

```
GET /api/auth/me
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

> **Note:** Frontend must unwrap with `res.user || res`

### Logout

```
POST /api/auth/logout
```

### User Management (Admin)

```
GET /api/auth/users          # List all users
POST /api/auth/users         # Create user { username, password, role }
DELETE /api/auth/users/:id   # Delete user
```

---

## Fleet Management

### Dashboard

```
GET /api/fleet/dashboard
```

**Response:**
```json
{
  "bots": { "total": 5, "idle": 3, "working": 1, "error": 1, "offline": 0 },
  "tasks": { "pending": 2, "active": 1, "completed": 15, "failed": 3 },
  "swarms": { "total": 2 }
}
```

### Servers

```
GET /api/fleet/servers       # List all servers
POST /api/fleet/servers      # Create server
DELETE /api/fleet/servers/:id # Delete server
```

**Create Server Request:**
```json
{
  "name": "2b2t",
  "host": "2b2t.org",
  "port": 25565,
  "version": "1.12.2",
  "authType": "microsoft"
}
```

### Bots

```
GET /api/fleet/bots          # List all bots
POST /api/fleet/bots         # Create bot
GET /api/fleet/bots/:id      # Get bot details
DELETE /api/fleet/bots/:id   # Delete bot
POST /api/fleet/bots/:id/start   # Start bot
POST /api/fleet/bots/:id/stop    # Stop bot
POST /api/fleet/bots/:id/command # Send command { command: "/say hello" }
GET /api/fleet/bots/:id/inventory # Get bot inventory
GET /api/fleet/bots/:id/logs      # Get bot logs
```

**Create Bot Request:**
```json
{
  "name": "DeliveryBot",
  "username": "kit_bot",
  "serverId": "server-id-here"
}
```

**Command Request:**
```json
{
  "command": "/say Hello world"
}
```

### Swarms

```
GET /api/fleet/swarms        # List all swarms
POST /api/fleet/swarms       # Create swarm
DELETE /api/fleet/swarms/:id # Delete swarm
POST /api/fleet/swarms/:id/members      # Add bot { botId }
DELETE /api/fleet/swarms/:id/members/:botId # Remove bot
```

**Create Swarm Request:**
```json
{
  "name": "DeliverySwarm",
  "loadBalancing": "NEAREST"
}
```

**Load Balancing Options:**
- `NEAREST` — Assigns to bot closest to target
- `LEAST_BUSY` — Assigns to bot with fewest active tasks
- `ROUND_ROBIN` — Cycles through bots sequentially

### Task Queue

```
GET /api/fleet/tasks         # List all tasks
POST /api/fleet/tasks        # Create task
POST /api/fleet/tasks/:id/cancel  # Cancel task
```

**Create Task Request:**
```json
{
  "type": "KIT_DELIVERY",
  "targetChestId": "chest-id",
  "assignedBotId": "bot-id",
  "swarmId": "swarm-id",
  "details": {
    "itemName": "diamond_sword",
    "quantity": 1,
    "targetPlayer": "Notch"
  }
}
```

**Task Status Values:** `PENDING`, `LOCKED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`

### Chest Locations

```
GET /api/fleet/chests        # List all chests
POST /api/fleet/chests       # Create chest
DELETE /api/fleet/chests/:id # Delete chest
```

**Create Chest Request:**
```json
{
  "name": "Main Storage",
  "x": 1234,
  "y": 66,
  "z": -567,
  "itemName": "diamond_sword"
}
```

### Swarm Memory

```
GET /api/fleet/memory        # List memory entries
POST /api/fleet/memory       # Store memory entry
```

---

## WebSocket API

Connect to the same HTTP server on port 8081:

```javascript
const ws = new WebSocket('ws://localhost:8081');
```

### Event Types

| Type | Description |
|------|-------------|
| `bot_status` | Bot health, food, position, inventory updates |
| `chat` | In-game chat messages |
| `inventory` | Bot inventory changes |

**Bot Status Event:**
```json
{
  "type": "bot_status",
  "botId": "bot-id",
  "status": "IDLE",
  "health": 20,
  "food": 20,
  "position": { "x": 100, "y": 66, "z": -200 }
}
```

**Chat Event:**
```json
{
  "type": "chat",
  "username": "PlayerName",
  "message": "Hello everyone!"
}
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request (missing or invalid data) |
| `401` | Unauthorized (not logged in) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/login` | POST | No | Login |
| `/api/auth/logout` | POST | Yes | Logout |
| `/api/auth/me` | GET | Yes | Current user |
| `/api/auth/users` | GET/POST/DELETE | Yes | User management |
| `/api/fleet/dashboard` | GET | Yes | Fleet overview |
| `/api/fleet/servers` | GET/POST | Yes | Server CRUD |
| `/api/fleet/bots` | GET/POST | Yes | Bot CRUD |
| `/api/fleet/bots/:id/start` | POST | Yes | Start bot |
| `/api/fleet/bots/:id/stop` | POST | Yes | Stop bot |
| `/api/fleet/bots/:id/command` | POST | Yes | Send command |
| `/api/fleet/swarms` | GET/POST | Yes | Swarm CRUD |
| `/api/fleet/tasks` | GET/POST | Yes | Task queue |
| `/api/fleet/chests` | GET/POST | Yes | Chest locations |
