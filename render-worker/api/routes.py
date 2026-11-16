from fastapi import APIRouter, Depends, Request
from .schemas import ProviderTestRequest, ScriptGenerateRequest
from .security import enforce_rate_limit, require_api_access
from .providers import generate_text, provider_status, test_provider

router = APIRouter(prefix="/api", tags=["OfficerLab AI API"])

@router.get("/health")
async def api_health():
    return {"ok": True, "service": "officerlab-ai-gateway", "version": "1.0.0"}

@router.get("/providers")
async def providers():
    return {"providers": provider_status(), "access_key_required": True}

@router.post("/providers/test", dependencies=[Depends(require_api_access)])
async def provider_test(body: ProviderTestRequest, request: Request):
    enforce_rate_limit(request)
    return await test_provider(body.provider)

@router.post("/script/generate", dependencies=[Depends(require_api_access)])
async def script_generate(body: ScriptGenerateRequest, request: Request):
    enforce_rate_limit(request)
    prompt = f"""You are OfficerLab's educational content writer for Indian competitive examinations.
Create a fact-conscious, structured lecture script. Do not invent legal provisions, dates, statistics, or citations. Clearly mark anything that requires source verification.
Topic: {body.topic}
Audience: {body.audience}
Language: {body.language}. Preserve official English technical terms in parentheses where useful.
Target duration: {body.duration_minutes} minutes
Teaching style: {body.style}
Source context supplied by user (treat as primary; do not silently add unsupported details):
{body.subject_context or 'No source material supplied. Clearly distinguish general explanation from facts requiring verification.'}
Return: lecture title, learning objectives, opening hook, section-wise narration with approximate timings, examples, exam-focused key points, recap, and 5 practice MCQs with answers and explanations."""
    result = await generate_text(body.provider, prompt)
    return {"ok": True, "topic": body.topic, "duration_minutes": body.duration_minutes, **result}


# HeyGen Turbo text-to-speech. The provider key stays on the Render worker.
from pydantic import BaseModel, Field
from fastapi import HTTPException
from fastapi.responses import Response
import httpx
from urllib.parse import urlparse
import os

class HeyGenTTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice_id: str = Field(min_length=5, max_length=200)
    language: str = Field(default="gu", min_length=2, max_length=20)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)

@router.post("/tts/generate", dependencies=[Depends(require_api_access)])
async def heygen_tts_generate(body: HeyGenTTSRequest, request: Request):
    enforce_rate_limit(request)
    api_key = os.getenv("HEYGEN_API_KEY", "").strip()
    if not api_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="HeyGen is not configured. Add HEYGEN_API_KEY to Render environment variables.")
    payload = {
        "model": os.getenv("HEYGEN_TTS_MODEL", "heygen-voice-1-turbo-free"),
        "voice_id": body.voice_id,
        "text": body.text,
        "speed": body.speed,
    }
    if body.language:
        payload["language"] = body.language
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0), follow_redirects=False) as client:
            generated = await client.post(
                "https://api.heygen.com/v3/models/audio/tts",
                headers={"X-Api-Key": api_key, "Content-Type": "application/json", "Accept": "application/json"},
                json=payload,
            )
            if generated.status_code >= 400:
                detail = "HeyGen rejected the TTS request"
                try:
                    detail = generated.json().get("error", {}).get("message", detail)
                except Exception:
                    pass
                raise HTTPException(status_code=502, detail=f"HeyGen API error ({generated.status_code}): {detail[:400]}")
            data = generated.json().get("data") or {}
            audio_url = data.get("audio_url")
            if not audio_url:
                raise HTTPException(status_code=502, detail="HeyGen returned no audio URL.")
            parsed = urlparse(audio_url)
            if parsed.scheme != "https" or not (parsed.hostname or "").endswith("heygen.ai"):
                raise HTTPException(status_code=502, detail="HeyGen returned an unexpected audio host.")
            audio_response = await client.get(audio_url)
            if audio_response.status_code >= 400:
                raise HTTPException(status_code=502, detail="Could not download the generated HeyGen audio.")
            if len(audio_response.content) > 25 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Generated audio exceeded the 25 MB limit.")
            media_type = audio_response.headers.get("content-type", "audio/wav").split(";")[0]
            return Response(
                content=audio_response.content,
                media_type=media_type,
                headers={"Content-Disposition": 'attachment; filename="officerlab-heygen-voice.wav"', "Cache-Control": "no-store"},
            )
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="HeyGen TTS timed out. Please retry.")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not connect to HeyGen.")
