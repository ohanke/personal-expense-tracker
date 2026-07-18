# 💰 Personal Expense Tracker

Full-stack expense tracking application with real-time budget alerts, OAuth authentication, and modern responsive UI.

**Status**: ✅ MVP Complete (Sprint 1-4)

---

## 🎯 Features

- 🔐 **OAuth Authentication** (Google & GitHub SSO)
- 💳 **Expense Tracking** with categories, searching, filtering, pagination
- 💰 **Monthly Budget Management** with visual progress bars
- 🔔 **Real-time Budget Alerts** (50%, 80%, 100% thresholds via WebSocket)
- 📱 **Responsive Design** (mobile, tablet, desktop)
- 🎨 **Modern UI** with Tailwind CSS
- 🔌 **REST API** with full CRUD operations
- ✅ **174+ Automated Tests** (Jest)

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite + Prisma ORM
- **Authentication**: OAuth 2.0 (Google & GitHub)
- **Real-time**: WebSocket (ws library)
- **Testing**: Jest + Supertest

---

## 📋 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** (optional, for containerized deployment)
- Google & GitHub OAuth credentials (optional)

### Local Development

#### 1. Backend Setup

```bash
cd backend
npm install
npx prisma db push
npm start
```

Runs on **http://localhost:3000**

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**

#### 3. Run Tests

```bash
cd backend
npm test
npm run test:watch
```

---

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your OAuth credentials
nano .env

# 3. Start containers
docker-compose up --build

# 4. Access:
# - Frontend: http://localhost
# - Backend API: http://localhost:3000
```

---

## 🔧 Environment Variables

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=file:./prisma/dev.db

# Server
PORT=3000
NODE_ENV=development

# Session (generate: node -e "require('crypto').randomBytes(32).toString('hex')")
SESSION_SECRET=your-random-secret-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

### 🔑 Google OAuth Setup

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Google+ API**
4. Create OAuth 2.0 credentials (Web Application):
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
5. Copy **Client ID** and **Client Secret** to `.env`

### 🔑 GitHub OAuth Setup

1. Visit [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Create a new OAuth App
3. Fill in:
   - Application name: `Personal Expense Tracker`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copy **Client ID** and **Client Secret** to `.env`

---

## 📚 API Documentation

### Authentication

```
GET  /auth/me                      # Get current user
POST /auth/logout                  # Logout
GET  /auth/google                  # Google login redirect
GET  /auth/github                  # GitHub login redirect
```

### Categories

```
GET    /api/categories             # List all categories
POST   /api/categories             # Create category
PUT    /api/categories/:id         # Update category name
DELETE /api/categories/:id         # Delete category (409 if has transactions)
```

### Transactions

```
GET    /api/transactions           # List with filters/pagination
POST   /api/transactions           # Create transaction
PUT    /api/transactions/:id       # Update transaction
DELETE /api/transactions/:id       # Delete transaction
```

**Query Parameters:**
- `search` - Search by title/notes
- `category` - Filter by category ID
- `dateFrom` - Date range start (YYYY-MM-DD)
- `dateTo` - Date range end (YYYY-MM-DD)
- `amountMin` - Minimum amount
- `amountMax` - Maximum amount
- `limit` - Page size (default 10)
- `offset` - Page offset (default 0)
- `sortBy` - Sort field (date/amount/title)
- `sortOrder` - Sort direction (asc/desc)

### Budget

```
GET    /api/budgets/:month         # Get budget (YYYY-MM)
GET    /api/budgets/:month/summary # Get summary (spent, remaining, %)
POST   /api/budgets                # Create/update budget
```

---

## 📡 WebSocket Budget Alerts

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000');
```

**Requires**: Authenticated session (HTTP cookie)

### Server → Client (Budget Alert)

Sent when spending crosses 50%, 80%, or 100% threshold:

```json
{
  "type": "budget_alert",
  "threshold": 80,
  "percentageUsed": 82,
  "budgetAmount": 1000,
  "month": "2026-07"
}
```

### Client → Server (Acknowledge)

Client must acknowledge receipt:

```json
{
  "type": "acknowledge_alert"
}
```

### Alert Rules

- **Thresholds**: 50%, 80%, 100%
- **Frequency**: Once per threshold per month (tracked in `BudgetAlert` table)
- **Triggers**:
  1. On WebSocket connection (if threshold already crossed)
  2. After transaction create/update/delete (if crossing threshold)
- **No Budget**: If no budget set for current month, no alerts sent

---

## 🔐 Category Deletion Behavior

**Policy**: Blocking with 409 Conflict

Categories with associated transactions **cannot be deleted**. This preserves financial history and prevents accidental data loss.

**Error Response**:
```json
{
  "error": "Cannot delete category - it has associated transactions"
}
```

**User Resolution**:
1. Edit transactions to remove/reassign category
2. Delete the now-empty category

**Rationale**: Critical for financial data integrity.

---

## 🧪 Testing

### Run Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch   # Watch mode
```

### Coverage

- ✅ Authentication (OAuth, sessions)
- ✅ CRUD (Categories, Transactions, Budgets)
- ✅ Validation (amounts, dates, required fields)
- ✅ Authorization (user data isolation)
- ✅ WebSocket (alerts, once-per-month rule)
- ✅ Category deletion (409 blocking)

### Results

```
Test Suites: 12 passed
Tests:       174 passed
Coverage:    ~100% critical paths
```

---

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── controllers/          # Business logic
│   │   ├── routes/               # API endpoints
│   │   ├── middleware/           # Auth, validation
│   │   ├── websocket/            # WebSocket handlers
│   │   └── utils/                # Prisma, helpers
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # Migrations
│   ├── __tests__/                # Jest tests
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # React hooks
│   │   ├── services/             # API client
│   │   ├── context/              # React Context
│   │   └── App.jsx               # Main app
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🐛 Troubleshooting

### Frontend shows "Cannot GET /"

```bash
docker-compose down
docker-compose up --build
```

### WebSocket "401 Unauthorized"

Login first, then WebSocket connects

### OAuth redirect loop

Verify `.env` callback URLs match OAuth provider settings exactly

### Database errors

```bash
cd backend
npx prisma db push
```

---

## ✅ Status

**Sprint 1** ✅
- OAuth authentication (Google & GitHub)
- Categories CRUD API
- Transactions CRUD API with advanced features
- 174+ tests passing

**Sprint 2** ✅
- Monthly budget management
- WebSocket real-time alerts
- Budget summary calculations

**Sprint 3** ✅
- React dashboard with budget widget
- Transaction list with filters & pagination
- Category management modal
- WebSocket client integration
- React Hot Toast notifications

**Sprint 4** ✅
- Docker containerization
- Comprehensive README documentation
- docker-compose multi-service setup

---

**Happy expense tracking! 💚**
