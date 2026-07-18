# Personal Expense Tracker - Project Specification

---

## 🔒 Protokół Walidacji (Workflow)

**Obowiązkowe zasady dla każdego commit'a i implementacji:**

### 1️⃣ Zero-Trust Changes
Po każdej modyfikacji kodu w **backendzie** lub **frontendzie** mam obowiązek samodzielnie uruchomić komendy weryfikujące w terminalu:
- **Backend**: `node --check src/server.js` (syntax check) lub `npm run lint` (jeśli dostępny)
- **Frontend**: `npm run build` (sprawdzenie czy buduje się bez błędów)
- **Testy**: `npm test` (gdy testy będą już napisane)
- **Prisma**: `npx prisma validate` (schema validation)

Żadna zmiana nie jest ukończona bez pomyślnego przejścia walidacji.

### 2️⃣ Auto-Fix Loop
Jeśli jakakolwiek komenda walidująca (build, test, linter) zwróci błąd:
- ❌ **NIE** przerywam pracę
- ❌ **NIE** pytam użytkownika o zdanie
- ✅ Analizuję błąd z terminalu
- ✅ Wprowadzam poprawkę w kodzie
- ✅ Uruchamiam walidację ponownie
- ✅ Powtarzam aż przejdzie bez błędów

To jest moja odpowiedzialność - iteruję aż kod będzie czysty.

### 3️⃣ Zgłaszanie gotowości
Informuję użytkownika o zakończeniu zadania **DOPIERO WTEDY** gdy:
- ✅ Kod został napisany
- ✅ Automatyczna weryfikacja w terminalu zakończyła się **sukcesem** (bez błędów)
- ✅ Status: "zadanie ukończone" + output z walidacji

**Nie ma: "kod jest gotowy, ale nie testuję"**

---

## Cel projektu

**MVP aplikacji "Personal Expense Tracker"** - lokalne uruchomienie, przeznaczona do śledżenia wydatków osobistych.

- Każdy użytkownik widzi **wyłącznie swoje dane**
- Brak współdzielenia danych między użytkownikami
- Wsparcie dla wielu użytkowników w jednej instancji
- Automatyczne powiadomienia o przekroczeniu budżetu

---

## Stos technologiczny

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Baza danych**: SQLite
- **Autentykacja**: Passport.js (Google & GitHub SSO)
- **Komunikacja real-time**: WebSocket (Socket.io lub ws)

### Frontend
- **Framework**: React
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Komponenty**: shadcn/ui
- **Komunikacja**: WebSocket client

### Struktura katalogów
```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── websocket/
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── PROJECT_SPEC.md
└── README.md
```

---

## Wymagania funkcjonalne

### Baza danych i modele
- [x] Inicjalizacja bazy danych SQLite + Prisma
- [x] Model **User** (provider, provider_user_id, email, display_name, avatar_url)
- [x] Model **Category** (name, user_id - unikalne na użytkownika)
- [x] Model **Transaction** (title, amount, currency, date, notes, user_id, category_id)
- [x] Model **Budget** (amount, month, user_id - jeden budżet na miesiąc)
- [x] Kaskadowne usuwanie (user → cascade delete)

### Autentykacja (OAuth) - SSO Only ✅ SPRINT 1
- [x] Integracja Passport.js z Google OAuth / OpenID Connect
- [x] Integracja Passport.js z GitHub OAuth
- [x] Support dla logowania - Google i GitHub
- [x] Support dla wylogowania
- [x] Autentykacja persystuje across page refresh (sesja/token)
- [x] Tworzenie lokalnego rekordu User przy pierwszym logowaniu
- [x] Przechowywanie minimum: provider, provider_user_id, email (jeśli dostępny), display_name, avatar_url (optional)
- [x] Obsługa sesji użytkownika (express-session + cookies)
- [x] Middleware autoryzacji (sprawdzenie czy user jest zalogowany)
- [x] GET /auth/me endpoint (zwraca dane zalogowanego usera)
- [x] POST /auth/logout endpoint
- [x] Account linking między Google i GitHub nie jest wymagane (mogą być oddzielne konta)
- [x] Bezpieczna implementacja Google i GitHub SSO

### CRUD Kategorii ✅ SPRINT 1
- [x] GET /api/categories - lista kategorii użytkownika
- [x] POST /api/categories - utworzenie nowej kategorii
- [x] PUT /api/categories/:id - rename kategorii (edycja nazwy)
- [x] DELETE /api/categories/:id - usunięcie kategorii
  - **Reguła**: Blokada usunięcia jeśli istnieją powiązane transakcje (409 Conflict)
  - **Dokumentacja**: README.md - sekcja "Explanation of Category Deletion Behavior"
- [x] Walidacja: nazwa unikalna na użytkownika
- [x] Autoryzacja: każdy endpoint musi sprawdzać czy user jest właścicielem kategorii

### CRUD Transakcji ✅ SPRINT 1
- [x] GET /api/transactions - lista transakcji użytkownika (z paginacją)
- [x] GET /api/transactions?search=&category=&dateFrom=&dateTo=&amountMin=&amountMax= - wyszukiwanie i filtrowanie
- [x] POST /api/transactions - utworzenie transakcji
- [x] PUT /api/transactions/:id - edycja transakcji (wszystkie pola)
- [x] DELETE /api/transactions/:id - usunięcie transakcji
- [x] **Walidacja**:
  - [x] Amount > 0
  - [x] Transaction date - valid date (nie w przyszłości)
  - [x] Title - non-empty
  - [x] Currency - ISO 4217 (lub domyślnie USD)
- [x] **Autoryzacja**: każdy endpoint musi sprawdzać czy user jest właścicielem transakcji
- [x] **Sortowanie**: sortBy (date/amount/title), sortOrder (asc/desc), domyślnie date DESC
- [ ] **Alerty WebSocket**: Po create/update/delete wysłać alert budżetowy jeśli zmieniony procent zużycia (SPRINT 2)

### Budżet miesięczny ✅ SPRINT 2
- [x] GET /api/budgets/:month - pobranie budżetu na dany miesiąc
- [x] POST /api/budgets - ustawienie budżetu (lub aktualizacja istniejącego)
- [x] Obliczanie sumy wydatków w miesiącu
- [x] Obliczanie pozostałego budżetu (amount - suma wydatków)
- [x] Obliczanie procentu zużycia (suma wydatków / amount * 100)
- [x] Endpoint `GET /api/budgets/:month/summary` - zwraca {budgetAmount, spent, remaining, percentageUsed}

### Wyszukiwanie i filtrowanie transakcji
- [ ] **Search** - wyszukiwanie po title i notes (partial match, case-insensitive)
- [ ] **Filter by category** - dokładne dopasowanie
- [ ] **Filter by date range** - presets: this month, last month, custom range
- [ ] **Filter by amount range** - min/max
- [ ] Kombinacja filtrów (all together)
- [ ] Paginacja (limit, offset)
- [ ] Sortowanie (opcjonalne, ale zalecane)

### WebSocket - Real-time Budget Alerts ✅ SPRINT 2

**Server → Client (Backend pushes alerts)** ✅:
- [x] Backend wysyła alerty budżetowe **dla bieżącego miesiąca kalendarzowego tylko**
- [x] **Progi alertów**:
  - [x] 50% zużycia budżetu
  - [x] 80% zużycia budżetu
  - [x] 100% zużycia budżetu
- [x] **Reguła**: Alert wysyłany **raz na próg na miesiąc** (nie spam) - tracked in BudgetAlert table
- [x] Alerty generowane:
  - [x] Gdy WebSocket connection się otworzy (jeśli budżet ustawiony)
  - [x] Po create/update/delete transakcji (jeśli budżet ustawiony dla bieżącego miesiąca)
- [x] Jeśli nie ustawiony budżet dla bieżącego miesiąca: **brak alertów**
- [x] Autoryzacja: sprawdzenie czy user jest właścicielem budżetu (via session)

**Client → Server (Client sends meaningful messages)** ✅:
- [x] Client wysyła `acknowledge_alert` message do serwera
- [x] Message wpłyna na zachowanie serwera (możliwość rozszerzenia do mark-as-read)
- [x] **Format i semantyka udokumentowane w README**

**UI (Client presentation)** ⏳:
- [ ] Alerty budżetowe widoczne w UI
- [ ] Akceptowalne formy: toast notifications, alert banner, notification panel
- [ ] Client odbiera i wyświetla powiadomienia w real-time

### Frontend - UI i komponenty
- [x] **Ekran logowania** z opcjami:
  - [x] Continue with Google
  - [x] Continue with GitHub
- [x] **Dashboard główny** (po zalogowaniu) - pokazuje wybrany miesiąc:
  - [x] Całkowita suma wydatków w miesiącu
  - [x] Kwota budżetu miesięcznego
  - [x] Pozostały budżet (budget - spent)
  - [x] Procent zużycia budżetu (visual progress bar)
  - [x] Stan "Brak ustawionego budżetu" zamiast mylących liczb
  - [ ] Lista ostatnich transakcji
  - [ ] Widoczne alerty budżetowe (toast/banner/panel)
- [x] **Ekran transakcji** z:
  - [x] Listą/tabelą transakcji
  - [x] Polem wyszukiwania (title + notes)
  - [x] Filtrami: kategoria, zakres dat (ten miesiąc, ostatni miesiąc, custom), zakres kwot
  - [x] UI do tworzenia/edycji (modal, drawer lub osobna strona)
  - [x] Przycisk usuwania z potwierdzeniem
  - [x] Responsywność: tabela→karty na mobile, poziomy scroll jest OK
- [x] **Zarządzanie kategoriami** (strona lub modal):
  - [x] Lista kategorii
  - [x] Dodawanie nowej kategorii
  - [x] Edycja nazwy kategorii
  - [x] Usunięcie kategorii (ze sprawdzeniem transakcji)
- [x] **Ustawienia budżetu** (część dashboarda lub osobna strona):
  - [x] Formularz ustawienia budżetu dla wybranego miesiąca
- [x] **Logout**
- [ ] **UI Requirements - Modern, Styled, Responsive**:
  - [ ] Spójne spacing i typografia
  - [ ] Visible hover i focus states dla elementów interaktywnych
  - [ ] Empty states dla: brak transakcji, brak kategorii, brak wyników wyszukiwania, brak budżetu
  - [ ] Co najmniej jeden visible loading state na głównym ekranie
  - [ ] Validation feedback na formularzach create/edit transakcji (client-side)
  - [ ] Light theme only (dark mode nie wymagane)
  - [ ] Responsywna obsługa wąskich ekranów (mobile)

### Backend Requirements
- [ ] HTTP API supporting all UI flows
- [ ] Enforce authorization dla każdej operacji na category/transaction/budget
- [ ] Enforce authorization na WebSocket connections i budget alert delivery
- [ ] Validacja inputów i clear error responses
- [ ] Bezpieczna implementacja Google i GitHub SSO
- [ ] Persistence w wybranej bazie danych
- [ ] Dokumentacja required environment variables (Google OAuth, GitHub OAuth)
- [ ] Error handling visible w UI

### Testy automatyczne (Minimum coverage)
- [ ] **Autentykacja**:
  - [ ] Mock/stub Google OAuth - successful SSO login path
  - [ ] Mock/stub GitHub OAuth - successful SSO login path
  - [ ] Local user record creation na first successful SSO
  - [ ] Session persistence
  - [ ] Brak real Google/GitHub network calls w testach
- [ ] **Kategorie**:
  - [ ] Create category
  - [ ] CRUD operations
  - [ ] Unikalność nazwy na użytkownika
  - [ ] Obsługa usuwania (blokada vs reassign)
- [ ] **Transakcje**:
  - [ ] Create transaction
  - [ ] CRUD operations
  - [ ] Walidacja (amount > 0, date valid, title non-empty)
  - [ ] Filtrowanie i wyszukiwanie
- [ ] **Budżet**:
  - [ ] Obliczanie sumy wydatków
  - [ ] Obliczanie pozostałości
  - [ ] Obliczanie procentu zużycia
- [ ] **Bezpieczeństwo**:
  - [ ] User nie może dostęp do cudzych kategorii/transakcji/budżetów
  - [ ] Authorization enforcement na wszystkich operacjach
- [ ] **WebSocket**:
  - [ ] Alerty na 50%, 80%, 100% budżetu
  - [ ] Once-per-threshold-per-month rule
  - [ ] Alert fire on connection open
  - [ ] Alert fire po transaction create/update/delete
  - [ ] No budget set = no alerts
- [ ] **End-to-end**: Logowanie → stworzenie budżetu → dodanie transakcji → otrzymanie alertów

---

## Uwagi implementacyjne

1. **Izolacja danych**: Każdy endpoint musi sprawdzać czy zalogowany user jest właścicielem danych (middleware autoryzacji)
2. **Waluta**: Domyślnie USD, ale transakcje mogą być w różnych walutach (ISO 4217)
3. **Miesiąc**: Format `YYYY-MM` (np. "2026-07")
4. **Kategoria usuwania**: Reguła musi być udokumentowana (blokada vs reassign)
5. **WebSocket**: Dwukierunkowa komunikacja - server → client (alerty), client → server (subscribe/ack)
6. **WebSocket - Alert Rule**: Once per threshold per month - jeśli user edit/delete transakcji, alert nie powinien się spamować
7. **Email**: GitHub może nie zawsze podać email, dlatego identity powinno bazować na provider + provider_user_id
8. **Frontend routing**: React Router v6+
9. **State management**: React Context API lub zustand
10. **Error handling**: Validacja inputów, clear error responses na API
11. **Local run**: Projekt musi działać lokalnie z dokumentowanymi komendami

---

## README - Obowiązkowe sekcje

Dokumentacja musi zawierać:
- [ ] How to run backend locally (komendy)
- [ ] How to run frontend locally (komendy)
- [ ] How to run tests (komendy)
- [ ] Short description of API
- [ ] Explanation of category deletion behavior (blokada vs reassign)
- [ ] How to configure Google OAuth credentials
- [ ] How to configure GitHub OAuth credentials
- [ ] WebSocket message format (client → server)
- [ ] WebSocket budget alert rules
- [ ] Required environment variables (.env)

---

## Optional deliverables

- [ ] Containerization via Dockerfile i/lub docker-compose
- [ ] Jeśli containerization nie będzie możliwy, musi być nota w README

---

## Acceptance Checklist (Final verification)

- [ ] User może zalogować się z Google i GitHub
- [ ] Local user record tworzony automatically na first successful SSO
- [ ] User może tworzyć kategorie i transakcje
- [ ] User może ustawić monthly budget i zobaczyć totals, remaining, usage %
- [ ] User może wyszukiwać i filtrować transakcje
- [ ] Dane są private per user (bez cross-account access)
- [ ] While connected, app otrzymuje real-time budget alerts (50%, 80%, 100% dla bieżącego miesiąca)
- [ ] WebSocket flow includes client → server message (zmieniające server behavior)
- [ ] App runs locally z README instructions
- [ ] Tests pass locally

---

## Timeline i priorytet

- **Sprint 1 (P0)**: Baza danych ✅ + OAuth + CRUD Kategorii i Transakcji ✅
- **Sprint 2 (P0)**: Budżet ✅ + WebSocket alerty ✅
- **Sprint 3 (P1)**: Frontend Dashboard, zarządzanie transakcjami
- **Sprint 4 (P2)**: E2E testy, deployment
