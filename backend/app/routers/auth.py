from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Category, User
from ..schemas import LoginRequest, TokenOut, UserCreate, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Every new user starts with these categories so the app is usable right away.
DEFAULT_CATEGORIES = [
    ("Salary", "income", "#16a34a"),
    ("Freelance", "income", "#0d9488"),
    ("Other Income", "income", "#65a30d"),
    ("Food", "expense", "#f97316"),
    ("Transport", "expense", "#3b82f6"),
    ("Bills", "expense", "#ef4444"),
    ("Shopping", "expense", "#a855f7"),
    ("Education", "expense", "#eab308"),
    ("Health", "expense", "#ec4899"),
    ("Other", "expense", "#64748b"),
]


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered")

    user = User(email=email, full_name=data.full_name.strip(), password_hash=hash_password(data.password))
    user.categories = [Category(name=n, type=t, color=c) for n, t, c in DEFAULT_CATEGORIES]
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
