from typing import Literal
from pydantic import BaseModel, Field

ProviderName = Literal["openai", "gemini"]

class ProviderTestRequest(BaseModel):
    provider: ProviderName

class ScriptGenerateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    audience: str = Field(default="GPSC / GSSSB aspirants", max_length=200)
    language: str = Field(default="Gujarati + English technical terms", max_length=100)
    duration_minutes: int = Field(default=10, ge=1, le=60)
    subject_context: str = Field(default="", max_length=12000)
    provider: ProviderName = "openai"
    style: str = Field(default="clear, exam-oriented classroom lecture", max_length=200)
