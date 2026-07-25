# SECURITY.md

**Analysis Date:** Sat Jul 25 2026

## Authentication and Authorization

**[Authentication Mechanism]:**
- Current approach: Session-based HTTP authentication with hardcoded credentials
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:24-28,88-98`
- Implementation: Simple username/password check against UI_USER/UI_PASSWORD environment variables
- Security issues: Credentials stored in plaintext, no password hashing, session fixation risk

**[Authorization]:**
- Current approach: Role-based Web (all or nothing access)
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:32-37`
- Implementation: isAuthenticated middleware checks req.session.loggedIn
- Issues: No role differentiation, all authenticated users have full access

## Data Protection and Privacy

**[Sensitive Data Storage]:**
- Issue: All secrets in plaintext .env file
- Files: `/root/Mcbot/minecraft-kit-bot/.env`
- Risk: Complete credential exposure if .env is committed or accessible

**[Data Exposure]:**
- Issue: Bot command history and player interactions logged to console
- Files: `/root/Mcbot/minecraft-kit-bot/src/index.js`, `/root/Mcbot/minecraft-kit-bot/bot.js`
- Risk: Player data exposed in logs, audit trail concerns

**[Data Validation]:**
- Issue: No input sanitization on user-provided data
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:157-171`, `/root/Mcbot/minecraft-kit-bot/server.js:175-193`
- Risk: XSS, SQL injection potential (though currently no SQL database)

## Network Security Considerations

**[HTTP Only]:**
- Issue: All traffic over HTTP, no HTTPS
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:298-301`
- Risk: Credentials and data transmitted in plaintext

**[WebSocket Security]:**
- Issue: WebSocket connections accept any origin
- Files: `/root/Mcbot/minecraft-kit-bot/src/index.js:11-13`
- Risk: WebSocket connection hijacking, message injection

**[CORS]:**
- Issue: No CORS configuration
- Risk: Potential cross-origin attacks if web UI is served from different domain

## Configuration Security (Secrets, .env)

**[Secrets Management]:**
- Issue: All configuration in plaintext .env file
- Files: `/root/Mcbot/minecraft-kit-bot/.env:1-10`
- Contents: IP, PORT, BOTNAME, PASSWORD, WS_PORT, UI_USER, UI_PASSWORD
- Risk: Complete credential exposure

**[Environment Issues]:**
- Issue: Development defaults in production code
- Files: `/root/Mcbot/minecraft-kit-bot/.env:3-4`
- Content: BOTNAME=changeme_mdb, PASSWORD=changeme_mdb
- Risk: Default credentials match pattern

## Application-level Security Controls

**[Input Validation]:**
- Current approach: Minimal parsing only
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:161-167`, `/root/Mcbot/minecraft-kit-bot/server.js:179-185`
- Issues: No validation of coordinate ranges, negative values, or item names
- Risks: Invalid data could cause bot errors or exploits

**[Error Handling]:**
- Current approach: Console.error for errors
- Files: `/root/Mcbot/minecraft-kit-bot/bot.js:22`, `/root/Mcbot/minecraft-kit-bot/server.js:122-126`
- Issues: Detailed error messages could leak internal information
- Risk: Information disclosure through error messages

**[Session Management]:**
- Current approach: Express session with hardcoded secret
- Files: `/root/Mcbot/minecraft-kit-bot/server.js:24-28`
- Issues: Secret 'samir' is weak and hardcoded, no expiration
- Risk: Session hijacking, unlimited session duration

## Dependencies and Supply Chain Security

**[Outdated Dependencies]:**
- discord.js ^14.14.1 (2024+)
- mineflayer ^4.20.1
- Express ^4.19.2
- Risk: Known vulnerabilities in older versions

**[Package Integrity]:**
- Issue: npm install without audit checks
- Files: `/root/Mcbot/minecraft-kit-bot/package.json`, `/root/Mcbot/minecraft-kit-bot/package-lock.json`
- Risk: Potential compromised dependencies

**[Update Strategy]:**
- Issue: No automated update or security patching process
- Files: No automated vulnerability scanning or dependency monitoring

## Security Best Practices and Hardening Recommendations

**[Immediate Actions:]**
1. **Environment-based secrets**: Remove hardcoded secrets, use encrypted config or secrets manager
2. **Password hashing**: Implement bcrypt for UI credentials
3. **HTTPS deployment**: Use nginx or reverse proxy with SSL
4. **Input validation**: Add comprehensive validation for all inputs
5. **Session security**: Regenerate session on login, set session expiration
6. **CORS configuration**: Restrict WebSocket and API origins
7. **Security headers**: Implement helmet for Express applications
8. **Rate limiting**: Add rate limits to authentication endpoints
9. **Error handling**: Generic error messages in production
10. **Logging**: Structured error logging without sensitive data

**[Architecture improvements:]**
1. **Modular backend**: Separate auth, bot, and API concerns
2. **Database migration**: Replace chestData.json with SQLite/PostgreSQL
3. **Process management**: Use PM2 with log rotation
4. **Health checks**: Add /health endpoint with bot status
5. **Monitoring**: Add application monitoring and alerting

## Common Security Pitfalls to Avoid

**[Pitfall 1: Path Traversal]:**
- Risk: fs.readFileSync('.env') and fs.readFileSync('chestData.json') could be manipulated
- Location: `/root/Mcbot/minecraft-kit-bot/server.js:51,114,135,147`
- Mitigation: Use path.join and validate file paths

**[Pitfall 2: Command Injection]:**
- Risk: exec('sudo systemctl restart mdb') in api.js
- Location: `/root/Mcbot/minecraft-kit-bot/api.js:10,22,34`
- Mitigation: Use environment variables instead, whitelist commands

**[Pitfall 3: Information Disclosure]:**
- Risk: Error stack traces shown to users
- Location: Multiple error handling blocks
- Mitigation: Generic error messages, log details internally

**[Pitfall 4: Weak Cryptography]:**
- Risk: No encryption for sensitive data
- Location: .env, session secret
- Mitigation: Use proper encryption for sensitive config

**[Pitfall 5: Missing Authentication for Sensitive Operations]:**
- Risk: Admin actions (start/stop/restart bot) require only login
- Location: `/root/Mcbot/minecraft-kit-bot/api.js:9-42`
- Mitigation: Add role-based access control

**[Pitfall 6: Insecure Direct Object References]:**
- Risk: API allows deleting/modifying any chest without ownership checks
- Location: `/root/Mcbot/minecraft-kit-bot/server.js:157-171,175-193,197-210`
- Mitigation: Add ownership verification

---

*Security assessment: Sat Jul 25 2026*