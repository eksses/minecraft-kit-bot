# Tech Stack

Here's what MDB is built with and why.

## The Basics

| Layer | What We Use | Why |
|-------|-------------|-----|
| **Frontend** | React 18 + Vite | Fast builds, great DX, no bloat |
| **Backend** | Hono | Lightweight, fast, works everywhere |
| **Database** | SQLite + Drizzle ORM | Zero config, portable, type-safe queries |
| **Bot Framework** | Mineflayer + pathfinder | Battle-tested, handles Minecraft protocol |
| **Real-time** | WebSocket | Live updates without polling |
| **Auth** | Cookie sessions | Simple, secure, no third-party dependencies |

## Hard Rules

These are non-negotiable. If you're contributing, please respect them:

- **JavaScript only** — No TypeScript, no TSX files
- **No Next.js** — We use Vite + React SPA
- **No Firebase or FCM** — Web Push API only
- **No biometrics** — Session-based auth only
- **No heavy build tools** — Vite is all we need
- **No CSS-in-JS** — Plain CSS with custom properties
- **No emojis in code** — Lucide icons only

## Design System

We use something called **Obsidian Command**. It's a dark, terminal-inspired look:

- **Background:** `#141313` (almost black)
- **Surface:** `#201f1f` (dark gray)
- **Primary:** `#ffffff` (white text)
- **Status colors:** Green for online, amber for warning, red for errors
- **No rounded corners** — Everything is sharp (0px radius)
- **No shadows** — Flat design only
- **48px touch targets** — Mobile-friendly

## Database Tables

| Table | What It Stores |
|-------|----------------|
| `users` | Login accounts with roles |
| `servers` | Minecraft server configs |
| `bots` | Your bot instances |
| `swarms` | Bot groups |
| `delivery_queue` | Tasks waiting to run |
| `swarm_memory` | Coordination state |
| `bot_logs` | Event history |

## Why These Choices?

**SQLite over PostgreSQL:** We wanted zero-config setup. SQLite just works — no server to install, no credentials to manage. The database file is portable.

**Hono over Express:** Hono is faster, smaller, and has better TypeScript support (even though we're not using TypeScript). It's also more modern.

**Mineflayer over mineflayer-wrapper:** Direct control over the bot, no abstraction layers getting in the way.

**CSS over Tailwind/CSS-in-JS:** We wanted full control over the design system without runtime overhead or build complexity.
