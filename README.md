# StudyMind AI 🧠 - AI-Powered Learning Companion
### IBM SkillsBuild AI Internship Project

StudyMind AI is a production-quality, premium AI-powered study platform designed to help students, teachers, and researchers organize their learning materials and utilize Google Gemini AI to summarize, explain, quiz, flashcard, and map their subjects.

---

## 🌟 Key Features

* **Library Manager**: Drag-and-drop document upload (PDF, DOCX, TXT, Images) with automatic text extraction.
* **AI Multimodal OCR**: Image uploads automatically run high-fidelity text extraction via Gemini 1.5 Flash multimodal vision.
* **Contextual AI Chat**: Converse with documents using Gemini 1.5 Pro, featuring conversation memory and specific citations.
* **AI Summarization**: Options for short, detailed, bulleted takeaways, chapter, exam prep summaries, or a single-line gist.
* **Relational Spaced Repetition**: Flashcard decks are automatically built from documents, utilizing the **SM-2 Spaced Repetition Algorithm** (Anki/Quizlet style) to schedule recall reviews.
* **Interactive Quizzes**: Auto-generate MCQs, true/false, fill-in-the-blanks, and short answers with backend scoring and detailed AI explanations.
* **SVG Mind Mapping**: Extract hierarchical concept trees from files and view them dynamically inside a clean SVG layout.
* **Autosaving Notes**: Notion-like Markdown note editor featuring real-time debounced autosave.
* **Relational Statistics**: Timeline activity charts, file distribution logs, and study averages visualizer.
* **Dark Mode & Responsive design**: Complete light and dark themes built with Poppins/Inter typography.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Lucide React icons, Canvas Confetti.
* **Backend**: FastAPI (Python), SQLAlchemy ORM, Pydantic, PyPDF, python-docx.
* **Database**: PostgreSQL (Production) / SQLite (Fallback for out-of-the-box local development).
* **AI Engines**: Google Gemini 1.5 Flash (for vision, summary, generation) & Gemini 1.5 Pro (for streaming document chat).
* **Containerization**: Docker & Docker Compose.
* **Reverse Proxy**: Nginx (configured for Server-Sent Events/SSE streaming buffering bypass).

---

## 🔌 Environment Variables

Create a `.env` file in the `/backend` directory:

```env
# Database (leave blank to auto-fallback to local SQLite)
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/studymind

# Security & JWT
JWT_SECRET=supersecretkeyreplaceinproduction1234567890!
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Keys
GEMINI_API_KEY=your_google_gemini_api_key

# File Settings
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=uploads
```

---

## 🚀 Quickstart Guide (Local Development)

### 1. Run the Backend
Ensure you have Python 3.11+ installed.
```bash
cd backend
python -m venv venv
venv\Scripts\activate # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*Note: SQLite database (`studymind.db`) will automatically initialize on startup if no PostgreSQL connection is provided.*

### 2. Run the Frontend
Ensure you have Node.js 20+ installed.
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Deployment

To launch the entire stack (PostgreSQL, Backend API, Frontend standalone, and Nginx proxy):
```bash
docker-compose up --build
```
The application will be accessible at `http://localhost`.
* **Frontend client**: `http://localhost/`
* **FastAPI Backend Swagger**: `http://localhost/docs`

---

## 📝 Prompt Engineering 블루프린트

StudyMind AI leverages specialized structured prompts with `response_mime_type="application/json"` configurations to ensure stable type casting:

### 1. Flashcard Generator Prompt
```
You are an expert educational designer. Analyze the following text and generate exactly {count} high-quality flashcards.
Each flashcard must contain:
1. "question": A clear, concise question testing a single concept.
2. "answer": The exact, direct answer to the question.
3. "difficulty": A rating of "easy", "medium", or "hard".
4. "category": The specific subtopic or category the question belongs to.
Generate the response as a single, valid JSON array.
```

### 2. Quiz Generator Prompt
```
You are an expert educator. Analyze the following text and create exactly {count} quiz questions.
Mix the question types between MCQ, True/False, Fill-in-the-blanks, and Short Answer.
Each question must be a JSON object with: question_text, question_type, options (array of 4 for MCQs), correct_answer, and explanation.
```
