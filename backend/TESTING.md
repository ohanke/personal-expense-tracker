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

Current coverage status (as of Sprint 1):

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| auth.js (middleware) | 100% | 100% | 100% | 100% |
| authController.js | 90% | 75% | 100% | 90% |
| categoryController.js | 83.05% | 84.37% | 100% | 83.05% |
| transactionController.js | 89.14% | 83.8% | 100% | 89.06% |
| categories.js (routes) | 100% | 100% | 100% | 100% |
| transactions.js (routes) | 100% | 100% | 100% | 100% |
| prisma.js | 83.33% | 100% | 83.33% | 83.33% |
| passport.js | 26.47% | 0% | 0% | 26.47% |
| auth.js (routes) | 40% | 0% | 0% | 40% |

**Overall:** 76.51% statements, 74.53% branches, 65.62% functions, 76.43% lines
**Test Suites:** 9 passed, 9 total
**Tests:** 105 passed, 105 total

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

## Future Test Improvements

For Sprint 2 and beyond, add tests for:

1. **Budget Endpoints**
   - Set monthly budget
   - Fetch budget summary
   - Calculate spending vs budget

4. **WebSocket Alerts**
   - Alert thresholds (50%, 80%, 100%)
   - Once-per-threshold-per-month rule
   - Alert firing on connection and after transaction changes

5. **Security Tests**
   - User isolation (cannot access other user's data)
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
