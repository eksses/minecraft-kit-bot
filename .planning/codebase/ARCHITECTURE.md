# Architecture

**Analysis Date:** Sat Jul 25 2026

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                        Web Layer                            │
├──────────────────┬──────────────────┬───────────────────────┤
│   server.js     │   views/        │    api.js              │
│   `[server.js]` │   `[views/]`    │    `[api.js]`         │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Core                          │
├──────────────────┬──────────────────┬───────────────────────┤
│   bot.js        │   src/           │    chestData.json      │
│   `[bot.js]`    │   `[src/]`       │    `[chestData.json]`  │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Bot/Minecraft Integration                          │
│                    `[src/index.js]`                         │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| server.js | Main Express server, web dashboard, API endpoints | `server.js` |
| api.js | Systemd service management API (start/stop/restart) | `api.js` |
| bot.js | Mineflayer bot logic (chest navigation, item withdrawal, TPA) | `bot.js` |
| src/index.js | Bot initialization, WebSocket server, chat relay, kit list | `src/index.js`, `src/kitlist.js` |
| src/kitlist.js | Kit list command handler, data formatting | `src/kitlist.js` |

## Pattern Overview

**Overall:** Modular microservices with clear separation of web, bot, and service concerns

**Key Characteristics:**
- Event-driven architecture with Node.js
- Separation of presentation (views), business logic (bot.js/src), and infrastructure (api.js)
- Real-time communication via WebSocket
- Persistent data storage using JSON files
- Multi-transport pattern (web dashboard, webSocket API, in-game commands)

## Layers

**[Web Presentation]:**
- Purpose: User interface and API gateway
- Location: `server.js`, `views/`, `api.js`
- Contains: Express app, EJS templates, REST endpoints, systemd control
- Depends on: bot.js, src/index.js for bot operations
- Used by: Browser clients, automated services

**[Application Logic]:**
- Purpose: Business logic, bot control, data management
- Location: `bot.js`, `src/index.js`, `src/kitlist.js`
- Contains: Mineflayer integration, chest navigation, item withdrawal, chat handling
- Depends on: Node.js packages, environment configuration
- Used by: Web layer, bot itself

**[Data Storage]:**
- Purpose: Persistent kit/chest configuration
- Location: `chestData.json`
- Contains: JSON-based chest coordinate and item data
- Used by: All application layers

## Data Flow

### Primary Request Path

1. User requests kit via web dashboard (`[server.js:227]`) → `/api/order`
2. API server processes request (`[server.js:228-242]`) → validates chest, calls `takeItemFromChest`
3. Bot receives order (`[bot.js:31]`) → navigates to chest, withdraws item, whispers player (`[bot.js:51-52]`)

### WebSocket Chat Flow

1. Client connects via WebSocket (`[src/index.js:61]`) → establishes WebSocket server
2. User sends message via web interface → WebSocket sends to server (`[src/index.js:69-81]`)
3. Server broadcasts message to in-game (`[src/index.js:77]`) → `/w` whisper command
4. In-game chat received by bot → relayed back to web clients (`[src/index.js:84-86]`)

### Configuration Management

1. Admin edits `.env` file via web UI (`[server.js:51-62]`)
2. Server reads and updates `.env` content (`[server.js:70-78]`)
3. express-session handles authentication (`[server.js:24-37]`)

## Key Abstractions

**[Kit Delivery]:**
- Purpose: Standardized item delivery to players
- Examples: `[server.js:227]` (API), `[bot.js:31]` (bot logic)
- Pattern: Chest coordinates → bot navigation → item withdrawal → TPA request

**[Authentication]:**
- Purpose: Secure admin access
- Examples: `[server.js:24]` (express-session), `[server.js:48]` (isAuthenticated middleware)
- Pattern: Session-based login with username/password from .env

## Entry Points

**[Web Dashboard]:**
- Location: `server.js` (Express server at `[server.js:298-301]`)
- Triggers: HTTP requests to `/` or `/login`
- Responsibilities: Serves HTML, handles user sessions, processes kit orders

**[API Demon]:**
- Location: `api.js` (`[api.js:44-46]`)
- Triggers: HTTP requests to `/start`, `/stop`, `/restart`
- Responsibilities: Manages systemd service operations for bot control

**[Bot Service]:**
- Location: `src/index.js` (entry point via `server.js` at `[server.js:8]`)
- Triggers: Mineflayer connection events (`[src/index.js:31]`)
- Responsibilities: Minecraft bot initialization, WebSocket relay, game event handling

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop, Mineflayer bot runs in same event loop
- **Global state:** Limited state via `chestsData` object in `bot.js`
- **Circular imports:** Minimal, `src/index.js` imports `kitlist.js`, `server.js` imports `bot.js`
- **Data persistence:** JSON file only (no database)

## Anti-Patterns

### Synchronous File Operations

**What happens:** File reading/writing operations are synchronous (`[server.js:135]`, `[server.js:147]`, `[bot.js:18]`)

**Why it's wrong:** Blocks event loop in Node.js, especially problematic for high-frequency operations

**Do this instead:** Use async `fs.promises` API or implement non-blocking patterns with child processes

### Hardcoded Authentication Secrets

**What happens:** Express session secret hardcoded in code (`[server.js:25]`) with value `'samir'`

**Why it's wrong:** Security vulnerability - secrets should be environment variables

**Do this instead:** Read session secret from environment variables like other config values

## Error Handling

**Strategy:** Try-catch blocks around file operations, console.error for bot errors, HTTP error codes for API responses

**Patterns:**
- File I/O errors: Caught and logged (`[src/kitlist.js:12]`, `[server.js:139]`)
- Bot errors: Caught by event listener (`[src/index.js:50-52]`)
- API errors: Returns appropriate HTTP status codes (`[server.js:166]`, `[server.js:184]`)

## Cross-Cutting Concerns

**Logging:** `console.log` for information, `console.error` for errors (minimal centralized logging)

**Validation:** Form validation for chest coordinates (`[server.js:165]`), environment variable validation at startup

**Authentication:** Session-based, stored in-memory, requires UI_USER/UI_PASSWORD from .env

---

*Architecture analysis: Sat Jul 25 2026*