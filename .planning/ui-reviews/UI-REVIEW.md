# UI Review — MDB Platform

**Audited:** 2026-07-26
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md)
**Screenshots:** Not captured (code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Generic labels, raw alert() errors, no contextual help |
| 2. Visuals | 2/4 | 120 inline styles, no icons in content, flat hierarchy |
| 3. Color | 3/4 | Dark theme variables defined, consistent status colors, duplicate CSS file |
| 4. Typography | 2/4 | 12+ font sizes, mix of px/rem, no typographic scale |
| 5. Spacing | 2/4 | 120 inline styles with hardcoded px, no spacing tokens |
| 6. Experience Design | 3/4 | Loading/empty/confirm states present, but alert() errors, no error boundaries |

**Overall: 15/24**

---

## Top 3 Priority Fixes

1. **120 inline styles bypass CSS system** — Maintenance nightmare, inconsistent spacing, impossible to theme — Extract all inline `style={{}}` to CSS classes using the existing variable system
2. **Duplicate CSS files with mismatched variables** — `index.css` uses `--fg-primary`, `main.css` uses `--text-primary`, only `index.css` is imported — Delete `styles/main.css` or consolidate
3. **alert() for error handling** — Native alerts block UX, look unprofessional — Replace with toast notifications (ToastProvider already exists but unused for errors)

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**Generic button labels:**
- `pages/KitOrder.jsx:118` — "Submit Order" (acceptable but could be "Deliver Kit")
- `pages/ChestManager.jsx:123` — "Cancel" used 6 times across pages
- `pages/Settings.jsx:97` — "Delete" used for users with no context

**Empty states — GOOD:**
- `pages/FleetDashboard.jsx:127` — "No bots yet" + "Add your first bot to get started"
- `pages/SwarmController.jsx:144` — "No swarms yet" + "Create a swarm to group your bots"
- `pages/ChestManager.jsx:133` — "No chest locations" + "Add chest locations to store items for delivery"

**Error handling — POOR:**
- 17 instances of `alert('Failed to ${action}: ' + err.message)` across all pages
- Raw error messages exposed to users (e.g., "Failed to load bot data: HTTP 404")
- No user-friendly error recovery suggestions

**Missing:**
- No tooltips on icon buttons
- No inline help text on complex forms (KitOrder, BotControl)
- No keyboard shortcut hints

### Pillar 2: Visuals (2/4)

**Inline style epidemic:**
- 120 `style={{}}` instances across JSX files
- `pages/FleetDashboard.jsx` — 30 inline styles
- `components/BotInspector.jsx` — 19 inline styles
- `pages/SwarmController.jsx` — 17 inline styles

**Flat visual hierarchy:**
- FleetDashboard stats grid has no focal point — all cards look identical
- No iconography in content areas (Layout uses Lucide but pages don't)
- BotInspector inventory uses raw text instead of visual grid

**Missing:**
- No visual status indicators beyond color (no icons, no patterns)
- No hover states on interactive cards
- No transition animations on state changes

### Pillar 3: Color (3/4)

**Dark theme — GOOD:**
- CSS variables properly defined: `--bg-primary: #121212`, `--bg-secondary: #1e1e1e`, `--accent: #6200ea`
- 60/30/10 split roughly maintained
- Status colors consistent: `--success: #4caf50`, `--danger: #dc3545`, `--warning: #f5a623`

**Issues:**
- `index.css:76` — Hardcoded `#333333` instead of `var(--border)`
- `index.css:80` — Hardcoded `#888` instead of `var(--fg-secondary)`
- `index.css:119` — Hardcoded `#333333` again
- `index.css:143` — Hardcoded `#121212` for btn-warning color

**Duplicate CSS file:**
- `styles/main.css` defines `--text-primary`, `--text-secondary`, `--text-muted`
- `index.css` defines `--fg-primary`, `--fg-secondary`
- Only `index.css` is imported — `main.css` is dead code

### Pillar 4: Typography (2/4)

**Font size chaos:**
- CSS uses: 11px, 12px, 13px, 14px, 16px, 18px, 20px, 24px, 48px, 1.25rem, 1.5rem
- JSX inline uses: 8px, 10px, 12px, 13px
- No typographic scale (e.g., modular scale 1.25)

**Font weights — ACCEPTABLE:**
- 500 (medium), 600 (semibold), 700 (bold) used consistently
- No extrabold or thin weights

**Issues:**
- Mix of px and rem units in same file
- `fontSize: '8px'` in BotInspector.jsx — too small for readability
- `fontSize: '10px'` in StatusComponents.jsx — borderline

### Pillar 5: Spacing (2/4)

**No spacing system:**
- Arbitrary values: 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 60px
- No consistent spacing tokens or scale
- Inline styles use px directly instead of CSS classes

**Inline style hotspots:**
- `pages/FleetDashboard.jsx` — 30 inline styles with spacing values
- `components/BotInspector.jsx` — 19 inline styles
- `pages/SwarmController.jsx` — 17 inline styles

**CSS classes exist but unused:**
- `.card-body`, `.card-header`, `.card-footer` defined but most pages use inline padding
- `.form-group` and `.form-label` used consistently — GOOD

### Pillar 6: Experience Design (3/4)

**Loading states — GOOD:**
- All pages have `loading-screen` + `spinner` pattern
- Login shows "Logging in..." text

**Empty states — GOOD:**
- All list pages have empty states with helpful copy and CTAs

**Confirmation dialogs — GOOD:**
- Destructive actions (delete) use `confirm()` — 6 instances

**Error handling — POOR:**
- `alert()` used for all error feedback — blocks UX
- ToastProvider exists but not used for errors
- No error boundaries for component crashes

**Missing:**
- No skeleton loading states
- No optimistic updates
- No retry mechanisms on failed loads
- No disabled states on buttons during async operations (except Login)

---

## Files Audited

- `frontend/src/index.css` (1408 lines)
- `frontend/src/styles/main.css` (288 lines — dead code)
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/services/api.js`
- `frontend/src/components/Layout/Layout.jsx`
- `frontend/src/components/ToastContainer.jsx`
- `frontend/src/components/BotInspector.jsx`
- `frontend/src/components/ui/StatusComponents.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/FleetDashboard.jsx`
- `frontend/src/pages/BotControl.jsx`
- `frontend/src/pages/SwarmController.jsx`
- `frontend/src/pages/ChestManager.jsx`
- `frontend/src/pages/KitOrder.jsx`
- `frontend/src/pages/Chat.jsx`
- `frontend/src/pages/Settings.jsx`
- `frontend/src/pages/ServerManager.jsx`
- `frontend/src/pages/TaskQueue.jsx`
