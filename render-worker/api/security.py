import hmac
import os
import time
from collections import defaultdict, deque
from fastapi import Header, HTTPException, Request

# Per-process protection for the initial single-instance deployment. Use a shared
# rate-limit store (e.g. Redis) before scaling to multiple worker instances.
_requests = defaultdict(deque)

def require_api_access(x_officerlab_access_key: str = Header(default="")) -> None:
    expected = os.getenv("OFFICERLAB_API_ACCESS_KEY", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="AI API gateway is not configured. Set OFFICERLAB_API_ACCESS_KEY in Render.")
    if not hmac.compare_digest(x_officerlab_access_key, expected):
        raise HTTPException(status_code=401, detail="Invalid OfficerLab API access key")

def enforce_rate_limit(request: Request) -> None:
    limit = max(1, int(os.getenv("API_RATE_LIMIT_PER_MINUTE", "10")))
    host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _requests[host]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit reached. Please wait one minute and try again.")
    bucket.append(now)
