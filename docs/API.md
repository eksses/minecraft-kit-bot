# API Reference

Complete REST API documentation for the Minecraft Kit Delivery Bot.

---

## Base URL

Replace `http://yourdomain.com` with the actual base URL where your server is hosted.

```
http://localhost:<SERVER_PORT>
```

The default `SERVER_PORT` is `8081`.

---

## Authentication

The web dashboard routes require login. API endpoints for bot control and chest management are **not protected** in the current implementation (consider adding auth for production use).

Default credentials (set in `.env`):
- **Username:** `admin`
- **Password:** `password`

---

## Bot Control Endpoints

### Check Bot Status

```
POST /api/status
```

**Response Values:**

| Code | Meaning |
|------|---------|
| `1`  | Bot is online |
| `2`  | Bot is not online |

**Example:**

```bash
curl -X POST http://localhost:8081/api/status
```

**Response:**
```
1
```

---

### Make the Bot Leave the Server

```
POST /api/bot/leave
```

**Response Values:**

| Code | Meaning |
|------|---------|
| `3`  | Bot successfully left the server |
| `4`  | Bot is not online; no action taken |

**Example:**

```bash
curl -X POST http://localhost:8081/api/bot/leave
```

**Response:**
```
3
```

---

## Kit Ordering Endpoint

### Order Items from a Chest

```
POST /api/order
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chestName` | string | Yes | Name of the chest in `chestData.json` |
| `amount` | number | Yes | Number of items to order |
| `player` | string | Yes | Minecraft username of the recipient |

**Example Request:**

```bash
curl -X POST http://localhost:8081/api/order \
  -H "Content-Type: application/json" \
  -d '{"chestName":"starter_kit","amount":1,"player":"Notch"}'
```

**Success Response:**
```
Ordered 1 diamond_sword from "starter_kit" for Notch.
```

**Error Responses:**

| Status | Message |
|--------|---------|
| `400` | `Chest "<name>" data not found or incomplete.` |
| `500` | `Failed to take item from chest.` |

---

## Chest Data Endpoints

### Get All Chests

```
GET /chest/all-chests
```

**Example:**

```bash
curl http://localhost:8081/chest/all-chests
```

**Response:**
```json
{
  "starter_kit": {
    "x": 1234,
    "y": 66,
    "z": -567,
    "item": "diamond_sword"
  }
}
```

---

### Save a New Chest

```
POST /chest/save-chest
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chestName` | string | Yes | Unique name for the chest |
| `x` | number | Yes | X coordinate |
| `y` | number | Yes | Y coordinate |
| `z` | number | Yes | Z coordinate |
| `item` | string | Yes | Minecraft item name |

**Example:**

```bash
curl -X POST http://localhost:8081/chest/save-chest \
  -H "Content-Type: application/json" \
  -d '{"chestName":"new_kit","x":100,"y":66,"z":200,"item":"diamond"}'
```

**Response:**
```
Chest data saved successfully.
```

---

### Edit an Existing Chest

```
PUT /chest/edit-chest
Content-Type: application/json
```

**Request Body:** Same as save-chest.

**Example:**

```bash
curl -X PUT http://localhost:8081/chest/edit-chest \
  -H "Content-Type: application/json" \
  -d '{"chestName":"new_kit","x":150,"y":70,"z":250,"item":"netherite_ingot"}'
```

**Response:**
```
Chest data edited successfully.
```

**Error Responses:**

| Status | Message |
|--------|---------|
| `400` | `Invalid data` |
| `404` | `Chest not found` |

---

### Delete a Chest

```
DELETE /chest/delete-chest
Content-Type: application/json
```

**Request Body:**

```json
{
  "chestName": "new_kit"
}
```

**Example:**

```bash
curl -X DELETE http://localhost:8081/chest/delete-chest \
  -H "Content-Type: application/json" \
  -d '{"chestName":"new_kit"}'
```

**Response:**
```
Chest data deleted successfully.
```

---

## JSON Editor Endpoint

### Update `chestData.json` via Raw JSON

```
POST /update-json
Content-Type: application/json
```

**Request Body:**

```json
{
  "jsonData": "<entire file content as string>"
}
```

This endpoint requires authentication (session-based).

---

## Environment Variable Endpoint

### Update `.env` via Dashboard

```
POST /update
Content-Type: application/x-www-form-urlencoded
```

This endpoint is accessed from the web dashboard form at `/`. It writes all form fields to `.env` and reloads the environment. Requires authentication.

---

## Application Control Endpoints (API Demon)

The API demon (`api.js`) runs on `WS_PORT` (default `3000`) and provides the following endpoints:

### Restart the Application

```
POST /restart
```

**Response:** `Application restarted successfully`

### Start the Application

```
POST /start
```

**Response:** `Application started successfully`

### Stop the Application

```
POST /stop
```

**Response:** `Application stopped successfully`

---

## WebSocket API

The bot runs a WebSocket server on `WS_PORT` (default `3000`, same as the API demon).

### Connect

```javascript
const ws = new WebSocket('ws://localhost:3000');
```

### Send a Chat Command

Messages must be sent as JSON strings:

```javascript
ws.send(JSON.stringify('say Hello world'));
```

### Receive Chat Events

The server forwards in-game chat as JSON objects:

```json
{
  "username": "PlayerName",
  "message": "Hello everyone!"
}
```

---

## Error Handling

All API endpoints return appropriate HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request (missing or invalid data) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/status` | POST | No | Check bot online status |
| `/api/bot/leave` | POST | No | Bot leaves server |
| `/api/order` | POST | No | Order a kit for a player |
| `/chest/all-chests` | GET | No | Get all chest data |
| `/chest/save-chest` | POST | Yes | Add a new chest |
| `/chest/edit-chest` | PUT | Yes | Edit chest data |
| `/chest/delete-chest` | DELETE | Yes | Delete a chest |
| `/update-json` | POST | Yes | Update chestData.json directly |
| `/update` | POST | Yes | Update .env values |
| `/restart` | POST | No | Restart the bot service (via demon) |
| `/start` | POST | No | Start the bot service (via demon) |
| `/stop` | POST | No | Stop the bot service (via demon) |
