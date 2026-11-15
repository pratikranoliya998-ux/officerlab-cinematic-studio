# OfficerLab FFmpeg Render Worker

This worker renders an MP4 from an OfficerLab Studio project manifest and uploaded media.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the repository (or create a Docker web service).
3. Set the service root directory to `render-worker` if creating the service manually. The repository's `render.yaml` already declares this.
4. Set `CORS_ORIGINS` to the exact Vercel app origin.
5. Set a strong `RENDER_API_TOKEN` in the Render dashboard.
6. Deploy and verify `https://YOUR-WORKER.onrender.com/health` returns `{"ok":true,...}`.

The worker requires FFmpeg and Noto Gujarati fonts; the Dockerfile installs them.

## Connect the Vercel frontend

Set the Vercel project environment variable:

- `VITE_RENDER_API_URL=https://YOUR-WORKER.onrender.com`

Then redeploy the Vercel frontend. The worker can optionally validate a bearer token with `RENDER_API_TOKEN`; however, any `VITE_*` value is public in browser code. For a private production token, put an authenticated server-side API proxy between the browser and this worker. Do not treat a VITE variable as secret.

## Render API

`POST /render` as multipart form data:

- `manifest`: JSON string with project title, scenes, aspect, quality, theme and `audioClips`.
- `files`: repeated uploaded files. Audio filenames begin with the clip's `assetId`; optional presenter recording must be named `presenter.webm`.

The worker generates cinematic text-led scene frames, concatenates them into H.264 MP4, overlays presenter footage as picture-in-picture when present, and mixes the uploaded voice/music/SFX clips using their trim, offset and volume settings.

Limits: 100 scenes, 60 minutes per render, 300 MB per uploaded asset and 800 MB total per job. This is a first production-worker implementation, not a cloud asset library or job queue; long renders hold the HTTP request open. Add authentication, rate limiting, persistent job queues, storage, monitoring and resource quotas before opening it to unrestricted public traffic.


## OfficerLab AI API Gateway (Phase 1)

The same Render service now hosts the initial secure AI gateway alongside the FFmpeg renderer.

### Render environment variables

| Variable | Type | Purpose |
| --- | --- | --- |
| `OFFICERLAB_API_ACCESS_KEY` | Secret | Private key required in `X-OfficerLab-Access-Key` for AI test/generation endpoints |
| `OPENAI_API_KEY` | Secret | OpenAI project API key |
| `OPENAI_MODEL` | Config | Defaults to `gpt-5.5` |
| `GEMINI_API_KEY` | Secret | Google Gemini API key |
| `GEMINI_MODEL` | Config | Defaults to `gemini-3.8-flash` |
| `API_RATE_LIMIT_PER_MINUTE` | Config | In-memory per-IP limit; default 10 |
| `CORS_ORIGINS` | Config | Allowed browser origins |
| `RENDER_API_TOKEN` | Secret | Existing MP4 render endpoint token |

Do not add provider keys to Vercel `VITE_*` variables, frontend code, GitHub, or chat messages. Add them only in Render's Environment settings. Keep `OFFICERLAB_API_ACCESS_KEY` private as well.

### API endpoints

- `GET /api/health` — gateway health.
- `GET /api/providers` — configured provider flags and model names; never returns keys.
- `POST /api/providers/test` — sends a small test prompt to OpenAI or Gemini.
- `POST /api/script/generate` — creates a first draft educational lecture script.

For POST requests send JSON and header `X-OfficerLab-Access-Key: YOUR_PRIVATE_ACCESS_KEY`.

Provider test body:
```json
{"provider":"openai"}
```

Script generation body:
```json
{
  "provider": "gemini",
  "topic": "Food Safety and Standards Act, 2006",
  "audience": "GSSSB Food Safety Officer aspirants",
  "language": "Gujarati + English technical terms",
  "duration_minutes": 20,
  "subject_context": "Paste verified source notes here"
}
```

### Deployment and smoke test

1. Push/merge the code to `main`; Render auto-deploys the existing worker service.
2. In Render → service → Environment, add a strong random `OFFICERLAB_API_ACCESS_KEY`.
3. Add `OPENAI_API_KEY` and/or `GEMINI_API_KEY` when created. You can add either one first.
4. Save changes and let Render redeploy.
5. Open `https://YOUR-WORKER.onrender.com/api/health`.
6. Open `https://YOUR-WORKER.onrender.com/api/providers`; configured values should show true only for keys you added.
7. Test a provider from a trusted terminal using the POST contract above.

### Current Phase 1 limitations

- The React app does not yet have the API settings form or AI Studio controls; Phase 1 establishes the server-side gateway and endpoints.
- The access key is not embedded in the frontend. A later authenticated UI/session flow or a server-side Vercel proxy is required before browser-based AI calls.
- The in-memory rate limiter is suitable only for initial single-instance testing, not multi-instance production.
- Cloud storage, persistent usage accounting, user accounts, job queue and AI visual/TTS integrations are later phases.
