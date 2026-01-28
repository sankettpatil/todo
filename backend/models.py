from sqlalchemy import Boolean, Column, Integer, String
try:
    from .database import Base
except ImportError:
    from database import Base

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    content = Column(String, default="[]") 
    created_at = Column(Integer, nullable=True)
    updated_at = Column(Integer, nullable=True)
    owner_email = Column(String, index=True, nullable=True) # Optional: for ordering
    reminder_time = Column(Integer, nullable=True) # Unix timestamp for reminder
    pinned = Column(Boolean, default=False) # Whether note is pinned
    pin_order = Column(Integer, nullable=True) # Order of pinned notes (1-3)
