"""App settings, read from environment variables (or a .env file)."""
import os

try:  # load backend/.env when running locally
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass


class Settings:
    # Example: mysql+pymysql://user:password@localhost:3306/spendwise
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "mysql+pymysql://spendwise:spendwise@localhost:3306/spendwise"
    )
    # For hosted MySQL that requires SSL (e.g. Aiven): set DB_SSL=true and
    # DB_SSL_CA to the path of the CA certificate file you downloaded (e.g. ca.pem).
    DB_SSL: bool = os.getenv("DB_SSL", "false").lower() == "true"
    DB_SSL_CA: str | None = os.getenv("DB_SSL_CA") or None
    # Change this in production! Used to sign login tokens.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    # Comma-separated list of frontend URLs allowed to call the API
    FRONTEND_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]


settings = Settings()
