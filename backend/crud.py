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
    
    # Sort by pinned first (descending), then pin_order (ascending for pinned), then id
    notes = query.order_by(
        models.Note.pinned.desc(),
        models.Note.pin_order.asc().nullslast(),
        models.Note.id.desc()
    ).offset(skip).limit(limit).all()
    
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
            reminder_time=note.reminder_time,
            pinned=note.pinned or False,
            pin_order=note.pin_order,
            color=note.color,
            tags=json.loads(note.tags) if note.tags else []
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
        reminder_time=note.reminder_time,
        color=note.color,
        tags=json.dumps(note.tags) if note.tags else "[]"
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
        reminder_time=db_note.reminder_time,
        pinned=db_note.pinned,
        pin_order=db_note.pin_order,
        color=db_note.color,
        tags=note.tags
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
    if note_update.pinned is not None:
        db_note.pinned = note_update.pinned
    if note_update.pin_order is not None:
        db_note.pin_order = note_update.pin_order
    if note_update.color is not None:
        db_note.color = note_update.color
    if note_update.tags is not None:
        db_note.tags = json.dumps(note_update.tags)
    
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
        reminder_time=db_note.reminder_time,
        pinned=db_note.pinned,
        pin_order=db_note.pin_order,
        color=db_note.color,
        tags=json.loads(db_note.tags) if db_note.tags else []
    )
