"""Pydantic schemas: what the API accepts (…Create/…Update) and returns (…Out)."""
import datetime as dt
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

TxType = Literal["income", "expense"]
Month = str  # "YYYY-MM"
MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"
Money = Decimal


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Categories ----------
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    type: TxType
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: TxType
    color: str


# ---------- Transactions ----------
class TransactionCreate(BaseModel):
    category_id: int
    amount: Money = Field(gt=0, max_digits=12, decimal_places=2)
    date: dt.date
    note: str = Field(default="", max_length=255)


class TransactionUpdate(BaseModel):
    category_id: int | None = None
    amount: Money | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    date: dt.date | None = None
    note: str | None = Field(default=None, max_length=255)


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: TxType
    amount: float
    date: dt.date
    note: str
    category: CategoryOut


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int


# ---------- Budgets ----------
class BudgetUpsert(BaseModel):
    category_id: int
    month: Month = Field(pattern=MONTH_PATTERN)
    amount: Money = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    month: str
    amount: float
    category: CategoryOut


# ---------- Reports ----------
class CategoryTotal(BaseModel):
    category_id: int
    name: str
    color: str
    type: TxType
    total: float
    budget: float | None = None


class MonthSummary(BaseModel):
    month: str
    income: float
    expense: float
    balance: float
    by_category: list[CategoryTotal]


class TrendPoint(BaseModel):
    month: str
    income: float
    expense: float
