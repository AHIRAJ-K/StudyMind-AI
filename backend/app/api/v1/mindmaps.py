from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.database import get_db
from app.api import deps
from app.models import models
from app.schemas import schemas
from app.crud import crud
from app.services import ai_service

router = APIRouter()

@router.post("", response_model=schemas.MindMap)
def create_mind_map(
    map_in: schemas.MindMapBase,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a mind map from document text using Gemini.
    Returns a structured hierarchical JSON format representing topics & relationships.
    """
    if not map_in.document_id:
        raise HTTPException(
            status_code=400,
            detail="A document_id must be provided to generate a mind map."
        )
        
    doc = crud.get_document(db, map_in.document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Associated document not found.")
        
    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="Document text content is empty.")
        
    # Generate map structure using Gemini
    try:
        structure = ai_service.generate_mind_map(doc.extracted_text)
        
        map_create = schemas.MindMapCreate(
            title=map_in.title,
            document_id=map_in.document_id,
            structure=structure
        )
        
        mindmap = crud.create_mindmap(db, map_create, current_user.id)
        crud.log_activity(db, current_user.id, "edit_note", f"Generated mind map: {mindmap.title}")
        return mindmap
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate mind map via AI: {str(e)}"
        )

@router.get("", response_model=List[schemas.MindMap])
def list_mind_maps(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all mind maps created by the current user."""
    return crud.get_mindmaps(db, current_user.id)

@router.get("/{map_id}", response_model=schemas.MindMap)
def get_mind_map(
    map_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch details of a single mind map structure."""
    mindmap = crud.get_mindmap(db, map_id)
    if not mindmap or mindmap.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Mind map not found.")
    return mindmap

@router.delete("/{map_id}", response_model=Dict[str, str])
def delete_mind_map(
    map_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a mind map."""
    mindmap = crud.get_mindmap(db, map_id)
    if not mindmap or mindmap.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Mind map not found.")
        
    crud.delete_mindmap(db, map_id)
    return {"message": "Mind map deleted successfully"}
