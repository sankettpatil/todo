from sqlalchemy.orm import Session
try:
    from . import models, schemas
except ImportError:
    import models, schemas
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
            owner_email=note.owner_email,
            reminder_time=note.reminder_time
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
        owner_email=owner_email,
        reminder_time=note.reminder_time
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
        owner_email=db_note.owner_email,
        reminder_time=db_note.reminder_time
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
    if note_update.reminder_time is not None:
        db_note.reminder_time = note_update.reminder_time
    
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
        owner_email=db_note.owner_email,
        reminder_time=db_note.reminder_time
    )
