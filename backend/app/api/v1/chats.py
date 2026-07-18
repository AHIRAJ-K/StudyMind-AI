from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Generator

from app.core.database import get_db
from app.api import deps
from app.models import models
from app.schemas import schemas
from app.crud import crud
from app.services import ai_service

router = APIRouter()

@router.post("/sessions", response_model=schemas.ChatSession)
def create_session(
    session_in: schemas.ChatSessionCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new chat session. Optionally links to a specific document."""
    if session_in.document_id:
        doc = crud.get_document(db, session_in.document_id)
        if not doc or doc.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Associated document not found.")
            
    session = crud.create_chat_session(db, session_in, current_user.id)
    crud.log_activity(db, current_user.id, "ask_ai", f"Created chat session: {session.title}")
    return session

@router.get("/sessions", response_model=List[schemas.ChatSession])
def list_sessions(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of user's active chat sessions."""
    return crud.get_chat_sessions(db, current_user.id)

@router.get("/sessions/{session_id}", response_model=schemas.ChatSessionDetail)
def get_session(
    session_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full chat session details, including message history."""
    session = crud.get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return session

@router.delete("/sessions/{session_id}", response_model=Dict[str, str])
def delete_session(
    session_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a chat session and its associated message logs."""
    session = crud.get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    crud.delete_chat_session(db, session_id)
    return {"message": "Chat session deleted"}

@router.patch("/sessions/{session_id}", response_model=schemas.ChatSession)
def update_session(
    session_id: int,
    session_in: schemas.ChatSessionUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a chat session. Optionally links/unlinks a document."""
    session = crud.get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    if session_in.document_id is not None:
        doc = crud.get_document(db, session_in.document_id)
        if not doc or doc.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Associated document not found.")
            
    updated_session = crud.update_chat_session(db, session, session_in)
    return updated_session

@router.post("/sessions/{session_id}/stream")
async def stream_chat_response(
    session_id: int,
    message_in: schemas.ChatMessageBase,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stream message responses from Gemini AI contextually.
    Fudges contextual documents and conversation history.
    Saves final completed model response to the database.
    """
    session = crud.get_chat_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    # 1. Fetch document context if session is bound to a file
    doc_context = None
    if session.document_id:
        doc = crud.get_document(db, session.document_id)
        if doc:
            doc_context = doc.extracted_text

    # 2. Get past message history in session (format for AI service)
    history_list = []
    # Load session messages ordered chronologically
    sorted_messages = sorted(session.messages, key=lambda m: m.created_at)
    for msg in sorted_messages:
        history_list.append({
            "role": msg.role,
            "content": msg.content
        })

    # 3. Save the new user message to Database
    user_msg_in = schemas.ChatMessageCreate(
        role="user",
        content=message_in.content
    )
    crud.create_chat_message(db, user_msg_in, session_id)

    # 4. Stream response generator
    def event_stream_generator() -> Generator[str, None, None]:
        full_response = ""
        try:
            # Get generator from AI Service
            stream = ai_service.stream_chat(
                user_message=message_in.content,
                document_context=doc_context,
                history=history_list
            )
            
            for chunk in stream:
                full_response += chunk
                # Yield raw text chunk (Next.js can parse this text stream easily)
                yield chunk
        except GeneratorExit:
            # Client disconnected early, but we still want to save what was generated in finally
            pass
        except Exception as e:
            # Yield error token
            import traceback
            traceback.print_exc()
            friendly_err = "\n\n[Error: Something went wrong while generating AI content. Please try again later.]"
            err_msg = str(e).upper()
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                friendly_err = "\n\n[Error: Daily AI usage limit reached. Please try again later or configure another Gemini API key.]"
            elif "404" in err_msg or "NOT_FOUND" in err_msg or "MODEL_NOT_FOUND" in err_msg:
                friendly_err = "\n\n[Error: The selected AI model is unavailable.]"
            elif "CONNECTION" in err_msg or "FAILED TO FETCH" in err_msg or "NETWORK" in err_msg:
                friendly_err = "\n\n[Error: Unable to connect to the AI service.]"
            yield friendly_err
        finally:
            if full_response:
                with next(get_db()) as db_thread:
                    session_db = crud.get_chat_session(db_thread, session_id)
                    if session_db:
                        sorted_msgs = sorted(session_db.messages, key=lambda m: m.id)
                        # Deduplicate write
                        if not sorted_msgs or sorted_msgs[-1].role != "assistant" or sorted_msgs[-1].content != full_response:
                            ai_msg_in = schemas.ChatMessageCreate(
                                role="assistant",
                                content=full_response,
                                citations=[]
                            )
                            crud.create_chat_message(db_thread, ai_msg_in, session_id)
                            crud.log_activity(db_thread, current_user.id, "ask_ai", f"Received reply on chat: {session_db.title[:30]}")
                            
                            # Update title if it is the first exchange and title is default
                            user_msgs = [m for m in session_db.messages if m.role == "user"]
                            is_default_title = (
                                session_db.title == "New Chat Session" or 
                                session_db.title.startswith("Chat: ") or 
                                session_db.title.startswith("Chat - ") or
                                session_db.title == "Document Chat"
                            )
                            if len(user_msgs) == 1 and is_default_title:
                                try:
                                    raw_title = ai_service.generate_chat_title(
                                        user_message=message_in.content,
                                        assistant_response=full_response
                                    )
                                    unique_title = crud.make_chat_session_title_unique(
                                        db_thread, current_user.id, raw_title
                                    )
                                    session_db.title = unique_title
                                    db_thread.commit()
                                except Exception as title_err:
                                    print(f"Failed to generate auto title: {title_err}")

    return StreamingResponse(
        event_stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # Prevents Nginx buffering streams
        }
    )
