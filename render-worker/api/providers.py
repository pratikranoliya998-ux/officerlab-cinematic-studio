import os
import httpx
from fastapi import HTTPException

OPENAI_URL = "https://api.openai.com/v1/responses"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def provider_status() -> dict:
    return {
        "openai": {"configured": bool(os.getenv("OPENAI_API_KEY", "").strip()), "model": os.getenv("OPENAI_MODEL", "gpt-5.5")},
        "gemini": {"configured": bool(os.getenv("GEMINI_API_KEY", "").strip()), "model": os.getenv("GEMINI_MODEL", "gemini-3.8-flash")},
    }

async def _post_json(url: str, headers: dict, payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            detail = "Provider rejected the request"
            try:
                detail = response.json().get("error", {}).get("message", detail)
            except Exception:
                pass
            raise HTTPException(status_code=502, detail=f"AI provider error ({response.status_code}): {detail[:500]}")
        return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI provider timed out. Please retry.")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not connect to the AI provider.")

async def generate_text(provider: str, prompt: str) -> dict:
    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY", "").strip()
        if not key:
            raise HTTPException(status_code=503, detail="OpenAI is not configured. Add OPENAI_API_KEY in Render.")
        model = os.getenv("OPENAI_MODEL", "gpt-5.5").strip()
        data = await _post_json(OPENAI_URL, {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, {"model": model, "input": prompt})
        text = data.get("output_text")
        if not text:
            parts = []
            for item in data.get("output", []):
                for content in item.get("content", []):
                    if content.get("type") == "output_text":
                        parts.append(content.get("text", ""))
            text = "\\n".join(parts)
        if not text:
            raise HTTPException(status_code=502, detail="OpenAI returned no text output.")
        return {"provider": provider, "model": model, "text": text, "request_id": data.get("id")}

    if provider == "gemini":
        key = os.getenv("GEMINI_API_KEY", "").strip()
        if not key:
            raise HTTPException(status_code=503, detail="Gemini is not configured. Add GEMINI_API_KEY in Render.")
        model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
        url = f"{GEMINI_BASE}/{model}:generateContent"
        data = await _post_json(url, {"x-goog-api-key": key, "Content-Type": "application/json"}, {"contents": [{"parts": [{"text": prompt}]}]})
        candidates = data.get("candidates", [])
        text = "\\n".join(part.get("text", "") for candidate in candidates for part in candidate.get("content", {}).get("parts", []))
        if not text:
            raise HTTPException(status_code=502, detail="Gemini returned no text output.")
        return {"provider": provider, "model": model, "text": text, "usage": data.get("usageMetadata", {})}

    raise HTTPException(status_code=400, detail="Unsupported provider")

async def test_provider(provider: str) -> dict:
    result = await generate_text(provider, "Reply with exactly: OfficerLab API connection successful")
    return {"ok": True, "provider": result["provider"], "model": result["model"], "message": result["text"].strip()[:160]}
