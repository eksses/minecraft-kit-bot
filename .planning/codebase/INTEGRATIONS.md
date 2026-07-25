# External Integrations

**Analysis Date:** 2026-07-25

## APIs & External Services

**[Active Integrations]:**
- Discord.js - Used in package.json, supports slash commands and DM interactions
  - SDK/Client: discord.js v14.14.1
  - Integration state: In development/included but not currently active

**[Planned Integrations]:**
- Telegram - Intended for mobile messaging
- Generic Webhooks - Generic HTTP webhook receiver for external services

## Data Storage

**Databases:**
- JSON file (chestData.json) - Primary storage for chest locations and kit configurations
  - Client: Native JavaScript JSON file
  - Connection: File system based

**File Storage:**
- Local filesystem only - No remote storage solutions detected

**Caching:**
- None detected - Simple in-memory caching only

## Authentication & Identity

**Auth Provider:**
- Session-based - Server-side session authentication using express-session
  - Implementation: Custom username/password system with bcryptjs hashing

## Monitoring & Observability

**Error Tracking:**
- None detected - No dedicated error tracking service (console.log throughout)

**Logs:**
- Console-based logging - Standard console.log and console.error used throughout

## CI/CD & Deployment

**Hosting:**
- Linux-based - Runs as systemd service for production
- Local development via node server.js

**CI Pipeline:**
- None detected - No CI/CD pipeline configured in current implementation

## Environment Configuration

**Required env vars:**
- IP - Minecraft server IP
- PORT - Minecraft server port  
- BOTNAME - Bot username
- PASSWORD - Bot login password
- VERSION - Minecraft version
- SERVER_PORT - Web dashboard port
- WS_PORT - WebSocket port
- DEMON_PORT - API demon port
- UI_USER - Web UI username
- UI_PASSWORD - Web UI password

**Secrets location:**
- .env file - All environment variables stored in .env file

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints currently implemented

**Outgoing:**
- Discord bot messages - When bot sends messages in Discord (planned)
- WebSocket broadcasts - Real-time chat relay to web clients

## Integration Architecture

**Integration Interface:**
- Plugin-based architecture design documented in docs/INTEGRATION.md
- Standard Interface: onStart, onStop, onMessage, onEvent callbacks
- Integration discovery through integrations/ directory

**Integration Router:**
- Automatic loading of integrations from filesystem
- Each integration implements its own handler (e.g., DiscordJSHandler)

**Plugin-Based Design:**
- Modular integration architecture
- Each integration as self-contained module
- Standard configuration and utility injection

---

*Integration audit: 2026-07-25*