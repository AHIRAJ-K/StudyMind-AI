from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
import os
import uuid
from typing import List, Optional, Dict

from app.core.database import get_db
from app.core.config import settings
from app.api import deps
from app.models import models
from app.schemas import schemas
from app.crud import crud
from app.services import doc_service, ai_service

router = APIRouter()

@router.post("/upload", response_model=schemas.Document)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Query(None),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a file (PDF, DOCX, TXT, or Image), extract its text contents,
    and save the document metadata to the database.
    """
    # 1. Read file bytes and check size
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE / (1024 * 1024):.1f} MB."
        )
        
    # Get extension
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()
    
    if ext not in [".pdf", ".docx", ".doc", ".txt", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF, Word, TXT, or Image files."
        )
        
    # 2. Save file physically to upload folder
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write file to disk: {str(e)}"
        )
        
    # 3. Extract text from document
    try:
        extracted_text = doc_service.extract_document_text(file_bytes, ext)
    except Exception as e:
        # Delete file if extraction failed to prevent orphan files
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=422,
            detail=f"Failed to extract text content: {str(e)}"
        )
        
    # 4. Save to Database
    doc_in = schemas.DocumentCreate(
        title=file.filename,
        file_type=ext.strip("."),
        file_size=file_size,
        file_path=file_path,
        extracted_text=extracted_text,
        folder_id=folder_id
    )
    
    doc = crud.create_document(db, doc_in, current_user.id)
    crud.log_activity(
        db, 
        current_user.id, 
        "upload_doc", 
        f"Uploaded document: {doc.title} ({doc.file_type.upper()})"
    )
    return doc

@router.get("", response_model=List[schemas.Document])
def list_documents(
    folder_id: Optional[int] = Query(None),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve list of all uploaded documents."""
    return crud.get_documents(db, current_user.id, folder_id)

# ==========================================
# FOLDER MANAGEMENT ENDPOINTS
# ==========================================

@router.post("/folders", response_model=schemas.Folder)
def create_folder(
    folder_in: schemas.FolderCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a folder to organize documents."""
    return crud.create_folder(db, folder_in, current_user.id)

@router.get("/folders", response_model=List[schemas.Folder])
def list_folders(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all folders for current user."""
    return crud.get_folders(db, current_user.id)

@router.delete("/folders/{folder_id}", response_model=Dict[str, str])
def delete_folder(
    folder_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a folder and cascade elements."""
    # Ensure folder belongs to user
    folders = crud.get_folders(db, current_user.id)
    if not any(f.id == folder_id for f in folders):
        raise HTTPException(status_code=404, detail="Folder not found.")
        
    crud.delete_folder(db, folder_id)
    return {"message": "Folder deleted successfully"}


# ==========================================
# DOCUMENT ENDPOINTS WITH DYNAMIC ROUTING
# ==========================================

@router.get("/{doc_id}", response_model=schemas.Document)
def get_document_by_id(
    doc_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve document metadata and content."""
    doc = crud.get_document(db, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.patch("/{doc_id}/rename", response_model=schemas.Document)
def rename_document_by_id(
    doc_id: int,
    rename_in: schemas.DocumentRename,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Rename document title."""
    doc = crud.get_document(db, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    updated_doc = crud.rename_document(db, doc_id, rename_in.title)
    crud.log_activity(
        db, 
        current_user.id, 
        "rename_doc", 
        f"Renamed document to: {rename_in.title}"
    )
    return updated_doc

@router.delete("/{doc_id}", response_model=Dict[str, str])
def delete_document_by_id(
    doc_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete document meta and file from local disk."""
    doc = crud.get_document(db, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    # Delete from physical disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            # log warning but proceed with DB delete
            print(f"Warning: Failed to delete physical file {doc.file_path}: {e}")
            
    crud.delete_document(db, doc_id)
    crud.log_activity(
        db, 
        current_user.id, 
        "delete_doc", 
        f"Deleted document: {doc.title}"
    )
    return {"message": "Document successfully deleted"}

# ==========================================
# GEMINI OPERATIONS ON DOCS
# ==========================================

@router.post("/{doc_id}/summarize")
def summarize_doc(
    doc_id: int,
    summary_type: str = Query("short", description="short, detailed, bullet, chapter, exam, one_line"),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate summary using Gemini AI based on selected format."""
    doc = crud.get_document(db, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="Document has no readable text to summarize.")
        
    try:
        summary = ai_service.generate_summary(doc.extracted_text, summary_type)
        crud.log_activity(
            db, 
            current_user.id, 
            "summarize_doc", 
            f"Generated {summary_type} summary for: {doc.title}"
        )
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )

@router.post("/{doc_id}/explain")
def explain_doc(
    doc_id: int,
    difficulty: str = Query("beginner", description="eli5, beginner, intermediate, advanced"),
    concept: Optional[str] = Query(None, description="Optional specific term or snippet to explain"),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Explain document concept using Gemini AI based on complexity settings."""
    doc = crud.get_document(db, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    text_to_explain = concept if concept else doc.extracted_text[:10000]
    if not text_to_explain:
        raise HTTPException(status_code=400, detail="Nothing to explain in document.")
        
    try:
        explanation = ai_service.generate_explanation(text_to_explain, difficulty)
        crud.log_activity(
            db, 
            current_user.id, 
            "explain_doc", 
            f"Requested explanation ({difficulty}) for: {doc.title}"
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to explain concept: {str(e)}"
        )
