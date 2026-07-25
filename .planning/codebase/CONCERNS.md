# Codebase Concerns

**Analysis Date:** Sat Jul 25 2026

## Tech Debt

**[Monolithic Architecture]:**
- Issue: Everything in server.js (301 lines) doing authentication, chest CRUD, bot control, API endpoints, and WebSocket handling
- Files: `/root/Mcbot/minecraft-kit-bot/server.js`
- Impact: Hard to maintain, test, and extend; violates separation of concerns
- Fix approach: Split into modular services - authService, chestService, botService, apiService

**[Flat JSON Database]:**
- Issue: Using chestData.json as primary data store (no database)
- Files: `/root/Mcbot/minecraft-kit-bot/chestData.json`
- Impact: No concurrency safety, no validation, fragile at scale
- Fix approach: Use SQLite/PostgreSQL with proper schema and migrations

**[Weak Authentication]:**
- Issue: Hardcoded credentials, plaintext storage, no password hashing
- Files: `/root/Mcbot/minecraft-kit-bot/.env`, `/root/Mcbot/minecraft-kit-bot/server.js`
- Impact: Passwords easily compromised if .env is exposed
- Fix approach: bcrypt password hashing, environment-based secrets only

## Known Bugs

**[Session Fixation Risk]:**
- Symptoms: Session cookie doesn't regenerate on login
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:24-28`
- Trigger: User login without session invalidation
- Workaround: None

**[Race Condition in Chest Updates]:**
- Symptoms: Concurrent chest updates could corrupt data
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:169,191,208`
- Trigger: Multiple users editing chests simultaneously
- Workaround: Use database transactions or file locking

## Security Considerations

**[Credentials Exposure]:**
- Risk: All credentials stored in plaintext .env file
- Files: `/root/Mcbot/minecraft-kit-bot/.env`
- Current mitigation: None (env file is git-ignored but may be accidentally committed)
- Recommendations: Use encrypted config, secrets manager, or at minimum no git commit

**[Command Injection]:**
- Risk: exec('sudo systemctl restart mdb') in api.js without input validation
- Files: `/root/Mcbot/minecraft-kit-bot/api.js:10,22,34`
- Current mitigation: Limited to systemctl commands
- Recommendations: Whitelist commands, use environment variables instead

## Performance Bottlenecks

**[Blocking File I/O]:**
- Problem: Synchronous fs.readFileSync/fs.writeFileSync used extensively
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:51,114,147,169,191,208`, `/root/Mcbot/minecraft-kit-bot/bot.js:16-24`, `/root/Mcbot/minecraft-kit-bot/src/kitlist.js:9`
- Cause: Synchronous operations block event loop
- Improvement path: Use async/await with fs.promises or proper database

**[Global State Management]:**
- Problem: chestsData stored in module scope creates memory overhead
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:130`, `/root/Mcbot/minecraft-kit-bot/bot.js:6,13`
- Cause: Data persists in memory across requests
- Improvement path: Use database or Redis for shared state

## Fragile Areas

**[Input Validation]:**
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:157-167`, `/root/Mcbot/minecraft-kit-bot/server.js:175-185`, `/root/Mcbot/minecraft-kit-bot/server.js:197-202`
- Why fragile: Minimal validation of chest coordinates, names, and items
- Safe modification: Add schema validation for all API endpoints
- Test coverage: None currently

**[Error Handling]:**
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:121-126`
- Why fragile: JSON parsing errors return generic 500 without helpful messages
- Safe modification: Implement structured error handling with try/catch boundaries
- Test coverage: No error handling tests

## Scaling Limits

**[Single Bot Instance]:**
- Current capacity: 1 bot instance per deployment
- Limit: Cannot serve multiple Minecraft servers or large player bases
- Scaling path: Multi-bot architecture with shared database

**[JSON File Size]:**
- Current capacity: Limited by JSON parser limits (~2GB typical)
- Limit: Cannot store hundreds of thousands of kits
- Scaling path: Relational database with proper indexing

## Dependencies at Risk

**[discord.js]:**
- Risk: Version ^14.14.1 is quite old (2024+)
- Impact: May have unpatched security issues
- Migration plan: Upgrade to latest discord.js version

**[express-session]:**
- Risk: Session management without secure cookie settings
- Impact: Session hijacking possible over HTTP
- Migration plan: Enable secure cookies, use HTTPS

## Missing Critical Features

**[Input Sanitization]:**
- Problem: No sanitization of chest names, player names, or items
- Blocks: XSS risks in web UI, injection risks
- Risk area: All user-facing inputs in web interface

## Test Coverage Gaps

**[Core Bot Logic]:**
- What's not tested: bot.js navigation, pathfinding, item withdrawal
- Files: `/root/Mcbot/minecraft-kit-bot/bot.js`
- Risk: Critical delivery functionality untested
- Priority: High

**[API Endpoints]:**
- What's not tested: All API routes for chest CRUD and ordering
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:156-245`
- Risk: Order fulfillment bugs can go undetected
- Priority: High

**[WebSocket Handling]:**
- What's not tested: WebSocket connections, message parsing
- Files: `/root/Mcbot/minecraft-kit-bot/src/index.js:60-94`
- Risk: Chat relay bugs or security vulnerabilities
- Priority: Medium

## Production Readiness Assessment

**[Current State]:** Not production-ready

**[Critical Missing for Production]:**
1. Logging infrastructure (structured logs with levels)
2. Error monitoring and alerting
3. Health check endpoints
4. Rate limiting on authentication endpoints
5. HTTPS support
6. Input validation and sanitization
7. Security headers (helmet)
8. Process management (PM2)
9. Database backup strategy
10. API documentation
11. Unit tests
12. Integration tests
13. Security testing

**Timeline to Production:** Minimum 3-6 months with comprehensive rewrite

---

*Concerns audit: Sat Jul 25 2026*