# 💰 SpendWise — Personal Expense Tracker

A full-stack web app for tracking income and expenses, setting monthly budgets, and seeing where your money goes.

**Live demo:** _add your Render link here_ · **API docs:** _your-api-url_/docs

![Dashboard](docs/screenshot-dashboard.png)

## Features

- 🔐 **Accounts**: register and log in with hashed passwords (bcrypt) and JWT tokens
- 💸 **Transactions**: add, edit and delete income and expenses (full CRUD)
- 🔎 **Filters**: by month, type and category, search by note, with server-side pagination
- 🏷️ **Categories**: default categories for every new user, plus your own with custom colours
- 🎯 **Monthly budgets**: set a limit per category and see progress bars turn amber or red
- 📊 **Dashboard**: income/expense/balance cards, spending-by-category pie chart, 6-month trend chart
- 📄 **CSV export**: download any filtered list for Excel
- 🛡️ **Data isolation**: users can only ever see or change their own data (covered by tests)
- ✅ **Automated tests** with pytest, run by **GitHub Actions** on every push

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Recharts |
| Backend | Python, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic |
| Database | MySQL 8 |
| Auth | JWT (PyJWT) + bcrypt password hashing |
| Testing | pytest + FastAPI TestClient (in-memory SQLite) |
| DevOps | Docker Compose, GitHub Actions CI, Render (deployment) |

## Architecture

```mermaid
flowchart LR
    A[React + TypeScript<br/>browser] -- "HTTPS / JSON<br/>Authorization: Bearer JWT" --> B[FastAPI<br/>REST API]
    B -- "SQLAlchemy ORM" --> C[(MySQL)]
```

```
users ──< categories ──< transactions
  └────< budgets (one per category per month)
```

## Project structure

```
spendwise/
├── backend/
│   ├── app/
│   │   ├── main.py          # creates the FastAPI app, CORS, routers
│   │   ├── config.py        # settings from environment variables
│   │   ├── database.py      # MySQL connection + session per request
│   │   ├── models.py        # database tables (SQLAlchemy)
│   │   ├── schemas.py       # request/response validation (Pydantic)
│   │   ├── security.py      # bcrypt hashing + JWT tokens
│   │   ├── deps.py          # get_current_user, month helpers
│   │   └── routers/         # auth, categories, transactions, budgets, reports
│   ├── tests/               # 15 pytest tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── api.ts           # all calls to the backend in one place
│       ├── auth.tsx         # login state shared with React Context
│       ├── App.tsx          # routes + protected pages
│       ├── components/      # Layout, Modal, TransactionForm, MonthPicker
│       └── pages/           # Dashboard, Transactions, Categories, AuthPage
├── docker-compose.yml       # MySQL + API with one command
├── render.yaml              # one-click deployment on Render
└── .github/workflows/ci.yml # runs tests + build on every push
```

## Run it on your computer

You need **Python 3.11+**, **Node.js 20+**, and **MySQL 8** (or Docker).

### 1. Start MySQL + the backend

**Option A: with Docker (easiest)**
```bash
docker compose up --build
```
This starts MySQL and the API at http://localhost:8000. Open **http://localhost:8000/docs** to see and try every endpoint.

**Option B: without Docker**

First create the database in MySQL:
```sql
CREATE DATABASE spendwise;
CREATE USER 'spendwise'@'localhost' IDENTIFIED BY 'spendwise';
GRANT ALL PRIVILEGES ON spendwise.* TO 'spendwise'@'localhost';
```
Then run the backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements-dev.txt
copy .env.example .env         # Mac/Linux: cp .env.example .env
uvicorn app.main:app --reload
```
The tables are created automatically on first start.

### 2. Start the frontend
```bash
cd frontend
npm install
copy .env.example .env         # Mac/Linux: cp .env.example .env
npm run dev
```
Open **http://localhost:5173**, create an account, and start adding transactions.

### 3. Run the tests
```bash
cd backend
pytest -v
```
The tests use an in-memory SQLite database, so MySQL doesn't need to be running.

## API endpoints

All endpoints except register/login need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account → returns token |
| POST | `/api/auth/login` | Log in → returns token |
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/categories` | List / create categories |
| PUT / DELETE | `/api/categories/{id}` | Rename/recolour / delete (blocked if in use) |
| GET | `/api/transactions?month=&type=&category_id=&search=&page=&page_size=` | Filtered, paginated list |
| POST | `/api/transactions` | Create transaction |
| GET / PUT / DELETE | `/api/transactions/{id}` | Read / update / delete |
| GET | `/api/transactions/export.csv` | Download as CSV (same filters) |
| GET | `/api/budgets?month=YYYY-MM` | Budgets for a month |
| PUT | `/api/budgets` | Create or update a budget |
| DELETE | `/api/budgets/{id}` | Remove a budget |
| GET | `/api/reports/summary?month=YYYY-MM` | Income, expense, balance, totals per category |
| GET | `/api/reports/trend?months=6` | Income vs expense per month |

## Deploy it for free (live link for your CV)

1. **Push the project to GitHub.**
2. **Create a free MySQL database on [Aiven](https://aiven.io/free-mysql-database)** (no credit card required). From the service page, copy the connection details and **download the CA certificate**. Save the certificate as `backend/ca.pem` and commit it (it's a public certificate, not a secret).
3. **Deploy on [Render](https://render.com)**: choose New → **Blueprint** → select your repo. Render reads `render.yaml` and creates the API and the website. When it asks for values:
   - `DATABASE_URL` = `mysql+pymysql://USER:PASSWORD@HOST:PORT/defaultdb` (from Aiven)
   - `FRONTEND_ORIGINS` = your website's Render URL, e.g. `https://spendwise-web.onrender.com`
   - `VITE_API_URL` = your API's Render URL, e.g. `https://spendwise-api.onrender.com`
4. Open the website URL, register, and add some sample data before you share the link.

> Free services go to sleep when unused. The first request after a while can take ~30–60 seconds, so open the link once before an interview.

## Ideas to extend it

- Recurring transactions (monthly rent, salary)
- Database migrations with Alembic
- Frontend tests with Vitest + React Testing Library
- Dark mode
- Upload receipts as images
- A Flutter mobile app that uses this same API

## Author

**Maheesha Sawandi** · [GitHub](https://github.com/MaheeshaSawandi) · [LinkedIn](https://linkedin.com/in/maheesha-sawandi-12953033b)
