# Learning guide: understand every part of SpendWise

Interviewers **will** ask you about this project. They'll open a file and say "walk me through this" or "why did you do it this way?". This guide helps you understand the code well enough to answer confidently, and to change it yourself.

## Suggested 3-week plan

| Week | Do this |
|---|---|
| 1 | Run it locally. Read the backend in this order: `models.py` → `schemas.py` → `security.py` → `deps.py` → `routers/auth.py` → `routers/transactions.py`. Try every endpoint at `/docs`. Run `pytest -v`. |
| 2 | Read the frontend: `api.ts` → `auth.tsx` → `App.tsx` → `pages/Transactions.tsx` → `pages/Dashboard.tsx`. Change something small (a colour, a label) and see it update. |
| 3 | **Add a feature yourself** (see the bottom of this guide), write a test for it, deploy, and put the live link on your CV. |

When you don't understand a line, ask an AI tool or look it up, then **write a comment in the code in your own words**.

---

## Key concepts and how to explain them

### 1. REST API
The backend exposes URLs ("endpoints"). The HTTP method says what to do:
`GET` reads, `POST` creates, `PUT` updates, `DELETE` deletes. That's **CRUD**.
Status codes tell the result: `200` OK, `201` created, `204` deleted, `401` not logged in, `404` not found, `409` conflict (e.g. duplicate email), `422` invalid input.

### 2. How login works (JWT + bcrypt)
- **Register:** the password is hashed with **bcrypt** (a slow one-way hash with a salt). We never store the real password, so if the database leaks, passwords aren't exposed.
- **Login:** bcrypt checks the password against the hash. If correct, the server creates a **JWT**, a signed token containing the user id and an expiry time.
- **Every request after that:** the frontend sends `Authorization: Bearer <token>`. `get_current_user()` in `deps.py` verifies the signature with `SECRET_KEY`. If someone edits the token, the signature no longer matches and they get `401`.

> *Why JWT instead of sessions?* The server doesn't have to store sessions. Any server instance can verify the token, so it scales easily.

### 3. Data isolation (security)
Every query filters by `user_id == current user`. `get_owned_transaction()` returns **404** (not 403) when the item belongs to someone else, so attackers can't even find out that the id exists. The test `test_users_cannot_see_each_others_data` proves it works.

### 4. ORM (SQLAlchemy)
Instead of writing SQL strings, tables are Python classes (`models.py`). SQLAlchemy turns
`select(Transaction).where(Transaction.user_id == 5)` into
`SELECT * FROM transactions WHERE user_id = 5`.
Benefits: it protects against **SQL injection**, and the same code works on MySQL (production) and SQLite (tests).

The report in `routers/reports.py` uses a real **GROUP BY with SUM**, so be ready to write that SQL by hand:
```sql
SELECT c.name, SUM(t.amount)
FROM transactions t JOIN categories c ON c.id = t.category_id
WHERE t.user_id = 1 AND t.date >= '2026-10-01' AND t.date < '2026-11-01'
GROUP BY c.id, c.name;
```

### 5. Validation (Pydantic)
`schemas.py` describes what valid input looks like (amount > 0, max 2 decimals, month like `2026-10`). FastAPI rejects bad input with `422` automatically, before the code even runs.

### 6. Database design decisions
- `amount` is `DECIMAL(12,2)`, **not FLOAT**, because floats can't store money exactly (0.1 + 0.2 ≠ 0.3).
- `UNIQUE(user_id, category_id, month)` on budgets makes it impossible to have two budgets for the same thing. The `PUT /api/budgets` endpoint is an "upsert" (update or insert).
- Indexes on `user_id`, `date` and `category_id` make filtering fast.
- You can't delete a category that still has transactions (`409`), which protects data integrity.

### 7. Pagination
`LIMIT page_size OFFSET (page-1)*page_size` loads only one page at a time, plus a `COUNT` for the total. Without this, a user with 10,000 transactions would download all of them.

### 8. CORS
The browser blocks a website from calling an API on a different domain unless the API allows it. `CORSMiddleware` in `main.py` allows only the URLs in `FRONTEND_ORIGINS`.

### 9. React concepts used
- **Components & props**: `TransactionForm` is reused for both "add" and "edit" (the `existing` prop).
- **State (`useState`)** and **side effects (`useEffect`)**: pages load data when the month or filters change.
- **Context (`auth.tsx`)**: the logged-in user is available on every page without passing props down.
- **Protected routes (`App.tsx`)**: `RequireAuth` redirects to `/login` if you're not logged in.
- **Debouncing**: the search box waits 350 ms after you stop typing before calling the API.
- **TypeScript**: `types.ts` matches the backend schemas, so mistakes like `transaction.ammount` are caught before running.

### 10. Testing & CI
Each test gets a fresh in-memory database (`conftest.py`), so tests are fast and independent. GitHub Actions (`.github/workflows/ci.yml`) runs all tests and builds the frontend on every push. You'll see a ✅ or ❌ on GitHub.

---

## Likely interview questions (practise answering out loud)

1. Walk me through what happens when a user clicks "Add transaction".
   *(form → `api.createTransaction` → POST with token → FastAPI validates with Pydantic → `get_current_user` → checks the category belongs to the user → inserts the row → returns 201 → the list reloads)*
2. How do you store passwords? Why not just encrypt them?
3. What's inside a JWT? Can a user change their user id inside it?
4. Why DECIMAL and not FLOAT for money?
5. How do you stop user A from seeing user B's data?
6. What would you change if this app had 1 million users? *(indexes, pagination, caching, migrations, connection pooling)*
7. What was the hardest part and what would you improve?

## Your first feature to add (do it yourself!)

Pick one and build it end-to-end (model → schema → router → test → frontend):

- **Recurring transactions**: a "repeat monthly" checkbox
- **Change password** page
- **Savings goal**: target amount + progress bar on the dashboard
- **Yearly report** page

Adding one feature yourself is what turns this into *your* project. You'll then have a real answer to "what did you build?"
