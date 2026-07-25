# Phase: ui-redesign - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning
**Source:** UI-SPEC.md (approved design contract) + UI-REVIEW.md (code audit)

<domain>
## Phase Boundary

Redesign the Minecraft Kit Bot frontend to achieve a mobile-native app feel with proper desktop scaling. The goal is to eliminate all anti-patterns identified in the UI review and implement the design system defined in UI-SPEC.md.

**Key deliverables:**
- Extract 120+ inline styles to CSS classes using the variable system
- Eliminate duplicate CSS files (delete `styles/main.css`)
- Replace all `alert()` error handling with toast notifications
- Implement responsive layout (mobile bottom nav, desktop sidebar)
- Standardize typography to the 4-role scale (Body, Label, Heading, Stat)
- Add proper spacing tokens (xs, sm, md, lg, xl, 2xl)
- Add icons to content areas using Lucide React
- Implement hover states on interactive cards
- Fix hardcoded colors to use CSS variables

</domain>

<decisions>
## Implementation Decisions

### D-01: CSS Architecture
- Single `index.css` file with all variables and classes (per UI-SPEC anti-pattern #9)
- Delete `styles/main.css` (dead code, only `index.css` is imported)
- All spacing must use the declared tokens: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), 2xl(48px)

### D-02: Typography Standardization
- Exactly 4 font sizes: 12px (Label), 14px (Body), 18px (Heading), 24px (Stat)
- Exactly 2 font weights: 400 (body) and 600 (headings/labels/stats)
- No italic, no uppercase, no letter-spacing tricks
- No font sizes below 12px (accessibility)

### D-03: Color System
- Replace all hardcoded colors with CSS variables
- Accent (#6200ea) is ONLY for active nav indicator (left border on sidebar, bottom border on mobile)
- Primary buttons use `#6200ea` background, not accent-colored borders
- 60/30/10 distribution: 60% `#121212`, 30% `#1e1e1e`, 10% `#2a2a2a` + semantic

### D-04: Responsive Layout
- Mobile (< 768px): Bottom navigation with 4 items (Dashboard, Bots, Tasks, More)
- Desktop (>= 768px): Left sidebar (240px fixed) with full navigation
- Tablet (768px-1024px): Sidebar collapses to icon-only (64px)
- Modals become full-screen sheets on mobile

### D-05: Component Contracts
- Cards: background `#1e1e1e`, border 1px `#333333`, border-radius 8px, padding 16px, no shadow
- Buttons: height 36px (default), 32px (sm), 40px (lg), border-radius 6px
- Forms: input height 40px, background `#2a2a2a`, border 1px `#333333`
- Status indicators: 8px colored dots with text labels (no badges with backgrounds)
- Tables: no zebra striping, border-bottom 1px `#333333`, row hover `#2a2a2a`

### D-06: Error Handling
- Replace all 17 `alert()` calls with toast notifications
- ToastProvider already exists but is unused for errors
- Error messages: hide technical details, show user-friendly text
- Toast: bottom-right position, auto-dismiss 3s for success, manual dismiss for errors

### D-07: Icons and Visual Hierarchy
- Use Lucide React icons in content areas (currently only used in Layout)
- Add `aria-label` to all icon-only buttons
- Focal point: status indicator (colored dot + label) is first thing eyes see
- Add hover states on interactive cards (border-color change to `#444444`)

### D-08: Interaction Rules
- Minimum 48px touch targets on mobile (iOS HIG)
- Minimum 36px on desktop
- Button click: opacity change (0.8) immediately
- Form submit: disable button, show "Processing..." text
- All transitions: 0.15s ease
- No scale transforms, no bounce animations, no slide-ins
- Page transitions: none (instant swap)

### D-09: Copywriting
- Primary CTA: specific verb + noun ("Add Bot", "Create Swarm", "Order Kit")
- Empty state: "{Noun} not found" or "No {noun} yet" + action verb
- Error state: "{What failed}. {What to do next}" — never raw error messages
- Destructive confirmation: "Delete {item}? This cannot be undone."
- No "Submit", no "Click here", no "OK"

### OpenCode's Discretion
- Implementation order of components (recommend starting with Layout, then pages)
- Whether to create a dedicated Toast component or use existing ToastProvider
- Specific animation timing within the 0.15s ease constraint
- Whether to add a dark/light theme toggle (not in current scope but mentioned in roadmap)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `.planning/UI-SPEC.md` — Complete design contract (colors, typography, spacing, components)
- `.planning/ui-reviews/UI-REVIEW.md` — Current state audit with 120 inline styles, duplicate CSS, alert() calls

### Existing Code
- `frontend/src/index.css` — Current CSS (1409 lines, needs cleanup)
- `frontend/src/styles/main.css` — Duplicate CSS to delete
- `frontend/src/App.jsx` — Route structure and page imports
- `frontend/src/components/Layout/Layout.jsx` — Current layout (sidebar/header)
- `frontend/src/pages/*.jsx` — All page components with inline styles

### Technical Reference
- `frontend/package.json` — Dependencies (Lucide React already installed)
- `frontend/vite.config.js` — Build configuration

</canonical_refs>

<specifics>
## Specific Ideas

### Inline Style Extraction Priority
Based on UI-REVIEW.md, extract inline styles from highest-count files first:
1. `pages/FleetDashboard.jsx` — 30 inline styles
2. `components/BotInspector.jsx` — 19 inline styles
3. `pages/SwarmController.jsx` — 17 inline styles
4. All other pages: 2-10 inline styles each

### Toast Notification Integration
- ToastProvider exists in `components/Notifications/` but is unused for errors
- Replace `alert('Failed to ${action}: ' + err.message)` with toast calls
- Pattern: `toast.error('Failed to ${action}. Please try again.')`

### Responsive Layout Implementation
- Mobile bottom nav: 56px height, 24px icons, 12px labels
- Desktop sidebar: 240px fixed width, full navigation
- Tablet: sidebar collapses to 64px icon-only
- Use CSS media queries, not JavaScript

### Hardcoded Color Fixes
- `index.css:76` — `#333333` → `var(--border)`
- `index.css:80` — `#888` → `var(--fg-secondary)`
- `index.css:119` — `#333333` → `var(--border)`
- `index.css:143` — `#121212` → `var(--bg-primary)`

</specifics>

<deferred>
## Deferred Ideas

- Dark/light theme toggle (mentioned in ROADMAP.md Milestone 3 but not in current UI-SPEC)
- Push notifications implementation (requires backend changes)
- PWA service worker updates (separate from UI redesign)
- Performance optimization (lazy loading, code splitting)

</deferred>

---

*Phase: ui-redesign*
*Context gathered: 2026-07-26 via UI-SPEC.md + UI-REVIEW.md*
