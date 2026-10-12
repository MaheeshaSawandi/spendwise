"""Database connection (SQLAlchemy 2.0)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

connect_args: dict = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.DB_SSL:
    # PyMySQL: a non-empty "ssl" dict turns on encrypted connections
    ssl_options: dict = {"check_hostname": True}
    if settings.DB_SSL_CA:
        ssl_options["ca"] = settings.DB_SSL_CA
    connect_args = {"ssl": ssl_options}

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: opens a DB session per request and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
