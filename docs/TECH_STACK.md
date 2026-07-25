# Tech Stack Policy — MDB v3.0

This document defines the technology stack for MDB and rules that are non-negotiable.

---

## The Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 (Vite) | Component-driven SPA, plain JavaScript |
| **PWA** | Vite PWA Plugin | Service workers, manifest, offline support |
| **Backend** | Hono | Lightweight, fast, serverless-compatible |
| **Bot Framework** | Mineflayer + mineflayer-pathfinder | Standard Minecraft bot library |
| **Database** | SQLite + Drizzle ORM | Zero setup, portable, type-safe queries |
| **Real-time** | WebSocket | Live bot status, chat, inventory |
| **Auth** | Cookie-based sessions with RBAC | No third-party auth providers |
| **Styling** | CSS custom properties | Obsidian Command design system |
| **Language** | JavaScript (ES2022+) | No TypeScript/TSX — ever |
| **API** | REST + WebSocket | Simple, universal, debuggable |
| **Process Manager** | PM2 (production) | Auto-restart, clustering, logging |
| **Reverse Proxy** | Nginx | SSL termination, proxying |

---

## Non-Negotiable Rules

### No TypeScript or TSX

MDB is **JavaScript only**. No TypeScript, no TSX, no `*.ts` or `*.tsx` files. Plain JavaScript keeps the barrier to entry low and the codebase accessible.

### No Next.js

Next.js is not part of MDB. It is a real-time bot control application with a single-page dashboard. A standalone React app served by Hono provides everything we need.

### Backend: Hono Only

The backend is **Hono** — lightweight, fast, and serverless-compatible. Express.js is no longer used as of v3.0.

### No Meta-Frameworks

No Nuxt, SvelteKit, Astro, Remix, Redwood, or similar. The frontend is a vanilla React SPA with Vite.

### No Heavy Build Tooling

No custom Babel or Webpack configs. Vite is the dev tool and build tool. That's it.

### No Third-Party Auth Providers

No Google OAuth, GitHub OAuth, or similar. All authentication stays within the application using session-based login with hashed passwords.

### No Biometric or Fingerprint Auth

No WebAuthn, no fingerprint scanning, no Face ID. Authentication is username/password with role-based session management.

### No Firebase or Cloud Notification Services

No Firebase Cloud Messaging, no OneSignal, no third-party notification services. Push notifications are handled via the browser's native Web Push API.

---

## Database

MDB uses **SQLite with Drizzle ORM** for structured data:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles |
| `servers` | Minecraft server configurations |
| `bots` | Bot instances |
| `swarms` | Bot groups with load balancing |
| `bot_swarms` | Many-to-many: bots ↔ swarms |
| `delivery_queue` | Task queue |
| `swarm_memory` | Persistent swarm state |
| `bot_logs` | Bot event logs |

### Legacy Support

`chestData.json` is still supported for development. The system auto-migrates from JSON to SQLite on first run.

---

## Frontend Rules

- React.js only (no TSX)
- Vite as the build tool
- Component-driven architecture
- CSS custom properties for theming
- Responsive design, mobile-first
- PWA-capable (installable on mobile/desktop)
- No framework abstractions — just React + CSS

---

## Design System: Obsidian Command

| Token | Value |
|-------|-------|
| Background | `#141313` |
| Surface | `#201f1f` |
| Border | `#2a2a2a` |
| Primary | `#ffffff` |
| Status Online | `#00ff41` |
| Status Warning | `#ffb000` |
| Status Error | `#ff3131` |
| Corner Radius | 0px |
| Shadows | None |
| Touch Targets | 48px |
| Typography | Inter + JetBrains Mono |

---

## Adding New Dependencies

Before adding any npm package, consider:

1. Does an existing dependency already solve this?
2. Can this be implemented in 10 lines of plain JS?
3. Does this introduce a framework or build step that didn't exist before?
4. Does this introduce TypeScript or TSX?

If the answer to #3 or #4 is yes, discuss it first.
