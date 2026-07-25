# Testing Patterns

**Analysis Date:** 2026-07-25

## Test Framework

**Runner:**
- Not applicable - No test framework currently configured in the project
- Based on roadmap milestone M0, testing is planned but not yet implemented

**As an alternative, for implementation guidance:**
- Jest or Mocha could be used as test runner
- Should focus on the asynchronous nature of bot operations
- Need to handle event-driven testing (Mineflayer events)
- Must mock file system operations for unit tests

**Assertion Library:**
- Jest: Built-in assertions, snapshot testing
- Mocha: Chai for assertions

**Run Commands (planned):**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage reporting
```

## Test File Organization

**Location:**
- Recommended: Tests organized in `tests/` directory at project root
- Alternative: Co-located tests (src/ directory with test files)

**Naming:**
- `*.test.js` or `*.spec.js` for test files
- Test files match the source files they test

**Structure:**
```
tests/
  ├── unit/
  │   ├── bot.test.js
  │   ├── index.test.js
  │   └── kitlist.test.js
  ├── integration/
  │   ├── api.test.js
  │   └── server.test.js
  └── e2e/
      └── bot-flow.test.js
```

## Test Structure

**Suite Organization (current code patterns):**
```javascript
// Unit test pattern for src/kitlist.js
const { loadKitsData, handleKitList } = require('../src/kitlist');

describe('kitlist module', () => {
  // Test cases based on actual functions
});
```

**Patterns:**
- **Setup pattern:** Initialize mock bot instance and dependencies before each test
- **Teardown pattern:** Reset mocks and clear state after each test
- **Assertion pattern:** Check return values, calls, and error conditions
- **Async pattern:** Use async/await for async operations, handle Promises
- **Mock pattern:** Mock file system operations (fs.readFileSync)
- **Event pattern:** Handle Mineflayer events through mocking

## Mocking

**Framework:** Based on Jest or Mocha with Sinon for mocking

**Patterns:**
```javascript
// File system mocking
jest.mock('fs');
const fs = require('fs');
fs.readFileSync.mockReturnValue(JSON.stringify(testKitsData));

// Bot instance mocking
jest.mock('./src/index');
const mineflayer = require('mineflayer');
mineflayer.createBot.mockReturnValue(mockBot);

// Environment mocking
process.env.BOTNAME = 'testBot';
process.env.PASSWORD = 'testPass';
```

**What to Mock:**
- `fs.readFileSync` and `fs.writeFileSync` for file I/O operations
- `mineflayer.createBot` for bot initialization
- `process.env` variables for configuration
- `bot.chat`, `bot.on('chat')`, and event handlers
- WebSocket operations (`ws.Server`)

**What NOT to Mock:**
- Actual bot operations (integration tests may want real bot logic)
- Critical business logic that should remain tested end-to-end

## Fixtures and Factories

**Test Data:**
```javascript
// testData.js
const testKitsData = {
  "kit1": { "item": "diamond", "amount": 64 },
  "kit2": { "item": "emerald", "amount": 32 }
};

const validCoordinates = {
  "chestName": "testChest",
  "x": 100,
  "y": 64,
  "z": 200,
  "item": "diamond"
};
```

**Location:**
- `tests/fixtures/` directory for test data files
- `tests/__mocks__/fs.js` for file system mocking

## Coverage

**Requirements:** Not enforced currently, but plan for 80%+ coverage for critical paths

**View Coverage:**
```bash
npm run test:coverage
# Output: HTML report in coverage/ directory
```

## Test Types

**Unit Tests:**
- Test individual functions (`loadKitsData`, `formatKitsList`)
- Mock all external dependencies
- Verify error handling scenarios
- Focus on pure functions and simple logic

**Integration Tests:**
- Test API endpoints (`/api/order`, `/chest/save-chest`)
- Test server route integrations
- Verify database (JSON file) operations
- Check environment variable handling

**E2E Tests:**
- Framework: Playwright or Cypress
- Test real bot interactions (requires actual Minecraft server)
- Test web dashboard functionality
- Verify end-to-end kit delivery flow

## Common Patterns

**Async Testing:**
```javascript
// For takeItemFromChest async function
it('should successfully take items from chest', async () => {
  const mockChestData = { ... };
  // Mock setup
  await takeItemFromChest('testChest', 10, 'player1');
  expect(botInstance.pathfinder.setGoal).toHaveBeenCalled();
});
```

**Error Testing:**
```javascript
it('should handle missing chest data', async () => {
  botInstance = null; // Mock unavailable bot
  await expect(takeItemFromChest('missing', 10, 'player')).rejects.toThrow(
    'Bot instance is not available.'
  );
});
```

**Event Testing:**
```javascript
it('should handle bot chat events', () => {
  const mockWs = { send: jest.fn() };
  // Test WebSocket chat listener registration
  expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('username'));
});
```

## Limitations and Considerations

**Current State:**
- No existing test suite in the project
- All testing is planned for milestone M0 in TODO.md
- Bot operations require actual Minecraft server for testing

**Future Testing Approach:**
- Unit tests for pure functions and utilities
- Integration tests for API endpoints
- Mock heavy testing for bot logic (requires mineflayer mocking)
- Sequential testing for file operations to avoid conflicts
