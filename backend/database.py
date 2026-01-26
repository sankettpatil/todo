import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Vercel provides POSTGRES_URL or DATABASE_URL
SQLALCHEMY_DATABASE_URL = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL") or "sqlite:///./sql_app.db"

# Check if we are using SQLite or Postgres
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Postgres needs strict URL format (postgresql:// instead of postgres://)
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://")
    connect_args = {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
