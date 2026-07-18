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

@router.post("", response_model=schemas.QuizDetail)
def create_quiz_endpoint(
    quiz_in: schemas.QuizCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a quiz. If document_id is provided, automatically uses Gemini to read
    the document text and generate quiz questions (MCQs, true/false, fill in blanks).
    """
    if not quiz_in.document_id:
        raise HTTPException(
            status_code=400,
            detail="A document_id must be provided to generate a quiz."
        )
        
    doc = crud.get_document(db, quiz_in.document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Associated document not found.")
        
    if not doc.extracted_text:
        raise HTTPException(status_code=400, detail="Document text content is empty.")
        
    # 1. Create Quiz database record
    quiz = crud.create_quiz(db, quiz_in, current_user.id)
    
    # 2. Call Gemini to generate structured questions
    try:
        generated_questions = ai_service.generate_quiz(
            doc.extracted_text, 
            count=quiz_in.total_questions
        )
        
        for q_data in generated_questions:
            q_create = schemas.QuizQuestionBase(
                question_text=q_data.get("question_text", "Question text placeholder"),
                question_type=q_data.get("question_type", "mcq"),
                options=q_data.get("options", None),
                correct_answer=str(q_data.get("correct_answer", "")),
                explanation=q_data.get("explanation", "")
            )
            crud.create_quiz_question(db, q_create, quiz_id=quiz.id)
            
    except Exception as e:
        # If question generation fails, clean up the empty quiz
        crud.delete_quiz(db, quiz.id)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz questions via AI: {str(e)}"
        )
        
    # Refresh quiz session to pull list of generated questions
    db.refresh(quiz)
    crud.log_activity(db, current_user.id, "take_quiz", f"Generated quiz: {quiz.title}")
    return quiz

@router.get("", response_model=List[schemas.Quiz])
def list_quizzes(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all quizzes created by current user."""
    return crud.get_quizzes(db, current_user.id)

@router.get("/{quiz_id}", response_model=schemas.QuizDetail)
def get_quiz(
    quiz_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve quiz details including all question prompts."""
    quiz = crud.get_quiz(db, quiz_id)
    if not quiz or quiz.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return quiz

@router.post("/{quiz_id}/submit", response_model=schemas.QuizResultResponse)
def submit_quiz(
    quiz_id: int,
    submission: schemas.QuizSubmit,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit and grade quiz answers.
    Updates the final score in the database and returns questions with detailed answers, feedback, and explanations.
    """
    quiz = crud.get_quiz(db, quiz_id)
    if not quiz or quiz.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Quiz not found.")
        
    # Map questions by ID for fast lookup
    questions_map = {q.id: q for q in quiz.questions}
    
    correct_count = 0
    feedback_list = []
    
    # Process submitted answers
    for ans in submission.answers:
        q_id = ans.question_id
        sub_ans = ans.submitted_answer.strip()
        
        if q_id not in questions_map:
            raise HTTPException(status_code=400, detail=f"Question ID {q_id} does not belong to this quiz.")
            
        q = questions_map[q_id]
        
        # Determine correctness (case-insensitive strip matching)
        is_correct = False
        corr_ans = q.correct_answer.strip()
        
        if q.question_type in ["mcq", "true_false"]:
            is_correct = sub_ans.lower() == corr_ans.lower()
        elif q.question_type == "fill_in_blanks":
            # flexible comparison
            is_correct = sub_ans.lower() in corr_ans.lower() or corr_ans.lower() in sub_ans.lower()
        else: # short_answer
            # Short answers are conceptual, give credit if answers aren't blank
            is_correct = len(sub_ans) > 2
            
        if is_correct:
            correct_count += 1
            
        feedback_list.append(
            schemas.QuizFeedbackQuestion(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                correct_answer=q.correct_answer,
                submitted_answer=ans.submitted_answer,
                is_correct=is_correct,
                explanation=q.explanation
            )
        )
        
    # Calculate score
    score = round((correct_count / len(quiz.questions)) * 100, 1) if quiz.questions else 0.0
    
    # Update quiz score in DB
    crud.submit_quiz_score(db, quiz_id, score)
    crud.log_activity(db, current_user.id, "take_quiz", f"Completed quiz '{quiz.title}' with score {score}%")
    
    return schemas.QuizResultResponse(
        score=score,
        total_questions=len(quiz.questions),
        feedback=feedback_list
    )

@router.delete("/{quiz_id}", response_model=Dict[str, str])
def delete_quiz(
    quiz_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a quiz and its questions."""
    quiz = crud.get_quiz(db, quiz_id)
    if not quiz or quiz.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Quiz not found.")
        
    crud.delete_quiz(db, quiz_id)
    return {"message": "Quiz deleted successfully"}
