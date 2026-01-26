from sqlalchemy.orm import Session
from . import models, schemas
import json

def get_notes(db: Session, owner_email: str | None = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Note)
    if owner_email:
        query = query.filter(models.Note.owner_email == owner_email)
    
    notes = query.offset(skip).limit(limit).all()
    results = []
    for note in notes:
        points = json.loads(note.content) if note.content else []
        results.append(schemas.Note(
            id=note.id, 
            title=note.title, 
            description=note.description, 
            points=points,
            created_at=note.created_at,
            updated_at=note.updated_at,
            owner_email=note.owner_email
        ))
    return results

import time

def create_note(db: Session, note: schemas.NoteCreate, owner_email: str | None = None):
    content_json = json.dumps(note.points)
    timestamp = int(time.time())
    db_note = models.Note(
        title=note.title, 
        description=note.description, 
        content=content_json,
        created_at=timestamp,
        updated_at=timestamp,
        owner_email=owner_email
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    # Return schema-compatible object
    return schemas.Note(
        id=db_note.id, 
        title=db_note.title, 
        description=db_note.description, 
        points=note.points,
        created_at=db_note.created_at,
        updated_at=db_note.updated_at,
        owner_email=db_note.owner_email
    )

def delete_note(db: Session, note_id: int):
    db.query(models.Note).filter(models.Note.id == note_id).delete()
    db.commit()

def update_note(db: Session, note_id: int, note_update: schemas.NoteUpdate):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        return None
    
    if note_update.title is not None:
        db_note.title = note_update.title
    if note_update.description is not None:
        db_note.description = note_update.description
    if note_update.points is not None:
        db_note.content = json.dumps(note_update.points)
    
    # Update timestamp whenever note is edited
    db_note.updated_at = int(time.time())
        
    db.commit()
    db.refresh(db_note)
    
    points = json.loads(db_note.content) if db_note.content else []
    return schemas.Note(
        id=db_note.id, 
        title=db_note.title, 
        description=db_note.description, 
        points=points,
        created_at=db_note.created_at,
        updated_at=db_note.updated_at,
        owner_email=db_note.owner_email
    )
