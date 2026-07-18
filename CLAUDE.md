# Claude Code Session - Personal Expense Tracker

## Project Status

### Completed (Sprint 1 & 2)
- ✅ Backend project initialized with Express.js
- ✅ Prisma ORM with SQLite database
- ✅ OAuth authentication (Google + GitHub)
- ✅ Categories CRUD API
- ✅ Transactions CRUD API (advanced filtering, pagination, sorting)
- ✅ Budget endpoints (GET, POST, summary)
- ✅ WebSocket real-time budget alerts (once-per-threshold-per-month)
- ✅ 174 tests passing (12 suites)

### Next: Frontend (Sprint 3)
- [ ] React + Vite + Tailwind CSS
- [ ] Authentication flow (OAuth redirect)
- [ ] Dashboard with budget summary
- [ ] Transaction list/table with filtering
- [ ] WebSocket client connection
- [ ] Alert notifications (toast/banner)

## Architecture Notes

### Backend Structure
```
backend/
├── src/
│   ├── controllers/  # Business logic
│   ├── routes/       # API endpoints
│   ├── middleware/   # Auth, etc.
│   ├── websocket/    # WebSocket handlers
│   └── utils/        # Prisma, helpers
├── prisma/           # Schema, migrations
└── __tests__/        # Jest tests
```

### Database Models
- **User**: OAuth provider data
- **Category**: User's expense categories
- **Transaction**: Individual expenses
- **Budget**: Monthly budget (user_id + month unique)
- **BudgetAlert**: Tracks alert thresholds sent (once-per-month rule)

### WebSocket Implementation
- Uses `ws` library (lightweight)
- Authenticated via Express session
- Alert thresholds: 50%, 80%, 100%
- Triggered on:
  1. Connection open (if threshold already crossed)
  2. Transaction create/update/delete (if spending crosses threshold)
- Once-per-threshold-per-month (prevents spam)

## Key Design Decisions

1. **Optional Categories**: Transactions can exist without category (SetNull cascade)
2. **One Budget Per Month**: user_id + month unique constraint
3. **No Alert Spam**: BudgetAlert table enforces once-per-threshold
4. **Currency Support**: ISO 4217 with USD default
5. **Decimal Precision**: parseFloat().toFixed(2) for currency calculations
6. **Date Validation**: ISO format, no future dates

## Testing Strategy

- Jest for unit/integration tests
- Prisma mocked to avoid database dependencies
- 100% coverage on controllers and routes where tested
- budgetAlerts.js: 100% coverage
- transactionController.js: includes WebSocket logic that's partially tested

## Environment Variables

```
DATABASE_URL=file:./dev.db
PORT=3000
NODE_ENV=development
SESSION_SECRET=dev-session-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## Running Locally

```bash
cd backend
npm install
npx prisma db push
npm start          # http://localhost:3000
npm test           # Run tests
npm run test:watch # Watch mode
```

## Code Patterns

- **Ownership Verification**: Always check `req.user.id` before operations
- **Error Handling**: Try-catch in controllers, proper HTTP status codes
- **Validation**: Separate validate* functions per field
- **WebSocket**: Lazy-loaded in transactionController to avoid circular deps
- **Month Format**: Always "YYYY-MM" (e.g., "2026-07")
