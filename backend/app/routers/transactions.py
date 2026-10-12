import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, month_range
from ..models import Transaction, User
from ..schemas import MONTH_PATTERN, TransactionCreate, TransactionOut, TransactionPage, TransactionUpdate
from .categories import get_owned_category

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def filtered_query(
    user: User,
    month: str | None,
    type_: str | None,
    category_id: int | None,
    search: str | None,
) -> Select:
    query = select(Transaction).where(Transaction.user_id == user.id)
    if month:
        start, end = month_range(month)
        query = query.where(Transaction.date >= start, Transaction.date < end)
    if type_:
        query = query.where(Transaction.type == type_)
    if category_id:
        query = query.where(Transaction.category_id == category_id)
    if search:
        query = query.where(Transaction.note.ilike(f"%{search.strip()}%"))
    return query


def get_owned_transaction(db: Session, user: User, tx_id: int) -> Transaction:
    tx = db.get(Transaction, tx_id)
    if tx is None or tx.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    return tx


@router.get("", response_model=TransactionPage)
def list_transactions(
    month: str | None = Query(None, pattern=MONTH_PATTERN, description="YYYY-MM"),
    type: Literal["income", "expense"] | None = None,
    category_id: int | None = None,
    search: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = filtered_query(user, month, type, category_id, search)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(
        query.options(joinedload(Transaction.category))
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return TransactionPage(items=items, total=total or 0, page=page, page_size=page_size)


@router.get("/export.csv")
def export_csv(
    month: str | None = Query(None, pattern=MONTH_PATTERN),
    type: Literal["income", "expense"] | None = None,
    category_id: int | None = None,
    search: str | None = Query(None, max_length=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        filtered_query(user, month, type, category_id, search)
        .options(joinedload(Transaction.category))
        .order_by(Transaction.date)
    ).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Type", "Category", "Amount", "Note"])
    for tx in rows:
        writer.writerow([tx.date.isoformat(), tx.type, tx.category.name, f"{tx.amount:.2f}", tx.note])
    filename = f"transactions-{month or 'all'}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    category = get_owned_category(db, user, data.category_id)
    tx = Transaction(
        user_id=user.id,
        category_id=category.id,
        type=category.type,  # type always follows the category
        amount=data.amount,
        date=data.date,
        note=data.note.strip(),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/{tx_id}", response_model=TransactionOut)
def get_transaction(tx_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_owned_transaction(db, user, tx_id)


@router.put("/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = get_owned_transaction(db, user, tx_id)
    if data.category_id is not None:
        category = get_owned_category(db, user, data.category_id)
        tx.category_id = category.id
        tx.type = category.type
    if data.amount is not None:
        tx.amount = data.amount
    if data.date is not None:
        tx.date = data.date
    if data.note is not None:
        tx.note = data.note.strip()
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = get_owned_transaction(db, user, tx_id)
    db.delete(tx)
    db.commit()
