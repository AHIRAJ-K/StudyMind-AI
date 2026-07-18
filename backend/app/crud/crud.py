from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from app.models import models
from app.schemas import schemas
from app.core.security import get_password_hash

# ==========================================
# USER CRUD
# ==========================================

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        institution=user.institution,
        course=user.course
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: models.User, user_in: schemas.UserUpdate) -> models.User:
    if user_in.full_name is not None:
        db_user.full_name = user_in.full_name
    if user_in.institution is not None:
        db_user.institution = user_in.institution
    if user_in.course is not None:
        db_user.course = user_in.course
    if user_in.password is not None:
        db_user.hashed_password = get_password_hash(user_in.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False

# ==========================================
# FOLDER CRUD
# ==========================================

def get_folders(db: Session, user_id: int) -> List[models.Folder]:
    return db.query(models.Folder).filter(models.Folder.user_id == user_id).all()

def create_folder(db: Session, folder: schemas.FolderCreate, user_id: int) -> models.Folder:
    db_folder = models.Folder(
        name=folder.name,
        parent_id=folder.parent_id,
        user_id=user_id
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def delete_folder(db: Session, folder_id: int) -> bool:
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if db_folder:
        db.delete(db_folder)
        db.commit()
        return True
    return False

# ==========================================
# DOCUMENT CRUD
# ==========================================

def get_document(db: Session, doc_id: int) -> Optional[models.Document]:
    return db.query(models.Document).filter(models.Document.id == doc_id).first()

def get_documents(db: Session, user_id: int, folder_id: Optional[int] = None) -> List[models.Document]:
    query = db.query(models.Document).filter(models.Document.user_id == user_id)
    if folder_id is not None:
        query = query.filter(models.Document.folder_id == folder_id)
    return query.all()

def create_document(db: Session, doc: schemas.DocumentCreate, user_id: int) -> models.Document:
    db_doc = models.Document(
        title=doc.title,
        file_type=doc.file_type,
        file_path=doc.file_path,
        file_size=doc.file_size,
        extracted_text=doc.extracted_text,
        folder_id=doc.folder_id,
        user_id=user_id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

def update_document_text(db: Session, doc_id: int, extracted_text: str) -> Optional[models.Document]:
    db_doc = get_document(db, doc_id)
    if db_doc:
        db_doc.extracted_text = extracted_text
        db.commit()
        db.refresh(db_doc)
    return db_doc

def rename_document(db: Session, doc_id: int, title: str) -> Optional[models.Document]:
    db_doc = get_document(db, doc_id)
    if db_doc:
        db_doc.title = title
        db.commit()
        db.refresh(db_doc)
    return db_doc

def delete_document(db: Session, doc_id: int) -> bool:
    db_doc = get_document(db, doc_id)
    if db_doc:
        db.delete(db_doc)
        db.commit()
        return True
    return False

# ==========================================
# CHAT CRUD
# ==========================================

def get_chat_sessions(db: Session, user_id: int) -> List[models.ChatSession]:
    return db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).order_by(models.ChatSession.created_at.desc()).all()

def get_chat_session(db: Session, session_id: int) -> Optional[models.ChatSession]:
    return db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()

def create_chat_session(db: Session, session: schemas.ChatSessionCreate, user_id: int) -> models.ChatSession:
    db_session = models.ChatSession(
        title=session.title,
        document_id=session.document_id,
        user_id=user_id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def make_chat_session_title_unique(db: Session, user_id: int, base_title: str) -> str:
    # Check if this title is already used by this user
    title = base_title
    counter = 2
    while db.query(models.ChatSession).filter(
        models.ChatSession.user_id == user_id,
        models.ChatSession.title == title
    ).first() is not None:
        title = f"{base_title} ({counter})"
        counter += 1
    return title

def create_chat_message(db: Session, message: schemas.ChatMessageCreate, session_id: int) -> models.ChatMessage:
    db_message = models.ChatMessage(
        chat_session_id=session_id,
        role=message.role,
        content=message.content,
        citations=message.citations
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def update_chat_session(db: Session, db_session: models.ChatSession, session_in: schemas.ChatSessionUpdate) -> models.ChatSession:
    update_data = session_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_session, field, value)
    db.commit()
    db.refresh(db_session)
    return db_session

def delete_chat_session(db: Session, session_id: int) -> bool:
    db_session = get_chat_session(db, session_id)
    if db_session:
        db.delete(db_session)
        db.commit()
        return True
    return False

# ==========================================
# FLASHCARD CRUD
# ==========================================

def get_flashcard_decks(db: Session, user_id: int) -> List[models.FlashcardDeck]:
    return db.query(models.FlashcardDeck).filter(models.FlashcardDeck.user_id == user_id).all()

def get_flashcard_deck(db: Session, deck_id: int) -> Optional[models.FlashcardDeck]:
    return db.query(models.FlashcardDeck).filter(models.FlashcardDeck.id == deck_id).first()

def create_flashcard_deck(db: Session, deck: schemas.FlashcardDeckCreate, user_id: int) -> models.FlashcardDeck:
    db_deck = models.FlashcardDeck(
        name=deck.name,
        document_id=deck.document_id,
        user_id=user_id
    )
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck

def create_flashcard(db: Session, card: schemas.FlashcardCreate, deck_id: int) -> models.Flashcard:
    db_card = models.Flashcard(
        deck_id=deck_id,
        question=card.question,
        answer=card.answer,
        difficulty=card.difficulty,
        category=card.category
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

def update_flashcard_review(db: Session, card_id: int, rating: int) -> Optional[models.Flashcard]:
    """
    Update flashcard review intervals using the SM-2 Spaced Repetition Algorithm.
    rating: 0 (forgot completely) to 5 (perfect recall)
    """
    db_card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not db_card:
        return None

    # Implement SM-2 algorithm
    if rating >= 3:
        if db_card.repetitions == 0:
            db_card.interval = 1
        elif db_card.repetitions == 1:
            db_card.interval = 6
        else:
            db_card.interval = int(round(db_card.interval * db_card.ease_factor))
        db_card.repetitions += 1
    else:
        db_card.repetitions = 0
        db_card.interval = 1

    # Update ease factor formula
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    q = rating
    db_card.ease_factor = db_card.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if db_card.ease_factor < 1.3:
        db_card.ease_factor = 1.3

    # Set next review time
    db_card.next_review = datetime.utcnow() + timedelta(days=db_card.interval)
    
    db.commit()
    db.refresh(db_card)
    return db_card

def delete_flashcard_deck(db: Session, deck_id: int) -> bool:
    db_deck = get_flashcard_deck(db, deck_id)
    if db_deck:
        db.delete(db_deck)
        db.commit()
        return True
    return False

# ==========================================
# QUIZ CRUD
# ==========================================

def get_quizzes(db: Session, user_id: int) -> List[models.Quiz]:
    return db.query(models.Quiz).filter(models.Quiz.user_id == user_id).all()

def get_quiz(db: Session, quiz_id: int) -> Optional[models.Quiz]:
    return db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()

def create_quiz(db: Session, quiz: schemas.QuizCreate, user_id: int) -> models.Quiz:
    db_quiz = models.Quiz(
        title=quiz.title,
        document_id=quiz.document_id,
        total_questions=quiz.total_questions,
        user_id=user_id
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

def create_quiz_question(db: Session, question: schemas.QuizQuestionBase, quiz_id: int) -> models.QuizQuestion:
    db_question = models.QuizQuestion(
        quiz_id=quiz_id,
        question_text=question.question_text,
        question_type=question.question_type,
        options=question.options,
        correct_answer=question.correct_answer,
        explanation=question.explanation
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def submit_quiz_score(db: Session, quiz_id: int, score: float) -> Optional[models.Quiz]:
    db_quiz = get_quiz(db, quiz_id)
    if db_quiz:
        db_quiz.score = score
        db.commit()
        db.refresh(db_quiz)
    return db_quiz

def delete_quiz(db: Session, quiz_id: int) -> bool:
    db_quiz = get_quiz(db, quiz_id)
    if db_quiz:
        db.delete(db_quiz)
        db.commit()
        return True
    return False

# ==========================================
# MIND MAP CRUD
# ==========================================

def get_mindmaps(db: Session, user_id: int) -> List[models.MindMap]:
    return db.query(models.MindMap).filter(models.MindMap.user_id == user_id).all()

def get_mindmap(db: Session, map_id: int) -> Optional[models.MindMap]:
    return db.query(models.MindMap).filter(models.MindMap.id == map_id).first()

def create_mindmap(db: Session, mindmap: schemas.MindMapCreate, user_id: int) -> models.MindMap:
    db_map = models.MindMap(
        title=mindmap.title,
        document_id=mindmap.document_id,
        structure=mindmap.structure,
        user_id=user_id
    )
    db.add(db_map)
    db.commit()
    db.refresh(db_map)
    return db_map

def delete_mindmap(db: Session, map_id: int) -> bool:
    db_map = get_mindmap(db, map_id)
    if db_map:
        db.delete(db_map)
        db.commit()
        return True
    return False

# ==========================================
# NOTES CRUD
# ==========================================

def get_notes(db: Session, user_id: int) -> List[models.Note]:
    return db.query(models.Note).filter(models.Note.user_id == user_id).order_by(models.Note.is_pinned.desc(), models.Note.updated_at.desc()).all()

def get_note(db: Session, note_id: int) -> Optional[models.Note]:
    return db.query(models.Note).filter(models.Note.id == note_id).first()

def create_note(db: Session, note: schemas.NoteCreate, user_id: int) -> models.Note:
    db_note = models.Note(
        title=note.title,
        content=note.content,
        folder_id=note.folder_id,
        is_pinned=note.is_pinned,
        tags=note.tags,
        user_id=user_id
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

def update_note(db: Session, db_note: models.Note, note_in: schemas.NoteUpdate) -> models.Note:
    if note_in.title is not None:
        db_note.title = note_in.title
    if note_in.content is not None:
        db_note.content = note_in.content
    if note_in.folder_id is not None:
        db_note.folder_id = note_in.folder_id if note_in.folder_id != -1 else None
    if note_in.is_pinned is not None:
        db_note.is_pinned = note_in.is_pinned
    if note_in.tags is not None:
        db_note.tags = note_in.tags
    
    db_note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: int) -> bool:
    db_note = get_note(db, note_id)
    if db_note:
        db.delete(db_note)
        db.commit()
        return True
    return False

# ==========================================
# BOOKMARKS CRUD
# ==========================================

def get_bookmarks(db: Session, user_id: int) -> List[models.Bookmark]:
    return db.query(models.Bookmark).filter(models.Bookmark.user_id == user_id).all()

def add_bookmark(db: Session, user_id: int, item_type: str, item_id: int) -> models.Bookmark:
    # Check if exists
    existing = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == user_id,
        models.Bookmark.item_type == item_type,
        models.Bookmark.item_id == item_id
    ).first()
    if existing:
        return existing
        
    db_bookmark = models.Bookmark(
        user_id=user_id,
        item_type=item_type,
        item_id=item_id
    )
    db.add(db_bookmark)
    db.commit()
    db.refresh(db_bookmark)
    return db_bookmark

def remove_bookmark(db: Session, user_id: int, item_type: str, item_id: int) -> bool:
    db_bookmark = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == user_id,
        models.Bookmark.item_type == item_type,
        models.Bookmark.item_id == item_id
    ).first()
    if db_bookmark:
        db.delete(db_bookmark)
        db.commit()
        return True
    return False

# ==========================================
# HISTORY CRUD
# ==========================================

def log_activity(db: Session, user_id: int, activity_type: str, description: str) -> models.StudyHistory:
    db_hist = models.StudyHistory(
        user_id=user_id,
        activity_type=activity_type,
        description=description
    )
    db.add(db_hist)
    db.commit()
    db.refresh(db_hist)
    return db_hist

def get_activity_logs(db: Session, user_id: int, limit: int = 10) -> List[models.StudyHistory]:
    return db.query(models.StudyHistory).filter(models.StudyHistory.user_id == user_id).order_by(models.StudyHistory.created_at.desc()).limit(limit).all()

# ==========================================
# DASHBOARD / STATISTICS CRUD
# ==========================================

def get_dashboard_stats(db: Session, user_id: int) -> Dict[str, Any]:
    # Query counts
    total_files = db.query(models.Document).filter(models.Document.user_id == user_id).count()
    total_chats = db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).count()
    
    # Flashcard count
    total_flashcards = db.query(models.Flashcard).join(models.FlashcardDeck).filter(models.FlashcardDeck.user_id == user_id).count()
    
    # Quiz stats
    quiz_query = db.query(models.Quiz).filter(models.Quiz.user_id == user_id)
    total_quizzes = quiz_query.count()
    total_quizzes_completed = db.query(models.Quiz).filter(models.Quiz.user_id == user_id, models.Quiz.score.isnot(None)).count()
    avg_score_res = db.query(func.avg(models.Quiz.score)).filter(models.Quiz.user_id == user_id, models.Quiz.score.isnot(None)).scalar()
    avg_score = float(avg_score_res) if avg_score_res is not None else 0.0
    
    # Decks, Mindmaps, Notes, Summaries
    total_decks = db.query(models.FlashcardDeck).filter(models.FlashcardDeck.user_id == user_id).count()
    total_mindmaps = db.query(models.MindMap).filter(models.MindMap.user_id == user_id).count()
    
    user_notes = db.query(models.Note).filter(models.Note.user_id == user_id).all()
    total_notes = len(user_notes)
    total_summaries = sum(1 for n in user_notes if n.tags and "summary" in n.tags)
    
    # Study time estimation (fictional mock heuristic based on activities, e.g. 0.2 hrs per quiz/chat message)
    total_activities = db.query(models.StudyHistory).filter(models.StudyHistory.user_id == user_id).count()
    study_time = round(max(0.5, total_activities * 0.15), 1)

    # Activity log
    recent_activities = get_activity_logs(db, user_id, limit=8)

    # File type distribution
    file_types = db.query(models.Document.file_type, func.count(models.Document.id)).filter(models.Document.user_id == user_id).group_by(models.Document.file_type).all()
    file_dist = {str(ftype).lower(): count for ftype, count in file_types}

    # Daily activity count for graphs (past 7 days)
    today = datetime.utcnow().date()
    daily_counts = {}
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        # Query logs on this day
        start_datetime = datetime.combine(day, datetime.min.time())
        end_datetime = datetime.combine(day, datetime.max.time())
        count = db.query(models.StudyHistory).filter(
            models.StudyHistory.user_id == user_id,
            models.StudyHistory.created_at >= start_datetime,
            models.StudyHistory.created_at <= end_datetime
        ).count()
        daily_counts[day_str] = count

    return {
        "total_files": total_files,
        "total_chats": total_chats,
        "total_flashcards": total_flashcards,
        "total_quizzes": total_quizzes,
        "study_time_hours": study_time,
        "average_quiz_score": avg_score,
        "recent_activities": recent_activities,
        "file_type_distribution": file_dist,
        "daily_activity_counts": daily_counts,
        "total_decks": total_decks,
        "total_mindmaps": total_mindmaps,
        "total_summaries": total_summaries,
        "total_notes": total_notes,
        "total_quizzes_completed": total_quizzes_completed
    }
