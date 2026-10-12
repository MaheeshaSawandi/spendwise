from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, month_range
from ..models import Budget, Category, Transaction, User
from ..schemas import MONTH_PATTERN, CategoryTotal, MonthSummary, TrendPoint

router = APIRouter(prefix="/api/reports", tags=["reports"])


def current_month() -> str:
    return date.today().strftime("%Y-%m")


def shift_month(month: str, delta: int) -> str:
    year, mon = (int(x) for x in month.split("-"))
    index = year * 12 + (mon - 1) + delta
    return f"{index // 12:04d}-{index % 12 + 1:02d}"


@router.get("/summary", response_model=MonthSummary)
def month_summary(
    month: str | None = Query(None, pattern=MONTH_PATTERN, description="YYYY-MM, default: this month"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Income, expense and balance for one month, plus totals per category (with budgets)."""
    month = month or current_month()
    start, end = month_range(month)

    # SQL: SELECT category, SUM(amount) ... GROUP BY category
    rows = db.execute(
        select(Category.id, Category.name, Category.color, Category.type, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .where(Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end)
        .group_by(Category.id, Category.name, Category.color, Category.type)
    ).all()

    budgets = {
        b.category_id: float(b.amount)
        for b in db.scalars(select(Budget).where(Budget.user_id == user.id, Budget.month == month))
    }

    by_category = [
        CategoryTotal(
            category_id=cid, name=name, color=color, type=type_, total=float(total or 0),
            budget=budgets.pop(cid, None),
        )
        for cid, name, color, type_, total in rows
    ]
    # Categories that have a budget but no spending yet still show up (total = 0)
    if budgets:
        for cat in db.scalars(select(Category).where(Category.id.in_(list(budgets)))):
            by_category.append(
                CategoryTotal(category_id=cat.id, name=cat.name, color=cat.color, type=cat.type,
                              total=0, budget=budgets[cat.id])
            )
    by_category.sort(key=lambda c: c.total, reverse=True)

    income = sum(c.total for c in by_category if c.type == "income")
    expense = sum(c.total for c in by_category if c.type == "expense")
    return MonthSummary(
        month=month,
        income=round(income, 2),
        expense=round(expense, 2),
        balance=round(income - expense, 2),
        by_category=by_category,
    )


@router.get("/trend", response_model=list[TrendPoint])
def monthly_trend(
    months: int = Query(6, ge=1, le=24),
    end_month: str | None = Query(None, pattern=MONTH_PATTERN, description="YYYY-MM, default: this month"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Income vs expense for the last N months (oldest first)."""
    end_month = end_month or current_month()
    first_month = shift_month(end_month, -(months - 1))
    start, _ = month_range(first_month)
    _, end = month_range(end_month)

    rows = db.execute(
        select(Transaction.date, Transaction.type, Transaction.amount).where(
            Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end
        )
    ).all()

    points = {shift_month(first_month, i): {"income": 0.0, "expense": 0.0} for i in range(months)}
    for tx_date, type_, amount in rows:
        points[tx_date.strftime("%Y-%m")][type_] += float(amount)

    return [
        TrendPoint(month=m, income=round(v["income"], 2), expense=round(v["expense"], 2))
        for m, v in points.items()
    ]
