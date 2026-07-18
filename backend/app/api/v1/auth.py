from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Dict

from app.core.database import get_db
from app.core.config import settings
from app.core import security
from app.crud import crud
from app.schemas import schemas
from app.api import deps
from app.models import models

router = APIRouter()

@router.post("/signup", response_model=schemas.User)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account."""
    db_user = crud.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists in the system."
        )
    user = crud.create_user(db, user_in)
    # Log study history
    crud.log_activity(db, user.id, "signup", f"Account created for {user.email}")
    return user

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Standard OAuth2 compatible token login, accepts form-urlencoded data.
    """
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.email, expires_delta=access_token_expires
    )
    crud.log_activity(db, user.id, "login", "Logged in via credentials")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login/json", response_model=schemas.Token)
def login_json(
    credentials: schemas.UserCreate, # reuse signup schema format for json credentials
    db: Session = Depends(get_db)
):
    """
    JSON credentials login endpoint, accepts JSON request body.
    """
    user = crud.get_user_by_email(db, email=credentials.email)
    if not user or not security.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.email, expires_delta=access_token_expires
    )
    crud.log_activity(db, user.id, "login", "Logged in via JSON request")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.User)
def read_user_me(current_user: models.User = Depends(deps.get_current_user)):
    """Fetch the profile of the currently logged-in user."""
    return current_user

@router.put("/me", response_model=schemas.User)
def update_user_me(
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile settings for the currently logged-in user."""
    user = crud.update_user(db, db_user=current_user, user_in=user_in)
    crud.log_activity(db, user.id, "edit_profile", "Updated user profile settings")
    return user

@router.delete("/me", response_model=Dict[str, str])
def delete_user_me(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete user account."""
    user_id = current_user.id
    crud.delete_user(db, user_id)
    return {"message": "Account successfully deleted"}

@router.post("/forgot-password", response_model=Dict[str, str])
def forgot_password(
    form: schemas.ForgotPassword,
    db: Session = Depends(get_db)
):
    """Mock forgot password endpoint."""
    user = crud.get_user_by_email(db, email=form.email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account associated with this email address."
        )
    # In production, send reset email here.
    return {"message": "If this email is registered, a password reset token has been sent."}

@router.post("/reset-password", response_model=Dict[str, str])
def reset_password(
    form: schemas.ResetPassword,
    db: Session = Depends(get_db)
):
    """Mock reset password endpoint."""
    user = crud.get_user_by_email(db, email=form.email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    # Verification of token should go here.
    user.hashed_password = security.get_password_hash(form.new_password)
    db.commit()
    crud.log_activity(db, user.id, "reset_password", "Password was reset")
    return {"message": "Password successfully updated. You may now log in."}
