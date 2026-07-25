# Coding Conventions

**Analysis Date:** 2026-07-25

## Naming Patterns

**Files:**
- Standard JavaScript naming: Use camelCase for filenames in src/ (e.g., `kitlist.js`, `index.js`)
- Backend files: Use lowercase for server files (`server.js`, `bot.js`, `api.js`)
- View templates: Use `.ejs` extension for files in views/ directory (e.g., `index.ejs`, `bot.ejs`)
- Config files: JSON files use `.json` extension (`.env` and `chestData.json`)

**Functions:**
- Named functions use camelCase (`loadKitsData`, `formatKitsList`)
- Exported functions are camelCase (`loadKitsData`, `handleKitList`)
- Async functions use `async/await` pattern

**Variables:**
- Global variables use camelCase or ALL_CAPS_STATIC (e.g., `botInstance`, `PORT`)
- Constants use ALL_CAPS_STATIC when appropriate (e.g., `WS_PORT`)
- Local variables use camelCase

**Types:**
- No TypeScript, plain JavaScript only
- Object properties use camelCase (e.g., `{ chestName, x, y, z }`)

## Code Style

**Formatting:**
- Uses Prettier styling (based on EJS views and consistent spacing)
- Functions include trailing commas in object literals
- Consistent spacing around operators and in blocks

**Linting:**
- ESLint not explicitly configured, but follows standard JavaScript conventions
- Functions use semicolons at the end of statements
- Lines are reasonably short (mostly <80 chars)

## Import Organization

**Order:**
1. Standard library modules (e.g., `fs`, `path`, `http`)
2. Third-party packages (e.g., `mineflayer`, `express`, `ws`)
3. Internal application modules (e.g., `'./bot'`, `'./src/index'`, `'./src/kitlist'`)
4. Environment configuration (`dotenv`)

**Path Aliases:**
- No configured path aliases
- Uses relative paths for internal imports
- Uses absolute paths for imports from different levels (`require('./bot')` vs `require('../src/index')`)

## Error Handling

**Patterns:**
- Try-catch blocks wrap file operations (`fs.readFileSync`, `JSON.parse`)
- Function errors are propagated with `throw new Error('message')`
- API endpoints return HTTP error codes and messages
- WebSocket errors are caught and logged with fallback handling

**Examples:**
```javascript
// File operations
try {
    kitsData = JSON.parse(fs.readFileSync('./chestData.json', 'utf8'));
} catch (err) {
    console.error('Error loading kits data:', err);
}

// Async operations
.takeItemFromChest(chestName, amount, player)
    .then(() => res.send(`Ordered ${amount} ${chestData.item}...`))
    .catch((err) => {
        console.error('Error taking item from chest:', err);
        res.status(500).send('Failed to take item from chest.');
    })
```

## Logging

**Framework:** Console-based logging using `console.log` and `console.error`

**Patterns:**
- `console.log` for general information and events
- `console.error` for errors and failures
- Logs include contextual information (e.g., `'Bot error: ${err}'`)
- WebSocket logs track connections: `'WebSocket client connected.'`

**Examples:**
```javascript
console.log(`${process.env.BOTNAME} spawned.`);
console.error('Bot error:', err);
console.log('WebSocket client connected.');
console.log('Error loading kits data:', err);
```

## Comments

**When to Comment:**
- Explain complex logic (e.g., WebSocket message parsing)
- Document configuration (e.g., server ports, environment variables)
- User-facing interfaces (e.g., EJS templates)

**Documentation Style:**
- No JSDoc documentation comments present
- Comments use both single-line (`//`) and multi-line blocks
- Code self-documents with descriptive variable names and function names

## Function Design

**Size:** Functions range from small one-liners to medium-sized logic blocks
- Generally follow single responsibility principle
- Functions handle multiple related operations but remain under ~50 lines
- Most functions include error handling

**Parameters:**
- Functions typically have 2-4 parameters maximum
- Object destructuring used for complex parameter sets (e.g., `{ chestName, x, y, z, item }`)
- API callbacks use standard (req, res, next) or (err) patterns

**Return Values:**
- Functions return data, results, or unresolved promises
- Async functions return Promises
- API endpoints return HTTP responses
- Utility functions return computed values or error indicators

## Module Design

**Exports:**
- Use ES6 module pattern with `module.exports = { ... }`
- Export multiple functions/objects as properties
- Private implementation details kept within modules

**Barrel Files:**
- No barrel files for re-exports detected
- Files export their core functionality directly
- Related functionality grouped in single modules (e.g., `bot.js` exports `loadChestData` and `takeItemFromChest`)
