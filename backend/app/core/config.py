import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environmental variables from .env
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "StudyMind AI"
    API_V1_STR: str = "/api/v1"
    
    # Database URL. Fallback to sqlite if empty.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Security & JWT Tokens
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkeyreplaceinproduction1234567890!")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # Default 24 hrs
    
    # Gemini API Credentials
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # File management settings
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760")) # Default 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    class Config:
        case_sensitive = True

settings = Settings()
