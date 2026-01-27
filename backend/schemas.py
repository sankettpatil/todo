from pydantic import BaseModel

from typing import List

class NoteBase(BaseModel):
    title: str
    description: str | None = None
    points: List[str]
    reminder_time: int | None = None  # Unix timestamp for reminder

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    points: List[str] | None = None
    reminder_time: int | None = None  # Allow updating reminder

class Note(NoteBase):
    id: int
    created_at: int | None = None
    updated_at: int | None = None
    owner_email: str | None = None
    reminder_time: int | None = None  # Include in response

    class Config:
        from_attributes = True
