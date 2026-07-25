# Configuration Guide

This document covers all configuration options for the Minecraft Kit Delivery Bot.

---

## Environment Variables (`.env`)

The `.env` file controls every aspect of the bot's behavior. Here is a reference:

| Variable | Default | Description |
|----------|---------|-------------|
| `IP` | `6b6t.org` | Minecraft server address |
| `PORT` | `25565` | Minecraft server port |
| `BOTNAME` | `changeme_mdb` | Bot's in-game username |
| `PASSWORD` | `changeme_mdb` | Bot's login password (sent as `/login <password>`) |
| `VERSION` | `1.17` | Minecraft protocol version |
| `SERVER_PORT` | `8081` | Port for the Express web dashboard |
| `WS_PORT` | `3000` | Port for the WebSocket server and API demon |
| `DEMON_PORT` | `25567` | Port for the demon API (unused in current code) |
| `UI_USER` | `admin` | Web dashboard login username |
| `UI_PASSWORD` | `password` | Web dashboard login password |

### Example `.env`

```
IP=6b6t.org
PORT=25565
BOTNAME=my_kit_bot
PASSWORD=securePassword123
VERSION=1.17
SERVER_PORT=8081
WS_PORT=3000
DEMON_PORT=25567
UI_USER=admin
UI_PASSWORD=changeMeInProduction
```

> **Warning:** Never commit `.env` with real credentials. The `.gitignore` is already set to ignore it, but double-check before sharing files.

---

## `chestData.json` Format

This file is the bot's kit database. It is a JSON object where each key is a kit name and each value contains chest coordinates and the item to deliver.

### Structure

```json
{
  "<kitName>": {
    "x": <number>,
    "y": <number>,
    "z": <number>,
    "item": "<minecraftItemName>"
  }
}
```

### Example

```json
{
  "starter_kit": {
    "x": 1234,
    "y": 66,
    "z": -567,
    "item": "diamond_sword"
  },
  "pvp_kit": {
    "x": 1200,
    "y": 70,
    "z": -500,
    "item": "iron_chestplate"
  },
  "red_shulker": {
    "x": 0,
    "y": 66,
    "z": 0,
    "item": "red_shulker_box"
  }
}
```

### Important Rules

- **Unique Item per Chest:** If a chest contains a shulker box (e.g., `red_shulker_box`), it should only contain that item. The bot does not filter — it withdraws the specified item and the player accepts the TPA to collect everything.
- **Coordinates must be integers.**
- **Chest names must be unique.**
- **Item names must match Minecraft registry names** (e.g., `diamond_sword`, `lime_shulker_box`, `stone`).

---

## Database Selection

MDB supports multiple database backends for production deployments:

| Database | Best For |
|----------|----------|
| **JSON file** (`chestData.json`) | Quick start, single bot, dev/testing |
| **SQLite** | Local dev, simple deployments |
| **Turso (libSQL)** | Edge-compatible, serverless |
| **Neon Postgres** | Serverless Postgres, multi-bot |
| **MySQL** | Traditional self-hosted |
| **PostgreSQL** | Multi-bot swarm, complex queries |

The database is auto-migrated from `chestData.json` on first setup. All chest and kit data moves to the structured database after migration.

## Managing Chest Data

### Via Web UI

Navigate to the **Chests** page (`/chest`) while logged in. You can:

- **Add** a new chest with name, coordinates, and item
- **Edit** existing chest data
- **Delete** chests
- View all chests in a list

### Via API

See [API Reference](API.md) for full endpoint documentation.

### Direct File Edit

You can also edit `chestData.json` directly:

1. Open `chestData.json` in a text editor
2. Modify the JSON object
3. Save the file
4. Restart the bot (or send a POST to `/update-json` if the JSON editor is enabled)

> **Note:** The bot reads `chestData.json` at startup and on each `loadChestData()` call. Changes to the file take effect when the bot reloads the data.

---

## Web Dashboard Configuration

The dashboard at `/` allows you to update `.env` values in real time:

1. Log in with `UI_USER` / `UI_PASSWORD`
2. Edit any environment variable in the form
3. Click **Update**

The updated values are written back to `.env` and reloaded. However, **some changes (like IP, PORT, BOTNAME) require a bot restart** to take effect.

---

## Service Configuration (Linux)

### Systemd Services

The install script creates two systemd services:

| Service | Command | Description |
|---------|---------|-------------|
| `mdb` | `ExecStart=node /etc/mdb/server.js` | Bot panel and web server |
| `mdbr` | `ExecStart=node /etc/mdb/api.js` | API demon for service control |

### Managing Services

```bash
# Start
sudo systemctl start mdb
sudo systemctl start mdbr

# Stop
sudo systemctl stop mdb
sudo systemctl stop mdbr

# Restart
sudo systemctl restart mdb
sudo systemctl restart mdbr

# Enable on boot
sudo systemctl enable mdb
sudo systemctl enable mdbr
```

---

## Nginx Configuration

When a domain is provided during installation, the installer configures Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:<SERVER_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

If a domain is provided and SSL is configured, Certbot handles certificate issuance and the nginx config includes HTTPS-to-HTTP redirect rules.
