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

@router.post("/decks", response_model=schemas.FlashcardDeckDetail)
def create_deck(
    deck_in: schemas.FlashcardDeckCreate,
    generate_cards: bool = Query(False, description="Auto-generate flashcards from document context"),
    card_count: int = Query(10, ge=1, le=30),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new flashcard deck. If document_id is provided and generate_cards=True,
    invokes Gemini to parse the file and generate flashcards.
    """
    doc = None
    if deck_in.document_id:
        doc = crud.get_document(db, deck_in.document_id)
        if not doc or doc.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Associated document not found.")

    # Create empty deck first
    deck = crud.create_flashcard_deck(db, deck_in, current_user.id)
    
    # Auto-generate if requested
    if generate_cards and doc:
        if not doc.extracted_text:
            raise HTTPException(status_code=400, detail="Document text content is empty.")
            
        try:
            cards = ai_service.generate_flashcards(doc.extracted_text, count=card_count)
            for card_data in cards:
                card_create = schemas.FlashcardCreate(
                    question=card_data.get("question", "Question placeholder"),
                    answer=card_data.get("answer", "Answer placeholder"),
                    difficulty=card_data.get("difficulty", "medium"),
                    category=card_data.get("category", doc.title[:30])
                )
                crud.create_flashcard(db, card_create, deck_id=deck.id)
        except Exception as e:
            # We created the deck, but card generation failed. Log but return deck.
            print(f"Error auto-generating cards: {e}")
            
    # Refresh to load flashcards relationship
    db.refresh(deck)
    crud.log_activity(db, current_user.id, "study_flashcards", f"Created deck: {deck.name}")
    return deck

@router.get("/decks", response_model=List[schemas.FlashcardDeck])
def list_decks(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """List all flashcard decks belonging to current user."""
    return crud.get_flashcard_decks(db, current_user.id)

@router.get("/decks/{deck_id}", response_model=schemas.FlashcardDeckDetail)
def get_deck(
    deck_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a flashcard deck, including all its flashcards."""
    deck = crud.get_flashcard_deck(db, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found.")
    return deck

@router.delete("/decks/{deck_id}", response_model=Dict[str, str])
def delete_deck(
    deck_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a flashcard deck and its cards."""
    deck = crud.get_flashcard_deck(db, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found.")
        
    crud.delete_flashcard_deck(db, deck_id)
    return {"message": "Deck deleted successfully"}

@router.post("/decks/{deck_id}/generate", response_model=schemas.FlashcardDeckDetail)
def generate_cards_for_deck(
    deck_id: int,
    card_count: int = Query(10, ge=1, le=30),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Add auto-generated flashcards to an existing deck using its linked document."""
    deck = crud.get_flashcard_deck(db, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found.")
        
    if not deck.document_id:
        raise HTTPException(status_code=400, detail="This deck is not associated with any document.")
        
    doc = crud.get_document(db, deck.document_id)
    if not doc or not doc.extracted_text:
        raise HTTPException(status_code=400, detail="Document text content is empty.")
        
    try:
        cards = ai_service.generate_flashcards(doc.extracted_text, count=card_count)
        for card_data in cards:
            card_create = schemas.FlashcardCreate(
                question=card_data.get("question", "Question placeholder"),
                answer=card_data.get("answer", "Answer placeholder"),
                difficulty=card_data.get("difficulty", "medium"),
                category=card_data.get("category", doc.title[:30])
            )
            crud.create_flashcard(db, card_create, deck_id=deck.id)
            
        db.refresh(deck)
        crud.log_activity(db, current_user.id, "study_flashcards", f"Generated {len(cards)} flashcards inside deck: {deck.name}")
        return deck
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

# ==========================================
# CARD SPECIFIC ENDPOINTS
# ==========================================

@router.post("/decks/{deck_id}/cards", response_model=schemas.Flashcard)
def create_card_manually(
    deck_id: int,
    card_in: schemas.FlashcardCreate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Manually add a card to a deck."""
    deck = crud.get_flashcard_deck(db, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found.")
        
    return crud.create_flashcard(db, card_in, deck_id)

@router.post("/cards/{card_id}/review", response_model=schemas.Flashcard)
def review_card(
    card_id: int,
    review: schemas.FlashcardReview,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log review metrics for a flashcard.
    Uses rating (0-5) to calculate next review date via the SM-2 algorithm.
    """
    # Fetch card and verify owner
    card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not card or card.deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
        
    updated_card = crud.update_flashcard_review(db, card_id, review.rating)
    return updated_card

@router.delete("/cards/{card_id}", response_model=Dict[str, str])
def delete_card(
    card_id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single card."""
    card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not card or card.deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
        
    db.delete(card)
    db.commit()
    return {"message": "Card deleted successfully"}
