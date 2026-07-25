# Phase ui-redesign — UI Review

**Audited:** 2026-07-26
**Baseline:** UI-SPEC.md (approved design contract)
**Screenshots:** Not captured (code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Generic labels and missing noun-loading states |
| 2. Visuals | 2/4 | 50 inline styles remain, no aria-labels on icon buttons |
| 3. Color | 3/4 | CSS variables established, accent correctly scoped, no hardcoded colors |
| 4. Typography | 1/4 | 7 font sizes in use (spec allows 4), 3 sizes below 12px minimum, 48px font used |
| 5. Spacing | 3/4 | Spacing tokens defined but 50 inline style overrides bypass them |
| 6. Experience Design | 1/4 | 5 pages completely inaccessible from mobile nav, no "More" menu, no back navigation |

**Overall: 12/24**

---

## Top 3 Priority Fixes

1. **Mobile navigation is broken** — 5 pages (Servers, Swarms, Chests, Order Kit, Chat) are completely inaccessible from mobile. The "More" button goes to /settings instead of showing a dropdown with hidden nav items. Users on phones cannot access 56% of the app. **Fix:** Redesign BottomNav with a "More" dropdown/sheet that lists all 9 pages, or use a scrollable horizontal nav with all items.

2. **Typography violates the design contract** — 7 distinct font sizes are used (spec allows exactly 4: 12, 14, 18, 24). Font sizes 8px, 10px, 11px, 13px, 16px, 20px, and 48px are all violations. The 48px stat counter and 8px inventory labels violate accessibility minimums. **Fix:** Replace all non-standard sizes with the 4 declared sizes. Inventory slot text should be 12px minimum.

3. **50 inline styles remain** — UI-SPEC anti-pattern #8 says "No inline styles." The StatusComponents.jsx file alone has 16 inline styles, BotInspector.jsx has 11, and TaskQueue.jsx has 7. These bypass the CSS variable system and make theming impossible. **Fix:** Extract all inline styles to CSS classes in index.css.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**Findings:**

1. **Loading states lack nouns** — UI-SPEC requires "Loading {noun}..." but many pages say generic "Loading..." with no context.
   - `App.jsx:22` — `Loading...` (should be "Loading...")
   - `pages/FleetDashboard.jsx` — loading screen says just "Loading..."
   - `pages/BotControl.jsx` — same
   - `pages/SwarmController.jsx` — same

2. **Login page exposes credentials** — `Login.jsx:68` shows "Default credentials: admin / password" in the footer. This is a security concern in production.

3. **Generic error fallback** — `AuthContext.jsx` has error handling but some pages still show raw `err.message` via toast, e.g. `BotControl.jsx:45` passes `err.message` to toast (though it's wrapped, the message itself may be technical).

4. **No confirmation before destructive actions in some places** — `handleDeleteBot` uses `confirm()` (native browser dialog, not styled) while UI-SPEC wants custom destructive confirmation.

5. **Empty states are decent** — "No bots yet", "No swarms yet", "No messages yet" follow the spec pattern.

### Pillar 2: Visuals (2/4)

**Findings:**

1. **50 inline styles remain** — Violates UI-SPEC anti-pattern #8. Breakdown:
   - `StatusComponents.jsx` — 16 inline styles (progress bars, badges, stat cards)
   - `BotInspector.jsx` — 11 inline styles (margins, inventory grid, form layout)
   - `TaskQueue.jsx` — 7 inline styles (flex layouts, badge colors)
   - `SwarmController.jsx` — 6 inline styles (margins, form width)
   - `FleetDashboard.jsx` — 2 inline styles (stat colors)
   - `BotControl.jsx` — 2 inline styles (progress bar widths)
   - `Dashboard.jsx` — 4 inline styles (stat icon colors)
   - `Chat.jsx` — 1 inline style (input field)
   - `Settings.jsx` — 1 inline style (badge)
   - `KitOrder.jsx` — 1 inline style (card maxWidth)
   - `Sidebar.jsx` — 1 inline style (border)

2. **No aria-labels on icon-only buttons** — UI-SPEC requires aria-label on all icon-only buttons. Found violations:
   - `BotInspector.jsx:88` — `&times;` close button has no aria-label
   - `SwarmController.jsx:104` — modal close button has no aria-label
   - `BottomNav.jsx:27` — NavLink with Icon has label text but is not explicitly aria-labeled

3. **Status badges use background colors** — UI-SPEC says "No badges with backgrounds for status — keep it minimal. Use colored dots (8px circles) with text labels." But `StatusComponents.jsx:20-26` renders badges with `backgroundColor`:
   ```
   backgroundColor: status === 'IDLE' ? 'var(--success)' : ...
   ```

4. **Card shadows exist** — `index.css:375` defines `box-shadow: 0 4px 16px var(--shadow)` on cards. UI-SPEC says "No box-shadow on default state" and "flat design." Cards should use border only.

5. **BotInspector drawer has no mobile-optimized close** — The `&times;` character is used instead of a Lucide X icon, and the drawer overlay doesn't have explicit mobile full-screen behavior.

### Pillar 3: Color (3/4)

**Findings:**

1. **CSS variables are properly defined** — `index.css:7-22` correctly defines all semantic colors matching UI-SPEC.

2. **Accent is correctly scoped** — Only used on `.nav-item.active` border-left (sidebar) and border-top (bottom nav). No accent abuse on buttons or links.

3. **60/30/10 distribution is maintained** — `--bg-primary` (#121212) dominates, `--bg-secondary` (#1e1e1e) for surfaces, `--bg-tertiary` (#2a2a2a) for inputs/hovers.

4. **Minor issue: `--shadow` variable** — `rgba(0, 0, 0, 0.5)` is defined but shadows should not exist per spec. The variable itself is fine but its usage on cards violates the flat design rule.

5. **Semantic colors are correct** — success=#4caf50, warning=#f5a623, danger=#dc3545 all match spec.

### Pillar 4: Typography (1/4)

**Findings (CRITICAL):**

1. **7 font sizes in use (spec allows exactly 4)** — Actual sizes found in CSS:
   - `8px` — used in BotInspector inventory slots (BELOW 12px minimum)
   - `10px` — used in inventory slot text (BELOW 12px minimum)
   - `11px` — used somewhere in CSS (BELOW 12px minimum)
   - `12px` — allowed (Label role)
   - `13px` — used 7 times in index.css (NOT in spec)
   - `14px` — allowed (Body role)
   - `16px` — used (NOT in spec)
   - `18px` — allowed (Heading role)
   - `20px` — used in Sidebar icon size (NOT in spec)
   - `24px` — allowed (Stat role)
   - `48px` — used for login icon (VIOLATES "No font sizes above 24px in regular UI")

2. **Font weights are close but not exact** — Spec says exactly 400 and 600. Found:
   - `font-weight: 400` — used (correct)
   - `font-weight: 500` — used on form labels, nav items (NOT in spec, should be 600)
   - `font-weight: 600` — used (correct)

3. **Inventory slot text at 8px/10px** — `BotInspector.jsx:129` uses `fontSize: '8px'` and inventory count uses implicit small size. These are below the 12px accessibility minimum.

### Pillar 5: Spacing (3/4)

**Findings:**

1. **Spacing tokens are defined** — `index.css:31-37` correctly defines xs(4), sm(8), md(16), lg(24), xl(32), 2xl(48).

2. **Tokens are used in most places** — CSS classes reference `var(--space-md)`, `var(--space-sm)`, etc.

3. **50 inline styles bypass tokens** — Many inline styles use hardcoded pixel values like `'8px'`, `'12px'`, `'16px'`, `'24px'` instead of `var(--space-*)`. Examples:
   - `TaskQueue.jsx:60` — `gap: '8px', marginBottom: '24px'`
   - `SwarmController.jsx:214` — `padding: '8px', marginBottom: 'var(--space-sm)'` (mixed!)

4. **Some hardcoded padding values** — `index.css:202` has `padding: 16px 20px` (20px is not in the spacing scale).

### Pillar 6: Experience Design (1/4)

**Findings (CRITICAL):**

1. **5 pages inaccessible from mobile** — BottomNav has only 4 items: Dashboard, Bots, Tasks, More. The "More" button navigates to `/settings` (a specific page), not a menu. These pages have NO mobile access:
   - Servers (`/fleet/servers`)
   - Swarms (`/fleet/swarms`)
   - Chests (`/chests`)
   - Order Kit (`/kits`)
   - Chat (`/chat`)

2. **"More" button is mislabeled** — Users expect "More" to reveal additional navigation options. Instead it goes directly to Settings. This is a fundamental UX anti-pattern.

3. **No back navigation on mobile** — Once a user navigates to a sub-page (e.g., ServerManager), there's no back button or breadcrumb to return. The only option is the bottom nav.

4. **No mobile sheet/modal for "More"** — UI-SPEC says "Modals become full-screen sheets" on mobile, but there's no sheet component for the More menu.

5. **BotInspector drawer has no mobile adaptation** — The drawer component doesn't become full-screen on mobile. The overlay and drawer positioning may be awkward on small screens.

6. **No loading skeleton states** — All loading states are full-page spinners. UI-SPEC prefers inline spinners for async operations.

7. **Duplicate route confusion** — Both `/dashboard` and `/fleet` exist as dashboard routes, but only `/fleet` is in the nav. `/dashboard` is orphaned.

8. **No touch target verification** — Bottom nav items at 56px height should be fine, but some button sizes in modals and forms need verification against the 48px mobile minimum.

---

## Files Audited

| File | Issues |
|------|--------|
| `index.css` | 13px/16px/48px font sizes, card shadows, hardcoded padding values |
| `App.jsx` | Duplicate /dashboard route, generic loading text |
| `Layout.jsx` | Clean |
| `Sidebar.jsx` | 1 inline style (border), clean otherwise |
| `BottomNav.jsx` | Only 4 items, "More" goes to settings |
| `Login.jsx` | Exposed credentials in footer |
| `FleetDashboard.jsx` | 2 inline styles |
| `Dashboard.jsx` | 4 inline styles, orphaned route |
| `BotControl.jsx` | 2 inline styles |
| `SwarmController.jsx` | 6 inline styles |
| `TaskQueue.jsx` | 7 inline styles |
| `ServerManager.jsx` | Clean |
| `ChestManager.jsx` | Clean |
| `KitOrder.jsx` | 1 inline style |
| `Chat.jsx` | 1 inline style |
| `Settings.jsx` | 1 inline style |
| `BotInspector.jsx` | 11 inline styles, 8px font, no mobile close optimization |
| `StatusComponents.jsx` | 16 inline styles, badge backgrounds violate spec |
| `ToastContainer.jsx` | Clean |

---

## Recommendation Summary

| Priority | Count | Description |
|----------|-------|-------------|
| BLOCKER | 3 | Mobile nav broken, typography violations, inline styles |
| WARNING | 5 | Card shadows, no aria-labels, exposed credentials, badge backgrounds, no back nav |
| MINOR | 4 | Loading text without nouns, duplicate route, hardcoded padding, font-weight 500 |

---

*Phase: ui-redesign*
*Audit completed: 2026-07-26*
