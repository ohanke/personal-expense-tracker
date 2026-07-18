# Testing Guide - Personal Expense Tracker Backend

## Overview

This project includes automated tests for OAuth authentication logic, middleware, and utilities. Tests are written using **Jest** and **Supertest** for API testing.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm test -- --coverage
```

## Development & Debugging

### Start server with debug logging enabled
```bash
DEBUG_LOGS=true npm start
```

This enables detailed debug logs showing:
- **OAuth flow**: Which strategy is initiated, callback success/failure
- **API requests**: Every endpoint call with HTTP status codes
- **CRUD operations**: When data is created, updated, or deleted
- **WebSocket events**: Client connect/disconnect, alert sending
- **Validation errors**: Why requests are rejected
- **Performance**: Request timing information

**Example debug output:**
```
[2026-07-18T16:30:45.123Z] INFO: Server started on port 3000
[2026-07-18T16:31:12.456Z] INFO: [AUTH] OAuth flow initiated: google
[2026-07-18T16:31:25.789Z] INFO: [API] GET /api/categories → 200
[2026-07-18T16:32:00.123Z] INFO: [WS] Client connected { userId: 'user...' }
```

### Code quality checks

Run ESLint to check for issues:
```bash
npm run lint
```

Automatically fix ESLint issues:
```bash
npm run lint:fix
```

## Test Structure

Tests are organized in `__tests__/` directory mirroring the `src/` structure:

```
__tests__/
├── middleware/
│   └── auth.test.js           # Authentication middleware tests
├── config/
│   └── passport.test.js       # Passport configuration tests
├── controllers/
│   └── authController.test.js # Auth controller tests
├── routes/
│   └── auth.integration.test.js # Routes integration tests
└── utils/
    └── prisma.test.js         # Prisma utility tests
```

## Test Coverage

Current coverage status (as of Sprint 2 - WebSocket):

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| auth.js (middleware) | 100% | 100% | 100% | 100% |
| authController.js | 90% | 75% | 100% | 90% |
| budgetController.js | 44.44% | 23.52% | 66.66% | 45.16% |
| categoryController.js | 83.05% | 84.37% | 100% | 83.05% |
| transactionController.js | 83.43% | 77.77% | 100% | 83.33% |
| budgets.js (routes) | 100% | 100% | 100% | 100% |
| budgetAlerts.js (websocket) | 100% | 100% | 100% | 100% |
| categories.js (routes) | 100% | 100% | 100% | 100% |
| transactions.js (routes) | 100% | 100% | 100% | 100% |
| prisma.js | 83.33% | 100% | 83.33% | 83.33% |
| passport.js | 26.47% | 0% | 0% | 26.47% |
| auth.js (routes) | 40% | 0% | 0% | 40% |

**Overall:** 75% statements, 71.42% branches, 62.96% functions, 75% lines
**Test Suites:** 12 passed, 12 total
**Tests:** 174 passed, 174 total

*Note: budgetController coverage is lower because not all error paths are exercised in route tests (error handling is tested in unit tests)*

## What's Tested

### ✅ Middleware - `auth.test.js`
- `isAuthenticated` middleware correctly allows authenticated users
- `isAuthenticated` middleware returns 401 for unauthenticated users
- JSON error response format validation

### ✅ Auth Controller - `authController.test.js`
- `getUser` returns formatted user data
- `getUser` handles missing avatar URLs
- `logout` calls passport logout callback
- `logout` error handling with 500 status

### ✅ Category Controller - `categoryController.test.js`
- Get empty list when user has no categories
- Get list of user's categories with filtering
- Create category with validation (name length, uniqueness)
- Update category name with ownership verification
- Delete empty categories
- Reject deletion if category has transactions (409 Conflict)

### ✅ Category Routes Integration - `routes/categories.test.js`
- Authentication enforcement on all endpoints (401)
- Full CRUD operations with proper status codes
- Category ownership verification (403 Unauthorized)
- Pagination support
- Error handling

### ✅ Transaction Controller - `transactionController.test.js`
- Get transactions with pagination and filtering
- Advanced search: case-insensitive partial match on title/notes
- Filter by category, date range, amount range
- Default sorting by date descending (newest first)
- Sorting by amount, title, date with asc/desc order
- Create transaction with full validation:
  - Amount > 0
  - Date not in future
  - Title non-empty (max 255 chars)
  - Currency ISO 4217 or default USD
  - Category ownership verification
- Update transaction with same validations
- Delete transaction with ownership check

### ✅ Transaction Routes Integration - `routes/transactions.test.js`
- Authentication enforcement on all endpoints (401)
- Full CRUD operations with proper status codes (201, 200, 404, 403, 400, 409)
- Advanced filtering: search, category, date range, amount range
- Pagination with limit/offset and hasMore flag
- Sorting parameter handling
- Comprehensive validation error responses
- Transaction ownership verification (403 Unauthorized)

### ✅ Budget Controller - `budgetController.test.js`
- Get budget with month validation (YYYY-MM format)
- Ownership verification via user_id
- Create and update (upsert) budget operations
- Amount validation (> 0)
- Budget summary calculation:
  - Correct transaction sum per month
  - Remaining budget calculation (budget - spent)
  - Percentage used calculation ((spent / budget) * 100)
  - Handling null budget (no budget set for month)
  - Decimal precision for currency amounts
- Month filtering in transaction queries
- Error handling for database failures

### ✅ Budget Routes Integration - `routes/budgets.test.js`
- Authentication enforcement on all endpoints (401)
- GET /budgets/:month - retrieve budget for specific month (404 if not found)
- POST /budgets - create new budget (201) or update existing (200)
- GET /budgets/:month/summary - comprehensive budget analysis:
  - Returns { budgetAmount, spent, remaining, percentageUsed }
  - Handles no budget set (null budgetAmount)
  - Handles no transactions (0 spent)
  - Handles overspent scenarios (negative remaining, >100% percentageUsed)
  - Correct decimal precision for currency calculations
  - Validates month format (YYYY-MM)
  - Validates amount > 0

### ✅ WebSocket Budget Alerts - `websocket/budgetAlerts.test.js`
- Alert threshold calculation (50%, 80%, 100%)
- Budget summary calculation with correct percentages
- Alert sending logic with once-per-threshold-per-month enforcement
- No alert spam: already-sent alerts not re-triggered
- Client message handling (acknowledge_alert)
- Overspending calculations (>100% percentageUsed)
- Decimal precision handling for currency

### ✅ Prisma Utility - `prisma.test.js`
- Mock fallback client initialization when Prisma fails
- Mock `findUnique` operations
- Mock `create` operations with data spreading
- Mock `update` operations
- `$disconnect` cleanup method

### ✅ Passport Config - `passport.test.js`
- Google OAuth strategy is registered
- GitHub OAuth strategy is registered
- Environment variables loaded properly

### ✅ Routes Integration - `auth.integration.test.js`
- GET `/auth/me` returns 401 for unauthenticated users
- GET `/auth/me` returns user data when authenticated
- POST `/auth/logout` returns 401 for unauthenticated users
- POST `/auth/logout` successfully logs out authenticated user
- Routes are properly registered in router

## Mocking Strategy

### Prisma Mock
Since `npx prisma generate` fails on Windows, tests use Jest module mocking to simulate Prisma Client:

```javascript
jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
```

### Passport Mock
OAuth strategies are mocked to prevent actual network calls:

```javascript
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
// ... loaded before passport config
```

### Express App Mock
Each test creates a minimal Express app with session middleware for route testing:

```javascript
const app = express();
app.use(session({...}));
app.use(passport.initialize());
app.use('/auth', authRouter);
```

## Application Logging

The application includes comprehensive logging for monitoring and debugging. All logs are structured with timestamps and categories for easy filtering.

### Log Categories

**[AUTH]** - Authentication and OAuth flow
- OAuth strategy initiation (google/github)
- Callback success/failure with anonymized user IDs
- Login/logout operations
- Session errors

**[API]** - HTTP request/response logging
- Request method, path, and HTTP status code
- Authenticated user ID (anonymized)
- Response time information

**[CRUD]** - Data operations
- Create/Read/Update/Delete operations
- Resource IDs and operation types
- Data validation errors

**[WS]** - WebSocket real-time events
- Client connections/disconnections
- Budget alert sending (threshold + percentage used)
- Message types and communication events

**[BUDGET]** - Budget-related operations
- Budget calculations
- Alert threshold checks

### Data Privacy in Logs

All sensitive data is automatically censored:
- ✅ Emails: `u***@example.com` (shows domain, hides local part)
- ✅ User IDs: `user...` (shows first 4 chars only)
- ✅ OAuth tokens: Never logged
- ✅ Session IDs: Never logged
- ✅ Avatar URLs: Removed from logs

### Log Output Format

```
[ISO-8601-TIMESTAMP] LEVEL: [CATEGORY] Message { optional: metadata }
```

Example log sequences:

**OAuth flow:**
```
[2026-07-18T16:31:12.123Z] INFO: [AUTH] OAuth flow initiated: google
[2026-07-18T16:31:25.456Z] INFO: [AUTH] OAuth callback success: google { userId: 'user...' }
[2026-07-18T16:31:26.789Z] INFO: [AUTH] User logged in successfully { userId: 'user...', strategy: 'google' }
```

**API call:**
```
[2026-07-18T16:31:35.123Z] INFO: [API] GET /api/categories → 200 { userId: 'user...' }
```

**CRUD operation:**
```
[2026-07-18T16:31:42.456Z] INFO: [CRUD] CREATE Category { resourceId: 'cat-abc123', userId: 'user...' }
[2026-07-18T16:31:42.789Z] INFO: [API] POST /api/categories → 201 { userId: 'user...' }
```

**WebSocket activity:**
```
[2026-07-18T16:32:00.123Z] INFO: [WS] Client connected { userId: 'user...' }
[2026-07-18T16:32:05.456Z] INFO: [WS] Budget alert sent { userId: 'user...', threshold: 80, percentageUsed: 82 }
[2026-07-18T16:32:10.789Z] INFO: [WS] Client disconnected { userId: 'user...' }
```

## Future Test Improvements

For Sprint 3 and beyond, add tests for:

1. **Frontend Integration Tests**
   - WebSocket client connection and message handling
   - Alert UI display and dismissal

2. **End-to-End Tests**
   - Full flow: set budget → create transactions → receive alerts
   - Multi-user scenarios (separate budget alerts per user)

3. **Security Tests**
   - WebSocket authentication failures
   - User isolation (cannot access other user's budget data)
   - Authorization checks on all protected endpoints
   - Input validation and sanitization

## Continuous Integration

When CI/CD is set up, run:

```bash
npm test -- --coverage --passWithNoTests
```

This will:
- Run all tests
- Generate coverage report
- Pass if no tests exist (useful for initial setup)
- Fail if coverage thresholds not met

## Troubleshooting

### Tests fail with "Cannot find module"
Clear Jest cache:
```bash
npx jest --clearCache
```

### Prisma mock not working
Ensure Prisma mock is defined BEFORE importing routes:
```javascript
jest.mock('../../src/utils/prisma', () => ({...}));
const authRouter = require('../../src/routes/auth');
```

### Passport strategies not registered
Set environment variables before importing config:
```javascript
process.env.GOOGLE_CLIENT_ID = 'test-id';
// THEN require('./src/config/passport')
```

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Node.js Testing Best Practices](https://nodejs.org/en/knowledge/testing/)
