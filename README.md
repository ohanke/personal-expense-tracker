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
```

## Ograniczenia bazy danych

- **User**: unikalna kombinacja (provider, provider_user_id)
- **Category**: unikalna kombinacja (user_id, name)
- **Budget**: unikalna kombinacja (user_id, month)
- **Kaskadowne usuwanie**: usunięcie użytkownika lub kategorii automatycznie usuwa powiązane rekordy

## Status

- ✅ Backend project initialized
- ✅ Prisma schema created
- ✅ Database migrations applied
- ⏳ API endpoints (pending)
- ⏳ Frontend (pending)
