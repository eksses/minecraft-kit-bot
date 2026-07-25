# Roadmap — Minecraft Kit Delivery Bot

High-level milestone overview with estimated timelines.

---

## Milestone 0 — Foundation Cleanup (Now)

- [x] Add comprehensive documentation
- [x] Improve `.gitignore`
- [x] Populate package.json keywords
- [x] Document architecture (docs/ARCHITECTURE.md)
- [x] Document configuration (docs/CONFIGURATION.md)
- [x] Document API (docs/API.md)
- [ ] Add ESLint config
- [ ] Add basic test scaffolding
- [ ] Add `.editorconfig`
- [ ] Add CI workflow (GitHub Actions)

**Estimated:** In progress

---

## Milestone 1 — Modular Backend (Next)

Refactor monolithic server into feature-based modules and add a plugin system for integrations.

**Key Changes:**
- Split `server.js` routes into modular files
- Extract business logic into `services/`
- Create `integrations/base.js` interface
- Add `integrations/discord/` as first integration
- Add global error handling and logger
- Add graceful shutdown
- Add health check endpoint

**Estimated Timeline:** 2–4 weeks
**Difficulty:** Medium (refactoring, no new features yet)

---

## Milestone 2 — Database & Multi-Bot (After M1)

Replace flat JSON with a database and enable multiple bot instances.

**Key Changes:**
- Add SQLite/PostgreSQL with schema migrations
- Auto-import from `chestData.json` on first run
- Support multiple bot instances in one dashboard
- Add bot management UI
- Add bot swarm mode

**Estimated Timeline:** 4–6 weeks
**Difficulty:** Medium-High

---

## Milestone 3 — React.js SPA + PWA (After M2)

Replace EJS templates with a modern React frontend.

**Key Changes:**
- Set up React project with Vite
- Build component architecture
- Implement responsive/mobile-first design
- Convert to PWA with service worker
- Add push notifications
- Dark/light theme toggle

**Estimated Timeline:** 4–8 weeks
**Difficulty:** High (large frontend rewrite)

---

## Milestone 4 — RBAC (After M3)

Add role-based access control with admin, operator, and viewer roles.

**Key Changes:**
- Database schema for users and roles
- Auth middleware with role checking
- User management UI
- Audit logging

**Estimated Timeline:** 2–3 weeks
**Difficulty:** Medium

---

## Milestone 5 — Additional Integrations (After M4)

Add Telegram and webhook integrations, build integration documentation for third-party developers.

**Key Changes:**
- `integrations/telegram/`
- `integrations/webhook/`
- Integration template/documentation
- Integration marketplace concept

**Estimated Timeline:** 3–4 weeks
**Difficulty:** Medium

---

## Milestone 6 — Reliability & Production Hardening (After M5)

Make the backend crash-resistant and production-ready.

**Key Changes:**
- PM2 process manager setup
- Health checks and monitoring
- Rate limiting
- Input validation
- Security headers
- Backup system
- Zero-downtime updates

**Estimated Timeline:** 2–4 weeks
**Difficulty:** Medium

---

## Milestone 7 — Mobile App (Future)

Native mobile app experience via Capacitor or React Native.

**Estimated Timeline:** 6–10 weeks
**Difficulty:** High

---

## Visual Timeline

```
Now ──█── M1 ──█── M2 ──█── M3 ──█── M4 ──█── M5 ──█── M6 ──█── M7 ──→
      Foundation  Modular   DB &      React     RBAC      More      Reliable  Mobile
                  Backend   Multi     SPA       Access    Integrate Hardening App
```

---

## How to Contribute to the Roadmap

1. Comment on a [GitHub Discussion](https://github.com/R-Samir-Bhuiyan-A/minecraft-kit-bot/discussions) with your ideas
2. Open an issue with the `enhancement` label
3. Submit a PR for any milestone you want to work on

Each comment on a milestone issue helps prioritize what we work on next.
