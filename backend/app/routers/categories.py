from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Category, Transaction, User
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


def get_owned_category(db: Session, user: User, category_id: int) -> Category:
    """Returns the category only if it belongs to this user (otherwise 404)."""
    category = db.get(Category, category_id)
    if category is None or category.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    return category


def ensure_unique_name(db: Session, user: User, name: str, type_: str, exclude_id: int | None = None):
    query = select(Category).where(
        Category.user_id == user.id, func.lower(Category.name) == name.lower(), Category.type == type_
    )
    if exclude_id is not None:
        query = query.where(Category.id != exclude_id)
    if db.scalar(query):
        raise HTTPException(status.HTTP_409_CONFLICT, f"You already have a '{name}' category")


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(Category).where(Category.user_id == user.id).order_by(Category.type, Category.name)
    ).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    name = data.name.strip()
    ensure_unique_name(db, user, name, data.type)
    category = Category(user_id=user.id, name=name, type=data.type, color=data.color)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = get_owned_category(db, user, category_id)
    if data.name is not None:
        name = data.name.strip()
        ensure_unique_name(db, user, name, category.type, exclude_id=category.id)
        category.name = name
    if data.color is not None:
        category.color = data.color
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    category = get_owned_category(db, user, category_id)
    used = db.scalar(select(func.count()).where(Transaction.category_id == category.id))
    if used:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This category is used by {used} transaction(s). Move or delete them first.",
        )
    db.delete(category)
    db.commit()
