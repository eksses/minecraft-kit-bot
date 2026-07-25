# Codebase Structure

**Analysis Date:** Sat Jul 25 2026

## Directory Layout

```
/project-root/
├── [server.js]          # Main Express server & web dashboard
├── [bot.js]             # Mineflayer bot logic (chest navigation, item withdrawal)
├── [api.js]             # Separate API demon for systemd services
├── [chestData.json]     # JSON database of chest locations and kit items
├── [.env]               # Environment configuration
├── [package.json]       # Dependencies and scripts
├── [install.sh]         # Linux automated installer
├── [uninstall.sh]       # Linux automated uninstaller
├── src/                 # Application source code
│   ├── [index.js]       # Bot initialization, WebSocket server, chat relay
│   └── [kitlist.js]     # Kit list command handler
├── views/               # EJS templates for the web UI
│   ├── [index.ejs]      # Dashboard home (env config + start/stop/restart)
│   ├── [login.ejs]      # Authentication page
│   ├── [chest.ejs]      # Chest CRUD manager
│   ├── [kit.ejs]        # Kit ordering page
│   ├── [json.ejs]       # Raw JSON editor
│   ├── [chat.ejs]       # WebSocket chat interface
│   ├── [bot.ejs]        # Bot control panel
│   └── [script.js]      # Client-side JS for JSON editor
└── [docs/]              # Detailed documentation (not in this repo)
```

## Directory Purposes

**[Root Directory]:**
- Purpose: Entry point and main components
- Contains: Server implementation, bot logic, API services, configuration
- Key files: `server.js`, `bot.js`, `api.js`, `.env`, `chestData.json`

**[src Directory]:**
- Purpose: Application core logic
- Contains: Bot initialization, WebSocket handling, kit management
- Key files: `index.js`, `kitlist.js`

**[views Directory]:**
- Purpose: Web user interface
- Contains: EJS templates, client-side JavaScript
- Key files: All `.ejs` template files, `script.js`

## Key File Locations

**Entry Points:**
- `server.js`: Main Express server (via `package.json` main field)
- `src/index.js`: Bot initialization and WebSocket server
- `api.js`: Systemd service API endpoints

**Configuration:**
- `.env`: Environment variables and secrets
- `package.json`: Dependencies and scripts

**Core Logic:**
- `bot.js`: Mineflayer bot implementation (navigation, withdrawal)
- `server.js`: Web framework and routing
- `src/index.js`: Bot event handling and relay logic

**Testing/Utilities:**
- `install.sh`, `uninstall.sh`: Deployment and removal scripts

## Naming Conventions

**Files:**
- `.js` files use lowercase with descriptive names
- `.ejs` files use lowercase for templates
- `.json` and `.env` for configuration
- Shell scripts (`install.sh`, `uninstall.sh`) use lowercase

**Directories:**
- `src/`: Conventional source directory name
- `views/`: Standard naming for view templates

## Where to Add New Code

**New Feature - Web Interface:**
- Primary code: `[views/{feature}.ejs]` for HTML template
- Backend: `[server.js]` for Express route
- Client logic: `[script.js]` if JavaScript needed

**New Bot Capability:**
- Implementation: `[bot.js]` for Mineflayer integration
- Events: `[src/index.js]` for event handlers
- Commands: `[src/kitlist.js]` for command processing

**New Configuration:**
- Environment: Add to `.env` file
- Persistent: Add to `chestData.json` file
- Database: Requires new data structure in existing files

**Utilities/Shared Code:**
- Shared helpers: `[src/index.js]` or create new `[src/utils.js]`
- Bot utilities: `[bot.js]` already central location
- API endpoints: `[server.js]` or `[api.js]`

## Special Directories

**[src Directory]:**
- Purpose: Application source code
- Generated: No (source files)
- Committed: Yes (main code)

**[views Directory]:**
- Purpose: Web presentation layer
- Generated: No (source files)
- Committed: Yes (UI templates)

**[docs Directory]:**
- Purpose: External documentation
- Generated: No (separate repo)
- Committed: No (not present)

---

*Structure analysis: Sat Jul 25 2026*