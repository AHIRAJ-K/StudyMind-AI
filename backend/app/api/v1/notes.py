from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.api import deps
from app.models import models
from app.schemas import schemas
from app.crud import crud

router = APIRouter()

@router.post("", response_model=schemas.Note)
def create_note(
    note_in: schemas.NoteCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new study note."""
    note = crud.create_note(db, note_in, current_user.id)
    crud.log_activity(db, current_user.id, "edit_note", f"Created note: {note.title}")
    return note

@router.get("", response_model=List[schemas.Note])
def list_notes(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all study notes for the current user."""
    return crud.get_notes(db, current_user.id)

@router.get("/{note_id}", response_model=schemas.Note)
def get_note(
    note_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get note detail by ID."""
    note = crud.get_note(db, note_id)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found.")
    return note

@router.put("/{note_id}", response_model=schemas.Note)
def update_note(
    note_id: int,
    note_in: schemas.NoteUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update note contents or settings.
    Suitable for handling client-side debounced autosave payloads.
    """
    note = crud.get_note(db, note_id)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found.")
        
    updated_note = crud.update_note(db, db_note=note, note_in=note_in)
    return updated_note

@router.delete("/{note_id}", response_model=Dict[str, str])
def delete_note(
    note_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note."""
    note = crud.get_note(db, note_id)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found.")
        
    crud.delete_note(db, note_id)
    crud.log_activity(db, current_user.id, "edit_note", f"Deleted note: {note.title}")
    return {"message": "Note successfully deleted"}
