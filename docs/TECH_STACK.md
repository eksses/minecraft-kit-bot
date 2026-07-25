# Tech Stack Policy

This document defines the technology stack for MDB and rules that are non-negotiable.

---

## The Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React.js (Vite) | Component-driven SPA, no TSX, no framework |
| **PWA** | Vite PWA Plugin | Service workers, manifest, offline support |
| **Push Notifications** | Web Push API (React Push) | Browser-native push notifications, no Firebase |
| **Backend (Primary)** | Express.js | Battle-tested, minimal, massive ecosystem |
| **Backend (Alternative)** | Hono | Lightweight serverless-compatible alternative to Express |
| **Bot Framework** | Mineflayer | The standard Minecraft bot library |
| **Database (Dev)** | SQLite or JSON file | Zero setup, portable |
| **Database (Production)** | Turso (libSQL), Neon Postgres, MySQL, PostgreSQL | Structured, scalable, migration-ready |
| **State Management** | Zustand | Lightweight, minimal boilerplate |
| **Styling** | CSS (or a utility library) | No CSS-in-JS overhead |
| **Language** | JavaScript (ES2022+) | No TypeScript/TSX — ever |
| **API** | REST + WebSocket | Simple, universal, debuggable |
| **Auth** | Session-based (server-side) with role system | No third-party auth providers |
| **Process Manager** | PM2 (production) | Auto-restart, clustering, logging |
| **Reverse Proxy** | Nginx | SSL termination, proxying |
| **Test Runner** | Built-in `node:test` or Jest | No heavy test frameworks required |

---

## Non-Negotiable Rules

### No TypeScript or TSX

MDB is **JavaScript only**. No TypeScript, no TSX, no `*.ts` or `*.tsx` files. TypeScript adds build complexity and slows down contributors. Plain JavaScript keeps the barrier to entry low and the codebase accessible.

### No Next.js

Next.js is not part of MDB. It is a real-time bot control application with a single-page dashboard. A standalone React app served by Express provides everything we need without the overhead of SSR/SSG, file-based routing, or framework-specific abstractions.

### Backend: Express or Hono Only

The backend must be either **Express.js** or **Hono**. No other backend frameworks are allowed. These are the only approved options:

- **Express.js** — The default backend. Mature, huge ecosystem, battle-tested for real-time bot applications.
- **Hono** — Lightweight alternative for serverless or edge deployments. Same API patterns as Express.

### No Meta-Frameworks

No Nuxt, SvelteKit, Astro, Remix, Redwood, or similar build-heavy frontend frameworks. The frontend is a vanilla React SPA with Vite.

### No Heavy Build Tooling

No custom Babel or Webpack configs. Vite is the dev tool and build tool. That's it.

### No Third-Party Auth Providers

No Google OAuth, GitHub OAuth, or similar. All authentication stays within the application using session-based login with hashed passwords (bcryptjs).

### No Biometric or Fingerprint Auth

No WebAuthn, no fingerprint scanning, no Face ID. Authentication is username/password with role-based session management.

### No Firebase or Cloud Notification Services

No Firebase Cloud Messaging, no OneSignal, no third-party notification services. Push notifications are handled via the browser's native Web Push API with React push notification components.

### No Fingerprint/Biometric Login

Users log in with username and password. No fingerprint, no Face ID, no biometric verification.

---

## Database Options

MDB supports multiple database backends:

| Database | Use Case |
|----------|----------|
| **JSON file** (`chestData.json`) | Quick start, single bot, dev/testing |
| **SQLite** | Local dev, simple deployments |
| **Turso (libSQL)** | Edge-compatible SQLite, serverless deployments |
| **Neon Postgres** | Serverless Postgres with branching, multi-bot deployments |
| **MySQL** | Self-hosted production, traditional hosting |
| **PostgreSQL** | Multi-bot swarm deployments, complex queries |

### Migration Path

1. Start with JSON file (like current v2.0)
2. On first structured DB setup, auto-import `chestData.json` into the DB
3. All operations go through the DB from then on
4. JSON export is still supported for backup/sharing

---

## Frontend Rules

- React.js only (no TSX)
- Vite as the build tool
- Component-driven architecture with modular components
- Zustand for state management
- Web Push API for notifications
- Responsive design, mobile-first
- PWA-capable (installable on mobile/desktop)
- No framework abstractions — just React + CSS

---

## Adding New Dependencies

Before adding any npm package, consider:

1. Does an existing dependency already solve this?
2. Can this be implemented in 10 lines of plain JS?
3. Does this introduce a framework or build step that didn't exist before?
4. Does this introduce TypeScript or TSX?

If the answer to #3 or #4 is yes, discuss it first.
