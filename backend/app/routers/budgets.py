from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..models import Budget, User
from ..schemas import MONTH_PATTERN, BudgetOut, BudgetUpsert
from .categories import get_owned_category

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    month: str = Query(..., pattern=MONTH_PATTERN),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Budget)
        .options(joinedload(Budget.category))
        .where(Budget.user_id == user.id, Budget.month == month)
    ).all()


@router.put("", response_model=BudgetOut)
def set_budget(data: BudgetUpsert, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates the budget, or updates it if one already exists for that category + month."""
    category = get_owned_category(db, user, data.category_id)
    if category.type != "expense":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Budgets can only be set for expense categories")

    budget = db.scalar(
        select(Budget).where(
            Budget.user_id == user.id, Budget.category_id == category.id, Budget.month == data.month
        )
    )
    if budget is None:
        budget = Budget(user_id=user.id, category_id=category.id, month=data.month, amount=data.amount)
        db.add(budget)
    else:
        budget.amount = data.amount
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.get(Budget, budget_id)
    if budget is None or budget.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget not found")
    db.delete(budget)
    db.commit()
