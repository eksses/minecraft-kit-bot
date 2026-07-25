---
phase: ui-redesign
slug: ui-redesign
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-26
reviewed_at: 2026-07-26
---

# UI Redesign — UI Design Contract

> Mobile-native app feel with proper desktop scaling. Minimal, no AI slop. Every pixel intentional.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom CSS with variables) |
| Preset | not applicable |
| Component library | none (vanilla React + CSS) |
| Icon library | Lucide React (already installed) |
| Font | System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto) |

**Principles:**
- Mobile-first, but desktop gets a real desktop layout (not centered mobile card)
- No accent color abuse — accent is for ONE thing: active nav indicator
- No AI slop: no unnecessary gradients, no floating cards with shadows on every element
- 48px minimum touch targets on mobile
- Content density: show data, not decoration

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline badge padding |
| sm | 8px | Compact element gaps, input padding |
| md | 16px | Card padding, list item gaps |
| lg | 24px | Section padding, page margins |
| xl | 32px | Major section breaks |
| 2xl | 48px | Page-level spacing (desktop only) |

**Exceptions:** None. All spacing must use these tokens.

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 14px | 400 | 1.5 | Default text, descriptions, form labels, table rows |
| Label | 12px | 500 | 1.4 | Badges, status text, metadata, nav labels |
| Heading | 18px | 600 | 1.3 | Page titles, card headers, modal titles |
| Stat | 24px | 600 | 1.2 | Dashboard numbers, big counters |

**Rules:**
- No font sizes below 12px (accessibility)
- No font sizes above 24px in regular UI (no display sizes — this is a dashboard, not a landing page)
- Weights only: 400 (body) and 600 (headings/labels/stats) — exactly 2 weights
- No italic, no uppercase, no letter-spacing tricks

---

## Color

### Dark Theme (default)

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#121212` | Page background |
| Secondary (30%) | `#1e1e1e` | Cards, sidebar, modals |
| Tertiary (10%) | `#2a2a2a` | Input backgrounds, hover states |
| Text primary | `#e0e0e0` | Body text, headings |
| Text secondary | `#bbbbbb` | Labels, metadata, descriptions |
| Border | `#333333` | Dividers, card borders, input borders |

### Semantic Colors

| Role | Value | Usage |
|------|-------|-------|
| Success | `#4caf50` | Online status, completed tasks |
| Warning | `#f5a623` | Working status, pending attention |
| Danger | `#dc3545` | Offline/error status, destructive actions |
| Accent | `#6200ea` | Active nav indicator ONLY |

### Accent Usage Rules

Accent is reserved for **exactly one element**: the active navigation indicator (left border on sidebar nav, bottom border on mobile bottom nav). Nothing else. Not buttons, not links, not icons, not highlights.

### 60/30/10 Distribution

- 60%: `#121212` background
- 30%: `#1e1e1e` surfaces (cards, sidebar, modals)
- 10%: `#2a2a2a` tertiary + semantic colors for status indicators

---

## Layout Contract

### Mobile (< 768px)

- **Bottom navigation** with 4 items max: Dashboard, Bots, Tasks, More
- Bottom nav height: 56px, icons 24px, labels 12px
- Page content scrolls above bottom nav
- No sidebar on mobile
- Full-width cards, 16px page padding
- Modals become full-screen sheets

### Desktop (>= 768px)

- **Left sidebar** with full navigation (not bottom nav)
- Sidebar width: 240px, fixed position
- Main content area fills remaining width
- Two-column layout for dashboard (stats left, activity right)
- Cards use grid layout, not stacked
- Max content width: 1200px (prevents stretching on ultrawide)

### Tablet (768px - 1024px)

- Sidebar collapses to icon-only (64px)
- Labels hidden, icons remain
- Content area uses full remaining width

---

## Component Contracts

### Visual Hierarchy

- **Focal point:** Status indicator (colored dot + label) is the first thing eyes land on in any card/list
- **Secondary:** Card title/heading
- **Tertiary:** Supporting details (metadata, timestamps)
- **Accessibility:** All icon-only buttons must have `aria-label` or visible text fallback

### Cards

- Background: `#1e1e1e`
- Border: 1px `#333333`
- Border-radius: 8px
- Padding: 16px
- No box-shadow on default state
- Hover: border-color changes to `#444444` (subtle, not dramatic)
- No elevation/shadow system — flat design

### Buttons

| Type | Background | Text | Border | Usage |
|------|-----------|------|--------|-------|
| Primary | `#6200ea` | white | none | Main CTA (one per page max) |
| Secondary | `#2a2a2e` | `#e0e0e0` | 1px `#333333` | Alternative actions |
| Danger | `#dc3545` | white | none | Destructive actions |
| Ghost | transparent | `#bbbbbb` | none | Tertiary actions, cancel |

- Height: 36px (default), 32px (sm), 40px (lg)
- Border-radius: 6px
- Padding: 0 16px
- Font: 14px, weight 500
- No gradients, no shadows on buttons

### Forms

- Input height: 40px
- Input background: `#2a2a2a`
- Input border: 1px `#333333`
- Input border-radius: 6px
- Input padding: 0 12px
- Focus: border-color `#6200ea` (accent only on focus)
- Label: 14px, weight 500, `#bbbbbb`
- Error: border `#dc3545`, text `#dc3545`

### Status Indicators

- Use colored dots (8px circles) with text labels
- No badges with backgrounds for status — keep it minimal
- Colors: success=#4caf50, warning=#f5a623, danger=#dc3545, offline=#666666

### Tables

- No zebra striping
- Border-bottom: 1px `#333333` on each row
- Header: 12px, weight 500, `#bbbbbb`
- Body: 14px, weight 400, `#e0e0e0`
- Row hover: background `#2a2a2a`

### Modals

- Overlay: `rgba(0, 0, 0, 0.7)`
- Modal background: `#1e1e1e`
- Border-radius: 12px
- Max-width: 480px (mobile: full-screen)
- Header: 18px, weight 600
- Footer: right-aligned buttons, 16px gap

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Specific verb + noun: "Add Bot", "Create Swarm", "Order Kit" |
| Empty state heading | "{Noun} not found" or "No {noun} yet" |
| Empty state body | "{Action verb} to get started" with specific next step |
| Error state | "{What failed}. {What to do next}" — never raw error messages |
| Destructive confirmation | "Delete {item}? This cannot be undone." |

**Rules:**
- No "Submit" — always specific verb
- No "Click here" — always descriptive
- No "OK" — always specific action
- Error messages: hide technical details, show user-friendly text
- Loading states: "Loading {noun}..." not generic "Loading..."

---

## Interaction Rules

### Touch Targets

- Minimum 48px on mobile (iOS HIG)
- Minimum 36px on desktop
- Icon-only buttons: 44px minimum tap area

### Feedback

- Button click: opacity change (0.8) immediately
- Form submit: disable button, show "Processing..." text
- Success: toast notification (bottom-right), auto-dismiss 3 seconds
- Error: toast notification with red border, manual dismiss
- Loading: inline spinner (not full-page) for async operations

### Transitions

- All transitions: 0.15s ease
- Hover states: background-color or border-color change only
- No scale transforms, no bounce animations, no slide-ins
- Page transitions: none (instant swap)

---

## Anti-Patterns (What NOT to Do)

1. **No accent on buttons** — Primary buttons use `#6200ea` background, not accent-colored borders/highlights
2. **No shadows everywhere** — Cards have border, not shadow. Shadows only on modals/dropdowns
3. **No gradient backgrounds** — Flat colors only
4. **No centered mobile layout on desktop** — Desktop uses full width with sidebar
5. **No cluttered pages** — One primary action per page, everything else secondary
6. **No emoji in UI** — Lucide icons only
7. **No AI slop patterns** — No "Welcome back, {username}!" banners, no unnecessary avatars, no decorative illustrations
8. **No inline styles** — All styles via CSS classes using variables
9. **No duplicate CSS files** — Single `index.css` with all variables and classes

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-26
