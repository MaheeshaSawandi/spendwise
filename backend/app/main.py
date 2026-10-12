"""SpendWise API — entry point.

Run locally:  uvicorn app.main:app --reload
API docs:     http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import auth, budgets, categories, reports, transactions


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Creates any missing tables on startup (fine for a small project;
    # a bigger app would use migrations with Alembic).
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SpendWise API",
    description="Personal income & expense tracker",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(reports.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
