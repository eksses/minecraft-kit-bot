# Delivery System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, reliable delivery system based on Web UI (admin sidebar page + bot detail delivery tab with username prompt modal) and in-game Mineflayer chat commands (`!kit <name>`, `!deliver <name>`, `!list`).

**Architecture:** 
1. Database & Service Layer: Auto-seed `chestData.json` key-value pairs into SQLite `chest_locations`. Standardize `TradingService.fulfillOrder(botId, playerName, chestName, count)` and backend `/api/fleet/bots/:id/trade` endpoint.
2. In-Game Chat Commands: Mineflayer `chat` and `whisper` event listeners in `botLifecycle.js` for `!list`, `!kits`, `!kit <name>`, `!deliver <name>`, `/trade <name>` with auto-sender player targeting and `/tpa` handoff.
3. Web UI: Global Admin Delivery page (`/fleet/delivery`), Admin Sidebar link, Bot Detail Delivery Tab, and interactive `DeliverModal` component for entering target username.

**Tech Stack:** Hono.js, Drizzle ORM, SQLite, Mineflayer, React 18, React Router v6, Lucide Icons, Vite.

## Global Constraints
- All backend routes require authentication via `requireAuth`.
- Predefined key-value chest names (e.g. `pvp`, `kit1`, `8b8t`, `test2`) must be preserved and matched case-insensitively.
- Build must pass cleanly (`npm run build` in `frontend`).

---

### Task 1: Backend Seeding & Trading Service Fixes

**Files:**
- Modify: `backend/src/services/tradingService.js`
- Modify: `backend/src/services/botLifecycle.js`
- Modify: `backend/src/routes/fleet.js:655-678`

**Interfaces:**
- Produces: `tradingService.fulfillOrder(botId, playerName, chestName, count)`
- Produces: `POST /api/fleet/bots/:id/trade` expecting `{ chestName, playerName, count }`

- [ ] **Step 1: Update `TradingService.fulfillOrder` parameter order and fallback**

Modify `backend/src/services/tradingService.js`:
```javascript
  async fulfillOrder(botId, playerName, chestName, count = 1) {
    const bot = this.botLifecycleManager.getBot(botId);
    if (!bot) {
      return { success: false, error: 'Bot not found or offline' };
    }

    const chest = await this.findChestByName(botId, chestName);
    if (!chest) {
      return { success: false, error: 'Chest "' + chestName + '" not found' };
    }

    const itemName = chest.itemName || 'item';
    bot.takeItem(chest.x, chest.y, chest.z, itemName, count, playerName);

    return { success: true, chest: chest.name, itemName: chest.itemName };
  }
```

- [ ] **Step 2: Update `/bots/:id/trade` route in `backend/src/routes/fleet.js`**

Modify `backend/src/routes/fleet.js` lines 657-677:
```javascript
fleetRoutes.post('/bots/:id/trade', requireAuth, async (c) => {
  const user = c.get('session');
  const botId = c.req.param('id');
  const body = await c.req.json();
  const { chestName, itemName, playerName, count } = body;

  const targetChestName = chestName || itemName;
  if (!targetChestName) {
    return c.json({ error: 'Chest name or item name is required' }, 400);
  }

  const { TradingService } = await import('../services/tradingService.js');
  const tradingService = new TradingService(botLifecycleManager);
  
  const result = await tradingService.fulfillOrder(botId, playerName || 'player', targetChestName, count || 1);
  return c.json(result);
});
```

- [ ] **Step 3: Fix `/tpa` slash prefix in `botLifecycle.js`**

Modify `handleTakeItem` in `backend/src/services/botLifecycle.js`:
```javascript
    if (playerName) {
      bot.chat('/w ' + playerName + ' Here is ' + (count || 1) + ' ' + (itemName || 'item') + '!');
      bot.chat('/tpa ' + playerName);
    }
```

- [ ] **Step 4: Add auto-seeding of `chestData.json` key-value pairs to database**

In `backend/src/routes/fleet.js` or `botLifecycle.js`, on bot spawn/start, load `chestData.json` and insert any missing chests into `chest_locations` table for that bot and user.

- [ ] **Step 5: Syntax check backend files**

Run: `node --check backend/src/services/tradingService.js backend/src/services/botLifecycle.js backend/src/routes/fleet.js`
Expected: 0 errors.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/src/services/tradingService.js backend/src/services/botLifecycle.js backend/src/routes/fleet.js
git commit -m "fix(backend): fix trade endpoint parameter matching, tpa prefix, and chestData seeding"
```

---

### Task 2: Mineflayer Bot Worker Chat & Whisper Command Handlers

**Files:**
- Modify: `backend/src/services/botLifecycle.js` (Worker script section)

**Interfaces:**
- Produces: In-game chat/whisper listeners for `!list`, `!kits`, `!kit <name>`, `!deliver <name>`, `/trade <name>`

- [ ] **Step 1: Add `chat` and `whisper` event listeners to `BOT_WORKER_SCRIPT`**

In `backend/src/services/botLifecycle.js` inside `BOT_WORKER_SCRIPT`:
```javascript
  const handleChatCommand = (username, message) => {
    if (!message || typeof message !== 'string') return;
    const trimmed = message.trim();

    // !list or !kits command
    if (trimmed === '!list' || trimmed === '!kits') {
      parentPort.postMessage({
        type: 'chat_command_list',
        data: { username }
      });
      return;
    }

    // !kit <name>, !deliver <name>, /trade <name>, !get <name>
    const match = trimmed.match(/^(?:!kit|!deliver|!get|\\/trade|!trade)\\s+(.+)$/i);
    if (match) {
      const chestName = match[1].trim();
      parentPort.postMessage({
        type: 'trade_request',
        data: { chestName, playerName: username }
      });
    }
  };

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    handleChatCommand(username, message);
  });

  bot.on('whisper', (username, message) => {
    if (username === bot.username) return;
    handleChatCommand(username, message);
  });
```

- [ ] **Step 2: Handle `chat_command_list` in `wireBotEvents`**

In `backend/src/routes/fleet.js`:
```javascript
  bot.on('chat_command_list', async (data) => {
    try {
      const items = await tradingService.getAvailableItems(bot.id);
      const names = items.map(i => i.name).filter(Boolean).join(', ');
      bot.sendCommand(data.username ? `/w ${data.username} Available kits: ${names || 'None'}` : `Available kits: ${names || 'None'}`);
    } catch (err) {
      console.error('[ChatCommand] Error listing kits:', err.message);
    }
  });
```

- [ ] **Step 3: Syntax check `botLifecycle.js`**

Run: `node --check backend/src/services/botLifecycle.js`
Expected: 0 errors.

- [ ] **Step 4: Commit Task 2**

```bash
git add backend/src/services/botLifecycle.js backend/src/routes/fleet.js
git commit -m "feat(bot): add in-game chat and whisper command listeners for kit delivery"
```

---

### Task 3: Create Reusable `DeliverModal` Component

**Files:**
- Create: `frontend/src/components/DeliverModal.jsx`

**Interfaces:**
- Consumes: `{ isOpen, onClose, chestName, botId, onDeliverSuccess }`
- Produces: React Modal component for entering Minecraft username and submitting delivery request.

- [ ] **Step 1: Implement `DeliverModal.jsx`**

Create `frontend/src/components/DeliverModal.jsx`:
```jsx
import { useState } from 'react';
import { Send, X, User, Package } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './ToastContainer';

export default function DeliverModal({ isOpen, onClose, chestName, botId, onDeliverSuccess }) {
  const [username, setUsername] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      addToast({ type: 'error', title: 'Please enter a Minecraft username' });
      return;
    }

    setLoading(true);
    try {
      const result = await api.chests.orderItem(botId, chestName, count, username.trim());
      if (result.success !== false) {
        addToast({ type: 'success', title: `Delivery started for ${username.trim()} (${chestName})` });
        if (onDeliverSuccess) onDeliverSuccess();
        onClose();
        setUsername('');
        setCount(1);
      } else {
        addToast({ type: 'error', title: result.error || 'Delivery failed' });
      }
    } catch (err) {
      addToast({ type: 'error', title: err.message || 'Delivery request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="drawer-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content animate-slide-in-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', margin: 'auto', padding: '24px', background: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }}>
        <div className="flex items-center justify-between mb-md">
          <div className="flex items-center gap-sm">
            <Send size={20} className="text-primary" />
            <h3 className="text-lg font-semibold">Deliver Kit: <span className="text-accent">{chestName}</span></h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-md">
            <label className="form-label flex items-center gap-xs">
              <User size={14} /> Target Minecraft Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Steve"
              className="form-input"
              autoFocus
              required
            />
          </div>

          <div className="form-group mb-lg">
            <label className="form-label flex items-center gap-xs">
              <Package size={14} /> Quantity
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={64}
              className="form-input"
            />
          </div>

          <div className="flex gap-sm justify-end">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !username.trim()}>
              {loading ? 'Initiating...' : 'Send Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit Task 3**

```bash
git add frontend/src/components/DeliverModal.jsx
git commit -m "feat(ui): create DeliverModal component for Minecraft username input"
```

---

### Task 4: Global Delivery Page & Admin Sidebar Navigation

**Files:**
- Create: `frontend/src/pages/DeliveryPage.jsx`
- Modify: `frontend/src/components/Layout/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Produces: `/fleet/delivery` route and Admin Sidebar navigation item.

- [ ] **Step 1: Create `DeliveryPage.jsx`**

Create `frontend/src/pages/DeliveryPage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import DeliverModal from '../components/DeliverModal';
import { Truck, Send, RefreshCw, Box, Search } from 'lucide-react';

export default function DeliveryPage() {
  const [bots, setBots] = useState([]);
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBot, setSelectedBot] = useState('all');
  const [activeModal, setActiveModal] = useState(null); // { botId, chestName }
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [botsData, chestsData] = await Promise.all([
        api.fleet.getBots().catch(() => []),
        api.fleet.getChests().catch(() => []),
      ]);
      setBots(botsData);
      setChests(chestsData);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load delivery chests' });
    } finally {
      setLoading(false);
    }
  };

  const filteredChests = chests.filter(chest => {
    const matchesSearch = !search || chest.name?.toLowerCase().includes(search.toLowerCase()) || chest.itemName?.toLowerCase().includes(search.toLowerCase());
    const matchesBot = selectedBot === 'all' || chest.botId === selectedBot;
    return matchesSearch && matchesBot;
  });

  if (loading) return <div className="loading-state">Loading delivery system...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-sm">
            <Truck size={24} className="text-primary" /> Kit Delivery System
          </h1>
          <p className="page-subtitle">Select any key-value chest to deliver kits directly to a player</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData} aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex gap-md mb-lg">
        <div className="search-bar flex-1 flex items-center gap-sm">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search chests by name or item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input flex-1"
          />
        </div>
        <select
          value={selectedBot}
          onChange={(e) => setSelectedBot(e.target.value)}
          className="form-select"
          style={{ width: '200px' }}
        >
          <option value="all">All Bots</option>
          {bots.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.username})</option>
          ))}
        </select>
      </div>

      {filteredChests.length === 0 ? (
        <div className="empty-state">
          <Box size={36} className="text-muted mb-sm" />
          <div className="empty-state-title">No chests found</div>
          <div className="empty-state-text">Scan or configure chests for your bots to start making deliveries</div>
        </div>
      ) : (
        <div className="grid-2col">
          {filteredChests.map((chest, i) => {
            const bot = bots.find(b => b.id === chest.botId);
            return (
              <div key={chest.id || i} className="bot-card">
                <div className="flex items-center justify-between mb-sm">
                  <span className="badge badge-accent font-semibold">{chest.name}</span>
                  <span className="mono-sm text-xs text-muted">{chest.x}, {chest.y}, {chest.z}</span>
                </div>
                <div className="mb-md">
                  <div className="text-sm font-medium">{chest.itemName || 'Unknown Item'}</div>
                  {chest.itemCount != null && <div className="text-xs text-muted">{chest.itemCount} items available</div>}
                  {bot && <div className="text-xs text-secondary mt-xs">Bot: {bot.name} ({bot.username})</div>}
                </div>
                <button
                  className="btn btn-primary w-full flex items-center justify-center gap-xs"
                  onClick={() => setActiveModal({ botId: chest.botId || bots[0]?.id, chestName: chest.name })}
                >
                  <Send size={16} /> Deliver Kit
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeModal && (
        <DeliverModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          botId={activeModal.botId}
          chestName={activeModal.chestName}
          onDeliverSuccess={loadData}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Delivery entry to `Sidebar.jsx`**

Modify `frontend/src/components/Layout/Sidebar.jsx`:
```jsx
import {
  LayoutDashboard,
  Bot,
  Server,
  Layers,
  Package,
  Settings,
  LogOut,
  Gamepad2,
  Puzzle,
  ShoppingCart,
  Truck,
} from 'lucide-react';

const navItems = [
  { path: '/fleet', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet/delivery', label: 'Delivery', icon: Truck },
  { path: '/fleet/bots', label: 'Bots', icon: Bot },
  { path: '/fleet/servers', label: 'Servers', icon: Server },
  { path: '/fleet/swarms', label: 'Swarms', icon: Layers },
  { path: '/fleet/tasks', label: 'Tasks', icon: Package },
  { path: '/plugin-store', label: 'Plugin Store', icon: ShoppingCart },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/settings', label: 'Settings', icon: Settings },
];
```

- [ ] **Step 3: Register `/fleet/delivery` route in `App.jsx`**

Modify `frontend/src/App.jsx` to import `DeliveryPage` and add route `<Route path="delivery" element={<DeliveryPage />} />` under `/fleet`.

- [ ] **Step 4: Commit Task 4**

```bash
git add frontend/src/pages/DeliveryPage.jsx frontend/src/components/Layout/Sidebar.jsx frontend/src/App.jsx
git commit -m "feat(ui): add global Delivery page and sidebar navigation"
```

---

### Task 5: Enhance `BotDetail.jsx` Chests Tab & Deliver Modal Integration

**Files:**
- Modify: `frontend/src/pages/BotDetail.jsx`

**Interfaces:**
- Produces: Integrated Delivery buttons and modal inside `BotDetail.jsx` under "Delivery & Chests" tab.

- [ ] **Step 1: Update `BOT_NAV` and Chest rendering in `BotDetail.jsx`**

In `frontend/src/pages/BotDetail.jsx`:
- Change `BOT_NAV` label for `chests` to `"Delivery & Chests"` with `Truck` icon.
- Import `DeliverModal` from `../components/DeliverModal`.
- Add state `[deliverChest, setDeliverChest] = useState(null)`.
- On each chest item card in the Chests section, add a primary **"Deliver"** button next to **"Rescan"**.
- Clicking **"Deliver"** opens `DeliverModal` for that chest.

- [ ] **Step 2: Commit Task 5**

```bash
git add frontend/src/pages/BotDetail.jsx
git commit -m "feat(ui): enhance BotDetail chests tab with direct Deliver modal triggers"
```

---

### Task 6: Build Verification

- [ ] **Step 1: Test frontend production build**

Run: `cd frontend && ./node_modules/.bin/vite build`
Expected: 0 syntax or bundling errors.

- [ ] **Step 2: Verify all backend files with syntax check**

Run: `node --check backend/src/index.js`
Expected: 0 syntax errors.
