# UI/UX & Aesthetic Perfection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all UI/UX, responsive breakpoint, typography, button geometry, navigation routing, and visual aesthetic fixes defined in `UI_UX_CRITIQUE_REPORT.md` to achieve a 100% world-class user experience.

**Architecture:** Refactor `App.jsx` to register orphaned routes, upgrade `<Button>` in `components/ui/index.jsx` to support polymorphic `as` rendering, align `Sidebar` and `BottomNav` media queries to eliminate the tablet viewport navigation black hole (768px–1023px), standardize `PluginStore`/`Plugins` with unified design tokens, and enhance dark-mode elevation aesthetics across all pages.

**Tech Stack:** React 18, React Router v6, Tailwind CSS, Lucide React, Vite.

## Global Constraints

- **WCAG AA Compliance:** Text contrast on surface colors must meet or exceed 4.5:1.
- **Touch Targets:** Interactive elements must meet minimum 44px touch geometry guidelines on mobile viewports.
- **Design System Consistency:** Use `<Button>`, `<Card>`, `<Select>`, `<Badge>`, and `<Toggle>` from `components/ui/index.jsx` across all pages. Do not use raw `<button>` elements with inline CSS styles.
- **Polymorphism:** `<Button as={Link} to="...">` must cleanly render React Router `Link` components without forwarding invalid DOM attributes.

---

### File Structure Map

```
frontend/
├── index.html                             # Add Google Fonts Inter link
├── src/
│   ├── index.css                          # Font stack, contrast fix (#828da4), shadow tokens
│   ├── App.jsx                            # Route registration for /fleet/servers & /fleet/tasks
│   ├── components/
│   │   ├── DeliverModal.jsx               # Resize modal from size="full" to size="md"
│   │   ├── BotInspector.jsx               # Responsive inventory slot spacing
│   │   ├── Layout/
│   │   │   ├── Layout.jsx                 # Outlet padding calibration
│   │   │   ├── Sidebar.jsx                # Responsive visibility (hidden lg:flex w-[260px])
│   │   │   ├── BottomNav.jsx              # Responsive visibility (flex lg:hidden)
│   │   │   └── MoreSheet.jsx              # Spring animation & safe-area inset padding
│   │   └── ui/
│   │       ├── index.jsx                  # Polymorphic Button, mobile Tooltip, Modal focus trap
│   │       └── StatusComponents.jsx       # Animated status pulsing dot
│   └── pages/
│       ├── FleetDashboard.jsx             # Fix Button as={Link}, stat grid spacing, batch operations
│       ├── BotControl.jsx                 # Fix card click propagation, form validation
│       ├── BotDetail.jsx                  # Single console log scrollbar, 9-col horizontal scroll
│       ├── SwarmController.jsx            # Fix tasks link, replace native confirm() with ConfirmAction
│       ├── DeliveryPage.jsx               # Pass onDeliverSuccess callback to DeliverModal
│       ├── PluginStore.jsx                # Re-skin with unified UI design tokens & centralized API
│       ├── Plugins.jsx                    # Re-skin with unified UI design tokens
│       ├── Settings.jsx                   # Replace native <details> with SettingsSection
│       └── Login.jsx                      # Radial lighting glow & glassmorphic card styling
```

---

### Task 1: Router Registration & Global Navigation Fixes

**Files:**
- Modify: `frontend/src/App.jsx:1-55`
- Modify: `frontend/src/components/Layout/Sidebar.jsx:15-25`
- Modify: `frontend/src/components/Layout/MoreSheet.jsx:11-15`
- Modify: `frontend/src/pages/SwarmController.jsx:369`

**Interfaces:**
- Consumes: React Router `Route`, `Link`, `ServerManager`, `TaskQueue`
- Produces: Accessible routes `/fleet/servers` and `/fleet/tasks`

- [ ] **Step 1: Update `App.jsx` to register missing routes**

```jsx
import ServerManager from './pages/ServerManager';
import TaskQueue from './pages/TaskQueue';

// Inside <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
<Route path="/fleet/servers" element={<ServerManager />} />
<Route path="/fleet/tasks" element={<TaskQueue />} />
```

- [ ] **Step 2: Add Servers and Task Queue items to `Sidebar.jsx` and `MoreSheet.jsx` nav lists**

```jsx
// In Sidebar.jsx navItems
{ path: '/fleet/servers', label: 'Servers', icon: Server },
{ path: '/fleet/tasks', label: 'Tasks', icon: ListTodo },
```

- [ ] **Step 3: Fix `SwarmController.jsx` task navigation link**

Update line 369 in `SwarmController.jsx` to navigate to `/fleet/tasks?swarm=${selectedSwarm.id}`.

- [ ] **Step 4: Verify navigation links render and route correctly in browser**

Run: `cd frontend && npm run build`
Expected: Build passes clean without React Router warnings.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Layout/Sidebar.jsx frontend/src/components/Layout/MoreSheet.jsx frontend/src/pages/SwarmController.jsx
git commit -m "fix(nav): register orphaned routes /fleet/servers and /fleet/tasks"
```

---

### Task 2: Responsive Tablet Viewport Navigation Fix (768px – 1023px)

**Files:**
- Modify: `frontend/src/components/Layout/Sidebar.jsx:26-30`
- Modify: `frontend/src/components/Layout/BottomNav.jsx:17-21`
- Modify: `frontend/src/components/Layout/Layout.jsx:12-18`

**Interfaces:**
- Consumes: CSS media queries `lg:` (1024px)
- Produces: Seamless tablet viewport navigation layout

- [ ] **Step 1: Update `Sidebar.jsx` visibility classes**

Change line 27 from `max-lg:hidden max-[1025px]:!w-[64px]` to `hidden lg:flex w-[260px]`.

- [ ] **Step 2: Update `BottomNav.jsx` visibility classes**

Change line 18 from `hidden max-md:flex` to `flex lg:hidden`.

- [ ] **Step 3: Update `Layout.jsx` outlet layout padding**

Change line 14 from `ml-[260px] max-md:ml-0` to `lg:ml-[260px] ml-0 p-4 sm:p-6 lg:p-8 pb-[calc(var(--bottom-nav-height)+24px)] lg:pb-8`.

- [ ] **Step 4: Verify tablet breakpoint (800px) shows BottomNav navigation**

Run: `cd frontend && npm run build`
Expected: Build passes cleanly.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout/Sidebar.jsx frontend/src/components/Layout/BottomNav.jsx frontend/src/components/Layout/Layout.jsx
git commit -m "fix(layout): eliminate tablet navigation black hole between 768px and 1023px"
```

---

### Task 3: Core UI Component Library & Typography Upgrades

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css:15-25`
- Modify: `frontend/src/components/ui/index.jsx:4-45`
- Modify: `frontend/src/components/ui/StatusComponents.jsx`

**Interfaces:**
- Consumes: Dynamic `as` component prop, Tailwind CSS classes, Google Fonts Inter
- Produces: Polymorphic `<Button>`, pulse status badges, 4.6:1 WCAG text contrast

- [ ] **Step 1: Add Google Fonts Inter link to `frontend/index.html`**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Update `--color-mdb-text-muted` contrast token in `index.css`**

Change `--color-mdb-text-muted: #5a6478;` to `--color-mdb-text-muted: #828da4;` for 4.6:1 WCAG AA compliance.

- [ ] **Step 3: Upgrade `Button` component in `components/ui/index.jsx` to support polymorphism and 44px touch targets**

```jsx
export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  icon: iconProp,
  loading,
  disabled,
  className = '',
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.98] select-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mdb-primary focus-visible:ring-offset-2 focus-visible:ring-offset-mdb-bg';
  const sizes = {
    sm: 'h-9 px-3.5 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-sm font-semibold gap-2.5 shadow-lg shadow-mdb-primary/10',
  };
  const variants = {
    primary: 'bg-mdb-primary text-white hover:bg-mdb-primary-hover shadow-md shadow-mdb-primary/20',
    secondary: 'border border-mdb-border bg-mdb-surface text-mdb-text-secondary hover:bg-mdb-surface-high hover:text-mdb-text hover:border-mdb-border-hover',
    ghost: 'text-mdb-text-secondary hover:text-mdb-text hover:bg-mdb-surface-high',
    danger: 'bg-mdb-error/15 text-mdb-error hover:bg-mdb-error hover:text-white border border-mdb-error/20 shadow-sm',
    success: 'bg-mdb-success/15 text-mdb-success hover:bg-mdb-success hover:text-white border border-mdb-success/20 shadow-sm',
  };
  const disabledCls = disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none active:scale-100' : '';

  return (
    <Component
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabledCls} ${className}`}
      disabled={Component === 'button' ? (disabled || loading) : undefined}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <>
          {iconProp && <span className="shrink-0 flex items-center justify-center">{iconProp}</span>}
          {children}
        </>
      )}
    </Component>
  );
}
```

- [ ] **Step 4: Add live status pulsing animation in `StatusComponents.jsx`**

```jsx
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mdb-success opacity-75" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-mdb-success" />
</span>
```

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 6: Commit**

```bash
git add frontend/index.html frontend/src/index.css frontend/src/components/ui/index.jsx frontend/src/components/ui/StatusComponents.jsx
git commit -m "feat(ui): polymorphic Button component, Inter font load, 4.6:1 WCAG contrast token"
```

---

### Task 4: Page Usability & Mobile Layout Optimizations

**Files:**
- Modify: `frontend/src/pages/FleetDashboard.jsx`
- Modify: `frontend/src/pages/BotControl.jsx`
- Modify: `frontend/src/pages/BotDetail.jsx`
- Modify: `frontend/src/pages/DeliveryPage.jsx`
- Modify: `frontend/src/components/DeliverModal.jsx`

**Interfaces:**
- Consumes: `<Button as={Link}>`, `DeliverModal`, Horizontal Scroll Grid
- Produces: Mobile-friendly inventory grid, non-blocking card buttons, auto-refreshing delivery chest lists

- [ ] **Step 1: Refactor `FleetDashboard.jsx` stat grid and `Button as={Link}` usage**

Update line 82 & 105 to use polymorphic `<Button as={Link} to="/fleet/bots">`. Update stat grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

- [ ] **Step 2: Refactor `BotControl.jsx` card click handlers**

Remove card wrapper `onClick` navigation and isolate navigation trigger to the "Details" button to prevent mobile touch misfires.

- [ ] **Step 3: Refactor `BotDetail.jsx` 36-slot inventory grid with horizontal scroll wrapper**

```jsx
<div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
  <div className="grid grid-cols-9 gap-1 bg-mdb-surface-low p-2 rounded-2xl border border-mdb-border min-w-[460px]">
    ...
  </div>
</div>
```

- [ ] **Step 4: Update `DeliveryPage.jsx` to pass `onDeliverSuccess` to `DeliverModal`**

```jsx
<DeliverModal
  isOpen={!!deliver}
  onClose={() => setDeliver(null)}
  chestName={deliver.chestName}
  botId={deliver.botId}
  onDeliverSuccess={() => {
    api.fleet.getChests().then(setChests).catch(() => {});
  }}
/>
```

- [ ] **Step 5: Resize `DeliverModal.jsx` modal container size to `size="md"`**

Change `size="full"` to `size="md"` in `DeliverModal.jsx:63`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/FleetDashboard.jsx frontend/src/pages/BotControl.jsx frontend/src/pages/BotDetail.jsx frontend/src/pages/DeliveryPage.jsx frontend/src/components/DeliverModal.jsx
git commit -m "fix(mobile): responsive inventory grid, isolated card buttons, auto-refreshing delivery lists"
```

---

### Task 5: Design System Unification & Aesthetics (`PluginStore`, `Plugins`, `Login`)

**Files:**
- Modify: `frontend/src/pages/PluginStore.jsx`
- Modify: `frontend/src/pages/Plugins.jsx`
- Modify: `frontend/src/pages/Settings.jsx`
- Modify: `frontend/src/pages/Login.jsx`

**Interfaces:**
- Consumes: `<Card>`, `<Button>`, `<Select>`, `<Toggle>`, `<SettingsSection>`, Ambient radial glow CSS
- Produces: Visual design system harmony across all application modules

- [ ] **Step 1: Re-skin `PluginStore.jsx` and `Plugins.jsx` with shared UI components**

Replace raw `<button>` elements, hardcoded CSS colors (`bg-mdb-online`), and direct `fetch()` calls with `<Button>`, `<Card>`, `<Badge>`, `<Toggle>`, and `api.pluginStore` calls.

- [ ] **Step 2: Replace native `<details>` in `Settings.jsx` with `<SettingsSection>`**

Replace line 323 `<details>` block with `<SettingsSection title="Advanced Delivery Settings" defaultOpen={false}>`.

- [ ] **Step 3: Upgrade `Login.jsx` visual hero aesthetics**

Add ambient radial glow backdrop (`bg-mdb-primary/10 rounded-full blur-[120px]`) and glassmorphic card styling.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PluginStore.jsx frontend/src/pages/Plugins.jsx frontend/src/pages/Settings.jsx frontend/src/pages/Login.jsx
git commit -m "style(design-system): unify PluginStore and Plugins with core design tokens and elevate Login page"
```

---

### Task 6: Final Verification & Build Validation

**Files:**
- Test: All modified files

- [ ] **Step 1: Run production build check**

Run: `cd frontend && npm run build`
Expected: Build succeeds without TypeScript/JSX syntax errors or missing module warnings.

- [ ] **Step 2: Commit final implementation state**

```bash
git commit --allow-empty -m "chore(release): UI/UX perfection implementation completed and verified"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-ui-ux-perfection-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
