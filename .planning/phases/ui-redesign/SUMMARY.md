# Phase ui-redesign — Planning Summary

**Created:** 2026-07-26
**Status:** Planning Complete
**Plans:** 3 plans in 2 waves

---

## Wave Structure

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | CSS foundation + Layout components |
| 2 | 01-03 | Page component cleanup |

---

## Plans Created

### Plan 01-01: CSS Foundation & Design System (Wave 1)
- **Objective:** Establish single CSS source of truth
- **Files:** `frontend/src/index.css`, delete `frontend/src/styles/main.css`
- **Key tasks:**
  1. Delete duplicate CSS file
  2. Fix hardcoded colors (replace #333333, #888 with variables)
  3. Add spacing tokens (--space-xs through --space-2xl)
  4. Add typography scale classes (.text-body, .text-label, .text-heading, .text-stat)
  5. Create component classes (cards, forms, status, tables, modals, toasts, layout)

### Plan 01-02: Layout & Navigation (Wave 1)
- **Objective:** Implement responsive sidebar + bottom nav
- **Files:** `Layout.jsx`, new `Sidebar.jsx`, new `BottomNav.jsx`
- **Key tasks:**
  1. Refactor Layout.jsx to use CSS classes (zero inline styles)
  2. Create Sidebar.jsx with desktop navigation (240px)
  3. Create BottomNav.jsx with mobile navigation (4 items)
  4. Add Lucide icons to all nav items

### Plan 01-03: Page Components & Error Handling (Wave 2)
- **Objective:** Extract 120+ inline styles, replace alert() with toast
- **Files:** All 11 page components + BotInspector + toast utility
- **Key tasks:**
  1. Create toast utility (`utils/toast.js`)
  2. Replace 17 alert() calls with toast notifications
  3. Extract inline styles from FleetDashboard (30), BotInspector (19), SwarmController (17)
  4. Extract inline styles from all remaining pages
  5. Add missing CSS classes to index.css

---

## Coverage Matrix

| Decision | Plan | Status |
|----------|------|--------|
| D-01: CSS Architecture | 01-01 | ✓ Covered |
| D-02: Typography | 01-01 | ✓ Covered |
| D-03: Color System | 01-01 | ✓ Covered |
| D-04: Responsive Layout | 01-02 | ✓ Covered |
| D-05: Component Contracts | 01-01, 01-03 | ✓ Covered |
| D-06: Error Handling | 01-03 | ✓ Covered |
| D-07: Icons & Visual Hierarchy | 01-02, 01-03 | ✓ Covered |
| D-08: Interaction Rules | 01-01 | ✓ Covered |
| D-09: Copywriting | 01-02 | ✓ Covered |

---

## UI Review Issues Addressed

| Issue | Priority | Plan | Fix |
|-------|----------|------|-----|
| 120 inline styles | P1 | 01-03 | Extract to CSS classes |
| Duplicate CSS files | P1 | 01-01 | Delete main.css |
| alert() for errors | P1 | 01-03 | Replace with toast |
| Typography chaos | P2 | 01-01 | Standardize to 4-role scale |
| Spacing tokens | P2 | 01-01 | Add token variables |
| Missing icons | P3 | 01-02 | Add Lucide icons to nav |
| No hover states | P3 | 01-01 | Add card:hover class |

---

## Next Steps

Execute the plans in order:

```bash
# Wave 1 (parallel)
/gsd-execute-phase ui-redesign --plan 01-01
/gsd-execute-phase ui-redesign --plan 01-02

# Wave 2 (after Wave 1 completes)
/gsd-execute-phase ui-redesign --plan 01-03
```

Or run all plans sequentially:
```bash
/gsd-execute-phase ui-redesign
```

---

*Planning complete: 2026-07-26*
