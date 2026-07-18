from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ==========================================
# AUTH / USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    institution: Optional[str] = None
    course: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    institution: Optional[str] = None
    course: Optional[str] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    token: str
    new_password: str

# ==========================================
# FOLDER SCHEMAS
# ==========================================

class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FolderCreate(FolderBase):
    pass

class Folder(FolderBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# DOCUMENT SCHEMAS
# ==========================================

class DocumentBase(BaseModel):
    title: str
    file_type: str
    file_size: int
    folder_id: Optional[int] = None

class DocumentCreate(DocumentBase):
    file_path: str
    extracted_text: Optional[str] = None

class Document(DocumentBase):
    id: int
    user_id: int
    extracted_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentRename(BaseModel):
    title: str

# ==========================================
# CHAT SCHEMAS
# ==========================================

class ChatMessageBase(BaseModel):
    content: str

class ChatMessageCreate(ChatMessageBase):
    role: str
    citations: Optional[List[Dict[str, Any]]] = None

class ChatMessage(ChatMessageBase):
    id: int
    chat_session_id: int
    role: str
    citations: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    title: str
    document_id: Optional[int] = None

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    document_id: Optional[int] = None


class ChatSession(ChatSessionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionDetail(ChatSession):
    messages: List[ChatMessage] = []

    class Config:
        from_attributes = True

# ==========================================
# NOTE SCHEMAS
# ==========================================

class NoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    folder_id: Optional[int] = None
    is_pinned: Optional[bool] = False
    tags: Optional[List[str]] = []

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder_id: Optional[int] = None
    is_pinned: Optional[bool] = None
    tags: Optional[List[str]] = None

class Note(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# FLASHCARD SCHEMAS
# ==========================================

class FlashcardBase(BaseModel):
    question: str
    answer: str
    difficulty: Optional[str] = "medium"
    category: Optional[str] = None

class FlashcardCreate(FlashcardBase):
    pass

class FlashcardUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None

class Flashcard(FlashcardBase):
    id: int
    deck_id: int
    next_review: datetime
    repetitions: int
    interval: int
    ease_factor: float
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardReview(BaseModel):
    rating: int  # 0 to 5 SM-2 grading (0 = forgot, 5 = perfect recall)

class FlashcardDeckBase(BaseModel):
    name: str
    document_id: Optional[int] = None

class FlashcardDeckCreate(FlashcardDeckBase):
    pass

class FlashcardDeck(FlashcardDeckBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardDeckDetail(FlashcardDeck):
    flashcards: List[Flashcard] = []

    class Config:
        from_attributes = True

# ==========================================
# QUIZ SCHEMAS
# ==========================================

class QuizQuestionBase(BaseModel):
    question_text: str
    question_type: str  # mcq, true_false, fill_in_blanks, short_answer
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None

class QuizQuestion(QuizQuestionBase):
    id: int
    quiz_id: int

    class Config:
        from_attributes = True

class QuizBase(BaseModel):
    title: str
    document_id: Optional[int] = None

class QuizCreate(QuizBase):
    total_questions: int

class Quiz(QuizBase):
    id: int
    user_id: int
    score: Optional[float] = None
    total_questions: int
    created_at: datetime

    class Config:
        from_attributes = True

class QuizDetail(Quiz):
    questions: List[QuizQuestion] = []

    class Config:
        from_attributes = True

class QuizSubmitAnswer(BaseModel):
    question_id: int
    submitted_answer: str

class QuizSubmit(BaseModel):
    answers: List[QuizSubmitAnswer]

class QuizFeedbackQuestion(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    correct_answer: str
    submitted_answer: str
    is_correct: bool
    explanation: Optional[str] = None

class QuizResultResponse(BaseModel):
    score: float
    total_questions: int
    feedback: List[QuizFeedbackQuestion]

# ==========================================
# MIND MAP SCHEMAS
# ==========================================

class MindMapBase(BaseModel):
    title: str
    document_id: Optional[int] = None

class MindMapCreate(MindMapBase):
    structure: Dict[str, Any]  # Hierarchy of mind map nodes

class MindMap(MindMapBase):
    id: int
    user_id: int
    structure: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# HISTORY & ANALYTICS SCHEMAS
# ==========================================

class StudyHistory(BaseModel):
    id: int
    user_id: int
    activity_type: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_files: int
    total_chats: int
    total_flashcards: int
    total_quizzes: int
    study_time_hours: float
    average_quiz_score: float
    recent_activities: List[StudyHistory]
    file_type_distribution: Dict[str, int]
    daily_activity_counts: Dict[str, int] # e.g. {"2026-07-10": 5}
    total_decks: int
    total_mindmaps: int
    total_summaries: int
    total_notes: int
    total_quizzes_completed: int
