# Technology Stack

**Analysis Date:** 2026-07-25

## Languages

**Primary:**
- JavaScript (ES2022+) - Core language for all components, with Node.js runtime (v18+)

**Secondary:**
- TypeScript - Not used, explicitly excluded per project policy

## Runtime

**Environment:**
- Node.js v18+ - Required runtime for both bot and server components

**Package Manager:**
- npm - Used for dependency management (package-lock.json present)
- Lockfile: present

## Frameworks

**Core:**
- Mineflayer v4.20.1 - Minecraft bot framework for automation
- mineflayer-pathfinder v2.4.5 - Pathfinding for bot navigation
- Express.js v4.19.2 - Web framework for server endpoints
- EJS v3.1.10 - Template engine for views

**Testing:**
- Not applicable - No test frameworks detected in current implementation

**Build/Dev:**
- npm scripts (single start command) - Simple development setup

## Key Dependencies

**Critical:**
- discord.js v14.14.1 - Discord integration SDK (included but may not be active)
- mineflayer v4.20.1 - Primary bot framework
- express v4.19.2 - Web server framework
- bcryptjs v2.4.3 - Password hashing for authentication
- ws v8.18.0 - WebSocket implementation for real-time chat

**Infrastructure:**
- dotenv v16.4.5 - Environment variable management
- express-session v1.18.0 - Session-based authentication
- body-parser v1.20.2 - Request body parsing

## Configuration

**Environment:**
- .env file - Environment variables (IP, PORT, BOTNAME, PASSWORD, etc.)
- chestData.json - JSON database for chest locations and kit items

**Build:**
- package.json - Project configuration and dependencies
- package-lock.json - Dependency lockfile

## Platform Requirements

**Development:**
- Node.js v18+
- npm
- git
- .env configuration

**Production:**
- Linux (systemd for process management)
- PM2 optionally for process management

---

*Stack analysis: 2026-07-25*