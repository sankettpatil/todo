from sqlalchemy.orm import Session
try:
    from . import models, schemas
except ImportError:
    import models, schemas

def toggle_pin(db: Session, note_id: int, owner_email: str | None = None):
    """Toggle pin status for a note. Handle pin limit of 3."""
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        return None
    
    # If unpinning
    if db_note.pinned:
        db_note.pinned = False
        old_order = db_note.pin_order
        db_note.pin_order = None
        
        # Reorder remaining pinned notes
        if old_order is not None:
            pinned_notes = db.query(models.Note).filter(
                models.Note.pinned == True,
                models.Note.pin_order > old_order
            )
            if owner_email:
                pinned_notes = pinned_notes.filter(models.Note.owner_email == owner_email)
            
            for note in pinned_notes.all():
                note.pin_order -= 1
        
        db.commit()
        db.refresh(db_note)
        return {"pinned": False, "pin_order": None}
    
    # If pinning, check limit
    query = db.query(models.Note).filter(models.Note.pinned == True)
    if owner_email:
        query = query.filter(models.Note.owner_email == owner_email)
    
    pinned_count = query.count()
    
    if pinned_count >= 3:
        return {"error": "Maximum 3 notes can be pinned"}
    
    # Pin the note
    db_note.pinned = True
    db_note.pin_order = pinned_count + 1  # 1-indexed
    
    db.commit()
    db.refresh(db_note)
    
    return {"pinned": True, "pin_order": db_note.pin_order}
