from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, documents, chats, flashcards, quizzes, notes, mindmaps, dashboard

# Automatically create database tables on startup (especially helpful for sqlite)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend services for StudyMind AI - an AI Study Workspace",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Next.js frontend communication
# Allow localhost:3000, 127.0.0.1:3000, and general docker network hosts
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://localhost:80"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["Library Documents"])
app.include_router(chats.router, prefix=f"{settings.API_V1_STR}/chats", tags=["AI Chat Assistant"])
app.include_router(flashcards.router, prefix=f"{settings.API_V1_STR}/flashcards", tags=["Flashcards Generator"])
app.include_router(quizzes.router, prefix=f"{settings.API_V1_STR}/quizzes", tags=["Quizzes Generator"])
app.include_router(notes.router, prefix=f"{settings.API_V1_STR}/notes", tags=["Markdown Study Notes"])
app.include_router(mindmaps.router, prefix=f"{settings.API_V1_STR}/mindmaps", tags=["Mind Maps"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard Statistics"])

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "message": "StudyMind AI API is fully operational."
    }
