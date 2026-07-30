# Delivery UI Control Panel & Mineflayer Web Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive UI control & monitoring panel for the Automated Delivery Bot and integrate `mineflayer-web-inventory` for live interactive inventory rendering in the React web dashboard.

**Architecture:**
- Backend: Initialize `mineflayer-web-inventory` on the bot instance in `BotService` (`backend/src/services/bot.js`), serving live WebSocket-backed inventory web viewer.
- Frontend: Add a rich Delivery Control & Monitoring card in `BotDetail.jsx` (Delivery Mode, Target Mode, Post-Delivery Action, Chest Keys, Base Coordinates, Supply Estimator) and integrate an embedded Mineflayer Web Inventory viewer tab in React.

**Tech Stack:** React 18, `mineflayer-web-inventory`, Hono API, Lucide React icons.

## Global Constraints
- JavaScript only (no TypeScript)
- Seamless mobile and desktop Obsidian Command design styling
- Real-time updates via API and WebSocket

---

### Task 1: Integrate `mineflayer-web-inventory` into `BotService`

**Files:**
- Modify: `backend/src/services/bot.js`
- Test: `backend/src/services/bot.test.js` (or node verification script)

**Interfaces:**
- Consumes: `mineflayer-web-inventory`, `this.bot`
- Produces: `this.bot.webInventory` running on configurable port (default 3001)

- [ ] **Step 1: Import `mineflayer-web-inventory` in `backend/src/services/bot.js`**

Add import to `backend/src/services/bot.js`:

```javascript
import inventoryViewer from 'mineflayer-web-inventory';
```

- [ ] **Step 2: Initialize `inventoryViewer` inside bot `spawn` event listener**

In `backend/src/services/bot.js`:

```javascript
try {
  inventoryViewer(this.bot, {
    port: parseInt(process.env.WEB_INVENTORY_PORT || '3001', 10),
    startOnLoad: true,
  });
} catch (err) {
  console.warn('Web inventory viewer init warning:', err.message);
}
```

- [ ] **Step 3: Run node verification to ensure module loads without errors**

Run: `node -e "import('./backend/src/services/bot.js').then(() => console.log('BotService ESM load ok'))"`
Expected: PASS ("BotService ESM load ok")

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/bot.js
git commit -m "feat(bot): integrate mineflayer-web-inventory viewer on bot spawn"
```

---

### Task 2: Build Delivery Control Panel & Mineflayer Web Inventory in React Frontend

**Files:**
- Modify: `frontend/src/pages/BotDetail.jsx`
- Modify: `frontend/src/services/api.js`

**Interfaces:**
- Consumes: `/api/fleet/delivery-config` GET & POST endpoints
- Produces: Delivery Controls card in `BotDetail.jsx` and Mineflayer Web Inventory viewer frame in `BotDetail.jsx`

- [ ] **Step 1: Add API client methods in `frontend/src/services/api.js`**

In `frontend/src/services/api.js`:

```javascript
  getDeliveryConfig: () => request('/fleet/delivery-config'),
  updateDeliveryConfig: (data) => request('/fleet/delivery-config', { method: 'POST', body: JSON.stringify(data) }),
```

- [ ] **Step 2: Add Delivery Config State & Mineflayer Web Inventory View to `BotDetail.jsx`**

Update `frontend/src/pages/BotDetail.jsx` to load `deliveryConfig`, render the Delivery Control & Monitoring section under "Delivery & Chests" tab, and render the live Mineflayer Web Inventory iframe / toggle under the "Inventory" tab.

- [ ] **Step 3: Verify frontend build succeeds**

Run: `cd frontend && npm run build`
Expected: PASS (build completes without error)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/BotDetail.jsx frontend/src/services/api.js
git commit -m "feat(ui): add Delivery Control Panel & Mineflayer Web Inventory viewer tab in React dashboard"
```
