---
phase: ui-redesign
status: complete
created: 2026-07-26
plan_count: 3
wave_count: 2
---

# Plan Outline — ui-redesign

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| 01-01 | CSS Foundation & Design System | 1 | [] | D-01, D-02, D-03 |
| 01-02 | Layout & Navigation | 1 | [] | D-04, D-07 |
| 01-03 | Page Components & Error Handling | 2 | [01-01, 01-02] | D-05, D-06, D-08, D-09 |

## Wave Structure

**Wave 1 (Parallel):**
- 01-01: CSS Foundation — Delete duplicate CSS, fix hardcoded colors, add tokens and component classes
- 01-02: Layout — Create Sidebar.jsx and BottomNav.jsx, refactor Layout.jsx

**Wave 2 (Sequential):**
- 01-03: Pages — Extract 120+ inline styles, replace alert() with toast notifications

## Coverage

- D-01 (CSS Architecture): 01-01 ✓
- D-02 (Typography): 01-01 ✓
- D-03 (Color System): 01-01 ✓
- D-04 (Responsive Layout): 01-02 ✓
- D-05 (Component Contracts): 01-01, 01-03 ✓
- D-06 (Error Handling): 01-03 ✓
- D-07 (Icons & Visual Hierarchy): 01-02, 01-03 ✓
- D-08 (Interaction Rules): 01-01 ✓
- D-09 (Copywriting): 01-02 ✓

## Estimated Context Usage

- Plan 01-01: ~25% (CSS modifications)
- Plan 01-02: ~30% (new components + refactor)
- Plan 01-03: ~45% (11 files to modify)
- Total: ~100% across 3 plans (each plan is independent execution)

## OUTLINE COMPLETE
