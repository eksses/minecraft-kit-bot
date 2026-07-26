# API Reference

All API endpoints are prefixed with `/api`. Most endpoints require authentication via session cookie.

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
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

### Check Current User

```http
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

### Logout

```http
POST /api/auth/logout
```

---

## Fleet Management

### Dashboard Stats

```http
GET /api/fleet/dashboard
```

Returns counts of bots, servers, swarms, and task statuses.

### Bots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/bots` | List all bots |
| POST | `/api/fleet/bots` | Create a bot |
| GET | `/api/fleet/bots/:id` | Get bot details |
| DELETE | `/api/fleet/bots/:id` | Delete a bot |
| POST | `/api/fleet/bots/:id/start` | Start a bot |
| POST | `/api/fleet/bots/:id/stop` | Stop a bot |
| POST | `/api/fleet/bots/:id/command` | Send a command |
| GET | `/api/fleet/bots/:id/inventory` | Get inventory |
| GET | `/api/fleet/bots/:id/logs` | Get logs |

**Create Bot:**
```json
{
  "name": "My Bot",
  "username": "MDB_Bot",
  "serverHost": "103.151.60.212",
  "serverPort": 8081,
  "serverVersion": "1.20.4",
  "authMode": "OFFLINE",
  "authPassword": "mypassword"
}
```

### Servers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/servers` | List all servers |
| POST | `/api/fleet/servers` | Create a server |
| DELETE | `/api/fleet/servers/:id` | Delete a server |

### Swarms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/swarms` | List all swarms |
| POST | `/api/fleet/swarms` | Create a swarm |
| DELETE | `/api/fleet/swarms/:id` | Delete a swarm |
| POST | `/api/fleet/swarms/:id/members` | Add bot to swarm |
| DELETE | `/api/fleet/swarms/:id/members/:botId` | Remove bot |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/tasks` | List all tasks |
| POST | `/api/fleet/tasks` | Create a task |
| POST | `/api/fleet/tasks/:id/cancel` | Cancel a task |

### Chests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/chests` | List all chests |
| POST | `/api/fleet/chests` | Add a chest |
| DELETE | `/api/fleet/chests/:id` | Delete a chest |
| POST | `/api/fleet/chests/:botId/scan` | Trigger a scan |
| GET | `/api/fleet/chests/:botId/scan-status` | Get scan progress |
| GET | `/api/fleet/chests/:botId/scan-config` | Get scan config |
| PUT | `/api/fleet/chests/:botId/scan-config` | Update scan config |

---

## WebSocket

Connect to `ws://localhost:8081` for real-time updates.

**Events you'll receive:**

```json
{
  "type": "bot_status",
  "botId": "abc123",
  "status": "ONLINE",
  "health": 20,
  "food": 20,
  "position": { "x": 100, "y": 64, "z": 200 }
}
```

```json
{
  "type": "chat",
  "botId": "abc123",
  "sender": "SomePlayer",
  "message": "Thanks for the kit!"
}
```

```json
{
  "type": "scan_progress",
  "botId": "abc123",
  "phase": "Scanning",
  "percent": 65,
  "found": 12
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Something went wrong"
}
```

Common status codes:
- `400` — Bad request (missing fields, invalid data)
- `401` — Not logged in
- `403` — Not enough permissions
- `404` — Resource not found
- `500` — Server error
