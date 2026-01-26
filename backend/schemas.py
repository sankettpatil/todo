from pydantic import BaseModel

from typing import List

class NoteBase(BaseModel):
    title: str
    description: str | None = None
    points: List[str]

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    points: List[str] | None = None

class Note(NoteBase):
    id: int
    created_at: int | None = None
    updated_at: int | None = None
    owner_email: str | None = None

    class Config:
        from_attributes = True
