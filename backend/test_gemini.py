from google import genai
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

models = [
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
]

for model in models:
    print(f"\nTesting {model}")
    try:
        response = client.models.generate_content(
            model=model,
            contents="Say hello in one sentence."
        )
        print("SUCCESS:", response.text)
    except Exception as e:
        print("FAILED:", e)