# Integration Guide

Want to add something to MDB? Here's how.

## Adding a New Page

1. Create the page in `frontend/src/pages/YourPage.jsx`
2. Add a route in `frontend/src/App.jsx`
3. Add navigation links in `Sidebar.jsx` and `BottomNav.jsx`
4. That's it — the page is now part of the app

## Adding a New API Endpoint

1. Open `backend/src/routes/fleet.js`
2. Add your route handler
3. If you need database access, import from `../db/index.js`
4. If you need bot control, use `botLifecycle` from `../services/botLifecycle.js`

Example:

```javascript
app.get('/api/fleet/my-endpoint', async (c) => {
  const db = c.get('db');
  // Your logic here
  return c.json({ data: 'hello' });
});
```

## Adding WebSocket Events

1. Open `backend/src/services/realtime.js`
2. Use `broadcast()` to send events to all connected clients

```javascript
const { broadcast } = require('./realtime');

// Send an event
broadcast({
  type: 'my_event',
  data: 'whatever you want'
});
```

## Working with the Bot

Each bot runs in its own worker thread. To interact with a bot:

1. Get the bot instance from `botLifecycle`
2. Use Mineflayer's API to control it

```javascript
const bot = botLifecycle.getBot(botId);
if (bot) {
  bot.chat('Hello world!');
  // bot.pathfinder, bot.inventory, etc.
}
```

## Database Changes

If you need to add a table or column:

1. Edit `backend/src/db/schema.js`
2. Add a migration in `backend/src/db/index.js` (check if table/column exists first)
3. The migration runs automatically on server start

## Design System

All styling uses CSS custom properties. Check `frontend/src/index.css` for the full list.

**Key colors:**
- `--bg` — Page background
- `--bg-surface` — Card/panel background
- `--primary` — Main text color
- `--status-online` — Green (#00ff41)
- `--status-warning` — Amber (#ffb000)
- `--status-error` — Red (#ff3131)

**Adding a new component:**
1. Create it in `frontend/src/components/ui/`
2. Use existing components as reference
3. Use CSS classes, not inline styles

## Testing

We don't have a test suite yet (it's on the roadmap). For now:

1. Start the dev server: `npm run dev`
2. Test your changes manually
3. Check the browser console for errors
4. Test on mobile (responsive design)

## Common Patterns

**Loading state:**
```jsx
if (loading) return <div className="loading-state">Loading...</div>;
```

**Empty state:**
```jsx
<div className="empty-state">
  <div className="empty-state-title">Nothing here yet</div>
  <div className="empty-state-text">Create something to get started</div>
</div>
```

**Toast notifications:**
```jsx
const { addToast } = useToast();
addToast({ type: 'success', title: 'It worked!' });
addToast({ type: 'error', title: 'Something broke' });
```

**API calls:**
```jsx
import { api } from '../services/api';

const data = await api.fleet.getBots();
await api.fleet.startBot(botId);
```
