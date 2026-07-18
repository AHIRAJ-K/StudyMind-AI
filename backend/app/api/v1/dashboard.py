from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.api import deps
from app.models import models
from app.schemas import schemas
from app.crud import crud

router = APIRouter()

@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_statistics(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch comprehensive dashboard statistics for user, including activity history,
    completed counts, average grades, and timeline details.
    """
    return crud.get_dashboard_stats(db, current_user.id)
