import json
from typing import Generator, List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings

# Initialize genai client when requested
def _get_client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in settings.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_summary(text: str, summary_type: str) -> str:
    """
    Generate different styles of summaries from document text.
    Types: short, detailed, bullet, chapter, exam, one-line.
    """
    client = _get_client()
    
    prompts = {
        "short": "Provide a brief summary of the following text in one cohesive paragraph (around 100-150 words):",
        "detailed": "Provide a detailed, comprehensive summary of the following text, breaking down all major themes, arguments, and key figures or items:",
        "bullet": "Provide a bullet-point summary highlighting the key takeaways and core concepts of the following text:",
        "chapter": "Provide an organized, chapter-by-chapter or section-by-section summary of the following text:",
        "exam": "Provide an exam-prep summary of the following text, listing core formulas, definitions, key terms, and critical concepts that a student must memorize:",
        "one-line": "Summarize the following text in a single, powerful, and easy-to-understand sentence:"
    }
    
    prompt_prefix = prompts.get(summary_type.lower(), prompts["short"])
    
    # Cap text length to avoid token issues in simple summaries
    capped_text = text[:60000]
    
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=f"{prompt_prefix}\n\n[TEXT CONTENT START]\n{capped_text}\n[TEXT CONTENT END]\n"
    )
    return response.text

def generate_explanation(text: str, difficulty: str) -> str:
    """
    Generate explanations of concepts.
    Difficulty: beginner, intermediate, advanced, ELI5 (Explain Like I'm 10).
    """
    client = _get_client()
    
    prompts = {
        "eli5": "Explain the following text or concept like I am a 10-year old child. Use fun analogies, simple vocabulary, and engaging examples:",
        "beginner": "Provide a beginner-friendly explanation of the following text or concept. Avoid complex jargon, define terms clearly, and offer illustrative examples:",
        "intermediate": "Provide an intermediate explanation of the following text or concept. Assume standard college/high-school baseline knowledge, and dive deeper into mechanics and context:",
        "advanced": "Provide an advanced, academic, or professional-grade explanation of the following text or concept. Dive deep into technical details, methodologies, nuances, and theoretical implications:"
    }
    
    prompt_prefix = prompts.get(difficulty.lower(), prompts["beginner"])
    
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=f"{prompt_prefix}\n\n[CONCEPT/TEXT]:\n{text}\n"
    )
    return response.text

def generate_flashcards(text: str, count: int = 10) -> List[Dict[str, Any]]:
    """
    Automatically generate flashcards from document text.
    Enforces a strict JSON array response structure.
    """
    client = _get_client()
    
    prompt = f"""
    You are an expert educational designer. Analyze the following text and generate exactly {count} high-quality flashcards.
    Each flashcard must contain:
    1. "question": A clear, concise question testing a single concept.
    2. "answer": The exact, direct answer to the question.
    3. "difficulty": A rating of "easy", "medium", or "hard".
    4. "category": The specific subtopic or category the question belongs to.

    Generate the response as a single, valid JSON array. Do not include markdown code fence wrappers or outer formatting outside of valid JSON.
    Example output format:
    [
      {{"question": "What is the powerhouse of the cell?", "answer": "Mitochondria", "difficulty": "easy", "category": "Biology"}}
    ]

    [TEXT CONTENT]:
    {text[:40000]}
    """
    
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    try:
        cards = json.loads(response.text)
        if isinstance(cards, list):
            return cards
        elif isinstance(cards, dict) and "flashcards" in cards:
            return cards["flashcards"]
        return []
    except Exception as e:
        # Fallback parsing in case of irregularities
        import re
        match = re.search(r"\[\s*\{.*\}\s*\]", response.text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except:
                pass
        raise RuntimeError(f"Failed to generate structured flashcards: {str(e)}. Response was: {response.text}")

def generate_quiz(text: str, count: int = 5) -> List[Dict[str, Any]]:
    """
    Automatically generate a quiz from document text.
    Contains MCQs, True/False, Fill in the blanks, and Short answers.
    Enforces a strict JSON array response structure.
    """
    client = _get_client()
    
    prompt = f"""
    You are an expert educator. Analyze the following text and create exactly {count} quiz questions.
    Mix the question types between:
    - "mcq" (Multiple Choice Question, must have 4 options and a correct_answer index or text)
    - "true_false" (True or False question)
    - "fill_in_blanks" (Fill in the blanks)
    - "short_answer" (Conceptual question requiring a direct 1-2 sentence answer)

    Each question must be a JSON object with:
    1. "question_text": The question string.
    2. "question_type": One of "mcq", "true_false", "fill_in_blanks", "short_answer".
    3. "options": (Required for "mcq", otherwise null) Array of 4 string options.
    4. "correct_answer": The correct answer (e.g. for mcq, the matching option string; for true_false, "True" or "False").
    5. "explanation": Explaining why the answer is correct and the reasoning.

    Output format MUST be a single valid JSON array.

    [TEXT CONTENT]:
    {text[:40000]}
    """
    
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    try:
        questions = json.loads(response.text)
        if isinstance(questions, list):
            return questions
        elif isinstance(questions, dict) and "questions" in questions:
            return questions["questions"]
        return []
    except Exception as e:
        raise RuntimeError(f"Failed to generate structured quiz: {str(e)}. Response was: {response.text}")

def generate_mind_map(text: str) -> Dict[str, Any]:
    """
    Generate a structured hierarchical JSON representing a mind map of topics and subtopics.
    """
    client = _get_client()
    
    prompt = """
    You are an expert cognitive psychologist. Analyze the following text and extract its core conceptual hierarchy to generate a mind map.
    The output must be a single JSON object representing the root node, which has subtopics, which in turn have concepts and subconcepts.
    
    Each node in the tree must have:
    - "name": The short, concise label of the topic/concept.
    - "children": List of child node objects (or empty list if no children).
    
    Create a deep hierarchy (at least 3 levels deep if possible, i.e., Root -> Main Topics -> Subtopics -> Concepts).
    Output MUST be valid JSON.
    
    Example format:
    {
      "name": "Cellular Biology",
      "children": [
        {
          "name": "Cell Structures",
          "children": [
            {"name": "Nucleus", "children": []},
            {"name": "Mitochondria", "children": []}
          ]
        }
      ]
    }
    
    [TEXT CONTENT]:
    """
    
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=f"{prompt}\n\n{text[:40000]}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    try:
        return json.loads(response.text)
    except Exception as e:
        # Fallback root structure if JSON fails
        return {
            "name": "Study Material",
            "children": [
                {"name": "Summary Details", "children": []},
                {"name": "Error Parsing Map", "children": []}
            ]
        }

def stream_chat(
    user_message: str,
    document_context: Optional[str],
    history: List[Dict[str, str]]
) -> Generator[str, None, None]:
    """
    Stream responses from Gemini.
    Incorporates document context and conversation history to make the model context-aware.
    """
    client = _get_client()
    
    if document_context:
        system_instruction = (
            "You are StudyMind AI, a grounded, helpful, and reliable study assistant. "
            "Answer primarily using the uploaded document context. "
            "If the answer exists inside the document, prioritize it and mention page/section if available. "
            "Only use general knowledge when the document does not contain the answer. "
            "Format your output in clean Markdown. You can use LaTeX math syntax (e.g., $E=mc^2$ or $$f(x)=x^2$$) for mathematical equations. "
            "Use clean headings, tables, list items, and bold terms for readability."
        )
    else:
        system_instruction = (
            "You are StudyMind AI, a helpful, advanced, and reliable study assistant. "
            "Your task is to answer user queries using your general knowledge. "
            "Format your output in clean Markdown. You can use LaTeX math syntax (e.g., $E=mc^2$ or $$f(x)=x^2$$) for mathematical equations. "
            "Use clean headings, tables, list items, and bold terms for readability."
        )
    
    # Structure contents for Gemini chat using typed Content and Part objects
    contents = []
    
    # 1. Provide Document Context
    if document_context:
        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=f"Here is the context document you should reference to answer queries:\n\n[DOCUMENT CONTENT START]\n{document_context[:50000]}\n[DOCUMENT CONTENT END]\n\nPlease acknowledge receipt of this context."
                    )
                ]
            )
        )
        contents.append(
            types.Content(
                role="model",
                parts=[
                    types.Part.from_text(
                        text="I have received the document context and will use it to answer your subsequent questions. I will cite the document wherever applicable."
                    )
                ]
            )
        )
        
    # 2. Append Chat History
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[
                    types.Part.from_text(text=msg["content"])
                ]
            )
        )
        
    # 3. Append current user message
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=user_message)
            ]
        )
    )
    
    try:
        response_stream = client.models.generate_content_stream(
            model="gemini-flash-latest",
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.3,
                system_instruction=system_instruction,
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT",
                        threshold="BLOCK_MEDIUM_AND_ABOVE",
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH",
                        threshold="BLOCK_MEDIUM_AND_ABOVE",
                    ),
                ]
            )
        )
        for chunk in response_stream:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        # Fallback if stream fails
        yield f"Error generating streaming chat response: {str(e)}"

def generate_chat_title(user_message: str, assistant_response: str) -> str:
    """
    Generate a short descriptive title (maximum 4-8 words) for a chat session.
    """
    client = _get_client()
    prompt = (
        "Generate a short, highly descriptive title (maximum 4 to 8 words) for a chat session based on the following exchange. "
        "Return ONLY the plain title text without quotes, markdown, punctuation, or extra conversational words.\n\n"
        f"User prompt: {user_message}\n"
        f"AI response: {assistant_response[:1000]}"
    )
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt
        )
        title = response.text.strip()
        # Clean any quotes or formatting
        title = title.replace('"', '').replace("'", "").strip()
        # Ensure it doesn't exceed 8 words
        words = title.split()
        if len(words) > 8:
            title = " ".join(words[:8])
        return title
    except Exception as e:
        # Fallback to user message slice
        words = user_message.split()
        fallback = " ".join(words[:5])
        if len(fallback) > 30:
            fallback = fallback[:27] + "..."
        return fallback or "Untitled Chat"

