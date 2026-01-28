from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware

try:
    from . import crud, models, schemas
    from .database import SessionLocal, engine
except ImportError:
    import crud, models, schemas
    from database import SessionLocal, engine

# Create tables
models.Base.metadata.create_all(bind=engine)

import os
# ... imports

app = FastAPI(root_path="/api" if os.getenv("VERCEL") else "")

# Allow CORS for frontend
# In production, this should be set to your Netlify URL
origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
if origins_str == "*":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

print(f"Allowed Origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-User-Email", "Content-Type", "Authorization"],
)

@app.get("/")
def read_root():
    return {"message": "Todo API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/notes/", response_model=schemas.Note)
def create_note(
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    x_user_email: str | None = Header(default=None, alias="X-User-Email")
):
    return crud.create_note(db=db, note=note, owner_email=x_user_email)

@app.get("/notes/", response_model=List[schemas.Note])
def read_notes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    x_user_email: str | None = Header(default=None, alias="X-User-Email")
):
    notes = crud.get_notes(db, skip=skip, limit=limit, owner_email=x_user_email)
    return notes

@app.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    crud.delete_note(db, note_id=note_id)
    return {"message": "Note deleted"}

@app.put("/notes/{note_id}", response_model=schemas.Note)
def update_note(note_id: int, note_update: schemas.NoteUpdate, db: Session = Depends(get_db)):
    updated_note = crud.update_note(db, note_id=note_id, note_update=note_update)
    if not updated_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return updated_note

@app.patch("/notes/{note_id}/pin")
def toggle_pin_note(
    note_id: int, 
    db: Session = Depends(get_db),
    x_user_email: str | None = Header(default=None, alias="X-User-Email")
):
    try:
        from . import pin_utils
    except ImportError:
        import pin_utils
    
    result = pin_utils.toggle_pin(db, note_id=note_id, owner_email=x_user_email)
    if result is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
