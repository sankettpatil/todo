from pydantic import BaseModel

from typing import List

class NoteBase(BaseModel):
    title: str
    description: str | None = None
    points: List[str]
    reminder_time: int | None = None  # Unix timestamp for reminder
    color: str | None = "bg-yellow-200"
    tags: List[str] | None = []

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    points: List[str] | None = None
    reminder_time: int | None = None  # Allow updating reminder
    pinned: bool | None = None  # Allow updating pin status
    pin_order: int | None = None  # Allow updating pin order
    color: str | None = None
    tags: List[str] | None = None

class Note(NoteBase):
    id: int
    created_at: int | None = None
    updated_at: int | None = None
    owner_email: str | None = None
    reminder_time: int | None = None  # Include in response
    pinned: bool = False  # Include in response
    pin_order: int | None = None  # Include in response
    color: str | None = "bg-yellow-200"
    tags: List[str] | None = []

    class Config:
        from_attributes = True
