# Plugin System — Context Document

**Phase:** 03-plugin-system
**Created:** 2026-07-26
**Status:** Decisions locked — ready for research and planning

---

## Summary

MDB will get a plugin system that lets developers extend bots with custom functionality. Plugins can add UI elements, API routes, bot behaviors, and have their own npm dependencies. A plugin store allows installing from GitHub repos or zip files.

---

## Locked Decisions

### 1. Plugin Loading

**Decision:** Local folder scan on startup

- Plugins live in `data/plugins/<plugin-name>/`
- Each plugin has a `plugin.json` manifest and an `index.js` entry point
- Backend scans `data/plugins/` on startup and loads each enabled plugin
- No npm install required for core plugins (dependencies bundled or installed separately)

### 2. Plugin Isolation

**Decision:** Worker threads

- Each plugin runs in its own Node.js worker thread
- Full isolation — a crashing plugin cannot take down the main server
- Plugins communicate with the main thread via `parentPort.postMessage()`
- Main thread provides a safe API surface that plugins can call

### 3. Plugin Dependencies

**Decision:** Flexible (per-plugin OR shared)

- Default: each plugin has its own `node_modules/` folder (self-contained)
- Optional: plugins can declare `"shared": true` in manifest to use root `node_modules/`
- Plugin installer runs `npm install` in the plugin directory on install
- Version conflicts are isolated per-plugin by default

### 4. Plugin Store

**Decision:** Official repo + custom repos

- Official plugin registry lives in this GitHub repo (`plugins.json` manifest)
- Users can add custom repos (any GitHub repo or URL with `plugins.json`)
- Plugin store UI shows available plugins, installed plugins, updates
- Install from: repo listing, zip file upload, or direct URL

### 5. Plugin API Surface

**Decision:** Full access

Plugins can:
- Add API routes (Hono routes)
- Listen to all bot events (spawn, death, chat, inventory, etc.)
- Listen to swarm events (task created/completed/failed)
- Query and modify the database (via Drizzle ORM)
- Control bots (send commands, navigate, take items)
- Access WebSocket (broadcast custom events)
- Register UI components (nav items, pages, settings panels)
- Create their own Zustand stores

### 6. Plugin UI Integration

**Decision:** Registry API

Plugins register UI elements via a backend API:
- `pluginRegistry.addNavItem({ id, label, icon, path, position })` — adds sidebar/bottom nav item
- `pluginRegistry.addRoute({ path, component, layout })` — adds a page route
- `pluginRegistry.addSettingsPanel({ id, title, component })` — adds settings tab
- `pluginRegistry.addDashboardWidget({ id, title, component, size })` — adds dashboard widget
- Frontend fetches plugin UI registry on load and renders registered elements

### 7. Plugin Settings

**Decision:** Auto-generated + custom override

- Default: plugins define a `settingsSchema` in `plugin.json` (JSON Schema format)
- Backend auto-generates settings UI from schema
- Plugins can override with a custom React component for complex settings
- Settings stored in `plugin_settings` database table (JSON per plugin)
- Settings accessible via `GET/PUT /api/plugins/:id/settings`

### 8. Plugin Lifecycle

**Decision:** Mixed approach

- **Enable/Disable:** Hot reload — no restart needed. Plugin worker thread is spawned/terminated.
- **Install/Uninstall:** Requires worker thread restart for the specific plugin. Other plugins unaffected.
- **Update:** Download new version, disable, replace files, enable.
- Plugin state tracked in `plugins` database table (installed, enabled, version, config)

---

## Plugin Manifest Format

```json
{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Does something cool",
  "author": "developer",
  "entry": "index.js",
  "dependencies": {
    "some-npm-package": "^1.0.0"
  },
  "shared": false,
  "settingsSchema": {
    "apiKey": { "type": "string", "label": "API Key", "required": true },
    "interval": { "type": "number", "label": "Check Interval (ms)", "default": 5000 }
  },
  "ui": {
    "navItems": [
      { "id": "my-page", "label": "My Plugin", "icon": "Settings", "path": "/plugins/my-plugin" }
    ],
    "routes": [
      { "path": "/plugins/my-plugin", "component": "MyPage.jsx" }
    ]
  }
}
```

---

## Plugin API (Backend)

Plugins receive a context object with full access:

```javascript
// plugin index.js
module.exports = function(pluginContext) {
  const { app, db, events, bots, websocket, ui, settings, logger } = pluginContext;

  // Add API routes
  app.get('/api/my-plugin/data', async (c) => {
    const data = await db.select().from(myTable);
    return c.json(data);
  });

  // Listen to bot events
  events.on('bot:status', ({ botId, status }) => {
    logger.info(`Bot ${botId} is now ${status}`);
  });

  // Control a bot
  bots.command(botId, 'say Hello from my plugin!');

  // Broadcast WebSocket event
  websocket.broadcast({ type: 'my-plugin:update', data: 'something' });

  // Register UI
  ui.addNavItem({ id: 'my-page', label: 'My Plugin', icon: 'Settings', path: '/plugins/my-plugin' });

  // Access settings
  const apiKey = settings.get('apiKey');
};
```

---

## Database Tables (New)

```sql
-- Plugin registry
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  author TEXT,
  enabled INTEGER DEFAULT 1,
  installed_at INTEGER,
  updated_at INTEGER,
  settings TEXT -- JSON
);

-- Plugin settings (per-plugin key-value)
CREATE TABLE plugin_settings (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (plugin_id, key),
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

-- Custom plugin tables can be created by plugins themselves
```

---

## File Structure

```
data/
├── plugins/                    # Plugin installations
│   ├── my-plugin/
│   │   ├── plugin.json         # Manifest
│   │   ├── index.js            # Entry point
│   │   ├── node_modules/       # Plugin dependencies
│   │   └── frontend/           # Optional frontend assets
│   │       ├── MyPage.jsx
│   │       └── settings.jsx
│   └── another-plugin/
│       └── ...
└── mcdb.db                     # Database (includes plugin tables)
```

---

## Non-Functional Requirements

- **Performance:** Plugin loading adds < 2s to startup
- **Isolation:** A crashing plugin must not affect other plugins or the main server
- **Security:** Plugins run with the same permissions as the server (full access by design — trust is placed on the user installing plugins)
- **Compatibility:** Plugins must declare which MDB version they're compatible with
- **Uninstall:** Clean removal of plugin files, database entries, and UI registrations

---

## What's NOT Decided (Deferred)

These are implementation details for the planner to figure out:

- Exact plugin worker thread communication protocol
- Frontend plugin loading mechanism (how registry fetches and renders plugin UI)
- Plugin versioning and update checking
- Plugin marketplace UI layout
- Plugin dependency conflict resolution
- Plugin sandboxing beyond worker threads (if needed)

---

## Next Steps

1. **Researcher:** Investigate best practices for Node.js plugin systems, worker thread communication patterns, and dynamic UI injection in React
2. **Planner:** Create implementation plan with phases (schema → loader → API → UI → store)
3. **Implementation:** Build the plugin system following this context
