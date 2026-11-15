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
