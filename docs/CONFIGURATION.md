# Configuration Guide — MDB v3.0

This document covers all configuration options for the Minecraft Kit Delivery Bot.

---

## Environment Variables (`.env`)

The `.env` file controls the bot's behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `IP` | `6b6t.org` | Minecraft server address |
| `PORT` | `25565` | Minecraft server port |
| `BOTNAME` | `changeme_mdb` | Bot's in-game username |
| `PASSWORD` | `changeme_mdb` | Bot's login password |
| `VERSION` | `1.17` | Minecraft protocol version |
| `SERVER_PORT` | `8081` | Port for the Hono backend |
| `HOST` | `0.0.0.0` | Bind address (0.0.0.0 for public) |
| `UI_USER` | `admin` | Web dashboard login username |
| `UI_PASSWORD` | `password` | Web dashboard login password |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `SESSION_SECRET` | random | Session signing secret |

### Example `.env`

```
IP=6b6t.org
PORT=25565
BOTNAME=my_kit_bot
PASSWORD=securePassword123
VERSION=1.17
SERVER_PORT=8081
HOST=0.0.0.0
UI_USER=admin
UI_PASSWORD=changeMeInProduction
CORS_ORIGINS=http://localhost:5173,http://103.151.60.212:5173
```

> **Warning:** Never commit `.env` with real credentials.

---

## Database (SQLite + Drizzle ORM)

MDB v3.0 uses SQLite with Drizzle ORM. The database file is auto-created at startup:

```
backend/data/mdb.sqlite
```

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (id, username, password_hash, role) |
| `servers` | Minecraft servers (id, name, host, port, version, auth_type) |
| `bots` | Bot instances (id, name, username, server_id, status) |
| `swarms` | Bot groups (id, name, load_balancing) |
| `bot_swarms` | Many-to-many mapping |
| `delivery_queue` | Task queue (id, type, status, assigned_bot, details) |
| `swarm_memory` | Persistent swarm state |
| `bot_logs` | Bot event logs |

### Auto-Migration

On first startup, the system:
1. Creates all tables if they don't exist
2. Creates a default admin user (username: `admin`, password: `password`)
3. Migrates data from `chestData.json` if it exists

---

## Chest Data

Chest locations are stored in the SQLite database. Each chest has:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique chest name |
| `x` | integer | X coordinate |
| `y` | integer | Y coordinate |
| `z` | integer | Z coordinate |
| `itemName` | string | Minecraft item name |

### Via Web UI

Navigate to the **Chests** page (`/chests`) to add, edit, or delete chest locations.

### Via API

See [API Reference](API.md) for full endpoint documentation.

---

## Web Dashboard

The dashboard is accessible at:
- **Development:** `http://localhost:5173`
- **Production:** `http://localhost:8081`
- **Public:** `http://103.151.60.212:5173`

### Login

Navigate to the login page and enter your credentials. Default:
- **Username:** `admin`
- **Password:** `password`

### User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: bot control, user management, all CRUD |
| `operator` | Bot control, chest management, kit ordering |
| `viewer` | Read-only access to dashboards |

---

## Service Configuration (Linux)

### Start Script

The `start.sh` script handles production startup:

```bash
#!/bin/bash
HOST=0.0.0.0 PORT=8081 node backend/src/index.js
```

### Systemd (Optional)

```ini
[Unit]
Description=MDB Bot Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Mcbot/minecraft-kit-bot
ExecStart=/bin/bash start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## Nginx Configuration

When using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /ws {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
