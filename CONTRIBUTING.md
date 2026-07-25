# Contributing to Minecraft Kit Delivery Bot

Thank you for your interest in contributing! This guide covers everything you need to get started.

---

## How to Contribute

### 1. Fork the Repository

Click the "Fork" button on the [repository page](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot).

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/minecraft-kit-bot.git
cd minecraft-kit-bot
```

### 3. Create a Branch

```bash
git checkout -b feat/your-feature-name
```

Use descriptive branch names:
- `feat/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code restructuring
- `style/` — Formatting and styling

### 4. Install Dependencies

```bash
npm run install:all
```

### 5. Start Development

```bash
npm run dev
```

This runs both backend (port 8081) and frontend (port 5173) simultaneously.

### 6. Make Your Changes

- Write clear, minimal code
- Follow existing code style and patterns
- Add or update documentation as needed
- Test your changes thoroughly

### 7. Commit and Push

```bash
git add .
git commit -m "feat: description of your change"
git push origin feat/your-feature-name
```

### 8. Open a Pull Request

Go to the original repository and click "New Pull Request". Provide a clear title and description.

---

## Reporting Bugs

When reporting a bug, please include:

1. **Description** — What went wrong
2. **Steps to Reproduce** — Exact steps to trigger the bug
3. **Expected Behavior** — What you expected to happen
4. **Actual Behavior** — What actually happened
5. **Environment** — OS, Node.js version, Minecraft version, server details
6. **Logs** — Any relevant console output or error messages

---

## Suggesting Features

When suggesting a feature, describe:

1. **The Problem** — What gap does this fill?
2. **The Proposed Solution** — How should it work?
3. **Alternatives Considered** — Any other approaches you explored

---

## Tech Stack Rules

MDB uses the following strict tech stack. These are non-negotiable when contributing:

- **JavaScript only** — No TypeScript, no TSX, no `*.ts` or `*.tsx` files
- **Hono backend** — No Express, no Fastify, no NestJS
- **React frontend** — No Next.js, no Nuxt, no SvelteKit
- **SQLite + Drizzle ORM** — No MongoDB, no Firebase
- **No Firebase** — Web Push API only
- **No biometrics** — Session-based auth only
- **No heavy build tooling** — Vite only

## Code Style

- Use consistent indentation (2 spaces)
- No trailing whitespace
- Use meaningful variable and function names
- Comment code only when necessary for clarity
- Keep functions small and focused
- Use Lucide icons (no emojis)
- Follow the Obsidian Command design system

---

## Project Structure

```
minecraft-kit-bot/
├── backend/src/         # Hono API server
│   ├── db/             # SQLite + Drizzle ORM
│   ├── services/       # Business logic
│   └── routes/         # API routes
├── frontend/src/        # React SPA
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── context/        # React context
│   └── services/       # API client
└── docs/                # Documentation
```

---

## Pull Request Checklist

- [ ] Code follows the project's style conventions
- [ ] Changes are tested
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive
- [ ] No breaking changes (unless explicitly noted)
- [ ] No TypeScript/TSX files introduced
- [ ] No new framework dependencies added

---

## Questions?

Feel free to open a [GitHub Discussion](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot/discussions) if you have any questions.
