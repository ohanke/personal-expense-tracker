# Personal Expense Tracker - MVP

Aplikacja do śledzenia wydatków z uwierzytelnianiem OAuth (Google/GitHub), kategoryzacją transakcji oraz zarządzaniem budżetami.

## Struktura projektu

```
.
├── backend/           # Node.js + Express API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── .env
│   ├── package.json
│   └── ...
└── frontend/          # React + Vite + Tailwind CSS
    ├── src/
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── ...
```

## Stos technologiczny

- **Backend**: Node.js + Express.js
- **Frontend**: React + Vite + Tailwind CSS
- **Baza danych**: SQLite + Prisma ORM
- **Autentykacja**: Google/GitHub OAuth

## Modele bazy danych

### User
- Przechowuje dane użytkownika uwierzytelnionego przez OAuth
- Pola: `provider`, `provider_user_id`, `email`, `display_name`, `avatar_url`
- Relacje: `categories`, `transactions`, `budgets`

### Category
- Kategorie wydatków dla każdego użytkownika
- Pola: `name` (unikalne na użytkownika)
- Relacje: `user`, `transactions`

### Transaction
- Pojedyncze transakcje wydatkowe
- Pola: `title`, `amount` (Float), `currency` (domyślnie USD), `date`, `notes`
- Relacje: `user`, `category`
- Kaskadowne usuwanie: usunięcie użytkownika lub kategorii kasuje transakcje

### Budget
- Budżet miesięczny dla użytkownika
- Pola: `amount` (Float), `month` (format: YYYY-MM)
- Relacje: `user`
- Kaskadowne usuwanie: usunięcie użytkownika kasuje budżety

## Setup

### Backend

```bash
cd backend
npm install
npx prisma db push  # Zainicjuj bazę danych
npm start           # Uruchom serwer
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Uruchom dev server
```

## Zmienne środowiskowe

### Backend (.env)

```
DATABASE_URL=file:./dev.db
PORT=3000
NODE_ENV=development
SESSION_SECRET=dev-session-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get logged-in user profile (requires auth)
- `POST /auth/logout` - Logout current user

### Categories
- `GET /api/categories` - List user's categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category name
- `DELETE /api/categories/:id` - Delete category (see deletion rules below)

### Transactions
- `GET /api/transactions` - List user's transactions (with filtering, searching, pagination, sorting)
  - Query params: `limit`, `offset`, `search`, `category`, `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `sortBy`, `sortOrder`
  - Default sort: `date` descending (newest first)
- `POST /api/transactions` - Create transaction
  - Required: `title`, `amount`, `date`
  - Optional: `currency` (default USD), `notes`, `category_id`
- `PUT /api/transactions/:id` - Update transaction
  - Same fields as POST
- `DELETE /api/transactions/:id` - Delete transaction

### Budgets
- `GET /api/budgets/:month` - Get budget for specific month (format: YYYY-MM)
  - Returns: `{ id, user_id, month, amount, created_at, updated_at }`
  - Status 404 if no budget set for month
- `POST /api/budgets` - Create or update budget (upsert)
  - Body: `{ month: "YYYY-MM", amount: number > 0 }`
  - Status 201 on create, 200 on update
- `GET /api/budgets/:month/summary` - Get budget summary with spending analysis
  - Returns: `{ budgetAmount, spent, remaining, percentageUsed }`
  - `budgetAmount`: null if no budget set, otherwise the budget amount
  - `spent`: sum of all transactions in the month
  - `remaining`: budgetAmount - spent (null if no budget)
  - `percentageUsed`: (spent / budgetAmount) * 100 (null if no budget)

## Explanation of Category Deletion Behavior

**Policy: Blocking deletion** ✅

Deleting a category that contains existing transactions is **blocked** with a `409 Conflict` error.

**Reason**: This prevents accidental data loss and ensures referential integrity. Users must explicitly:
1. Delete the associated transactions first, OR
2. Reassign them to another category before deleting the category

**Error Response**:
```json
{
  "error": "Cannot delete category with existing transactions. Please reassign or delete transactions first.",
  "transactionCount": 2
}
```

This approach prioritizes data safety over convenience, which is critical for a financial tracking application.

## Testing

```bash
cd backend
npm test              # Run all tests
npm run test:watch   # Run tests in watch mode
npm test -- --coverage  # Generate coverage report
```

See `TESTING.md` for detailed testing documentation.

## Ograniczenia bazy danych

- **User**: unikalna kombinacja (provider, provider_user_id)
- **Category**: unikalna kombinacja (user_id, name)
- **Budget**: unikalna kombinacja (user_id, month)
- **Kaskadowne usuwanie**: usunięcie użytkownika lub kategorii automatycznie usuwa powiązane rekordy

## Status

- ✅ Backend project initialized
- ✅ Prisma schema created with all models
- ✅ OAuth authentication (Google + GitHub)
- ✅ Session management with express-session
- ✅ Categories CRUD API
- ✅ Transactions CRUD API with advanced filtering/searching/pagination/sorting
- ✅ Budget endpoints API with summary calculation (Sprint 2)
- ✅ Comprehensive unit and integration tests (150 tests passing)
- ⏳ WebSocket alerts (Sprint 2)
- ⏳ Frontend (Sprint 3)
