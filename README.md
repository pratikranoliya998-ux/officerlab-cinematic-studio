# OfficerLab Cinematic Studio

A Vite + React starter application for Gujarati educational video production. Designed for Vercel hosting, with a browser-based studio UI and an integration seam for the Python/Skia Cinematic Skill renderer.

## Included in this ZIP

- Responsive OfficerLab studio dashboard
- Gujarati + English script editor and project JSON export
- Scene list and editable on-screen text
- Animated canvas-based motion-graphics preview
- Browser microphone recording (WebM)
- Browser webcam + microphone recording (WebM)
- Media import (local browser session)
- SRT caption file generation (estimated timing, not word-level alignment)
- 8-second canvas preview export (WebM)
- Vercel SPA rewrite configuration

## Run locally

Requirements: Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera and microphone access require localhost or HTTPS and user permission.

Build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Create a GitHub repository and upload the contents of this folder.
2. In Vercel, select **Add New → Project** and import that repository.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy. `vercel.json` provides the SPA fallback.

No API keys are required for this starter. Do not put private API keys in `VITE_*` variables or browser code.

## Important: production rendering architecture

The GitHub `Moh4696/cinematic-skill` project is a Python/Skia command-line rendering skill. This ZIP does **not** bundle or port that repository's renderer. It provides a browser studio foundation and a preview exporter.

For full cinematic rendering, use a separate Python rendering worker (container/VM or job service) that:
- installs the upstream Cinematic Skill and its pinned Python requirements,
- runs FFmpeg and Skia in a controlled environment,
- receives a validated project manifest and uploaded assets,
- produces MP4, audio mix, SRT and credits,
- stores outputs in object storage and returns a download URL.

Vercel should host the UI and lightweight API/job orchestration, not the long-running Skia/FFmpeg render. Vercel function duration, memory and native system dependencies make it a poor place for full video rendering. Use a queue and worker service for that stage.

Suggested future API contract:

`POST /api/render-jobs` with `{ project, script, scenes, assets, voiceoverUrl, presenterVideoUrl, output: { resolution, format } }`

Return `{ jobId, status: "queued" }`; poll `GET /api/render-jobs/:jobId` for progress and final URLs. Add authentication, upload limits, signed URLs, rate limits and per-user storage before public deployment.

## AI script generation integration

The Script Editor includes OpenAI and Google Gemini provider selection, provider connection testing, and lecture-script generation. Browser requests go to the same-origin Vercel function at `/api/ai/*`; that function proxies only the allowlisted AI routes to the Render FastAPI gateway. Provider credentials and the gateway access key are never placed in browser JavaScript.

Configure these **server-side** environment variables:

**Render service (officerlab-render-worker):**
- `OFFICERLAB_API_ACCESS_KEY`: a long random access key shared only with the Vercel server function.
- `OPENAI_API_KEY`: optional OpenAI API key.
- `OPENAI_MODEL`: optional model override; use a model available to your OpenAI API account.
- `GEMINI_API_KEY`: optional Google AI Studio API key.
- `GEMINI_MODEL`: optional model override; use a model available to your Google project.

**Vercel project (Production and Preview):**
- `RENDER_API_URL`: Render worker origin only, e.g. `https://YOUR-WORKER.onrender.com` (no trailing slash required).
- `OFFICERLAB_API_ACCESS_KEY`: exactly the same value as the Render setting above.

Do **not** create `VITE_*` variables for API keys. Vite variables are public and can be read by every visitor. After adding or changing environment variables, redeploy the Render service and Vercel project. Then open Script Editor → AI Script Studio → choose OpenAI or Gemini → Test API Connection → Generate Full Lecture Script.

The existing `/api/providers` status endpoint exposes whether a provider key is configured, not the key itself. API requests are rate-limited by the Render gateway. Provider usage is billed separately by the provider and requires an active API account with billing/credits.

## Current limitations

- The canvas exporter produces an 8-second **WebM preview**, not a full MP4 film.
- The webcam and microphone recordings are independent captures; automatic presenter/graphics compositing and audio muxing are not implemented yet.
- Captions use estimated sentence durations; accurate Gujarati word-level sync requires speech alignment.
- The app does not currently call an LLM or TTS API. Add provider integrations through secure server-side endpoints.
- Project state is exported as JSON; it is not cloud-saved.

## Upstream renderer

Original project: https://github.com/Moh4696/cinematic-skill

Review its licence, usage, attribution and image licensing requirements before integrating or redistributing its code. This starter is a separate implementation and does not include upstream source files.


## Multitrack editor and audio sync

The Studio timeline now supports three audio lanes (voice, music and SFX), multiple imported clips per lane, visible clip blocks, drag/drop lane changes and horizontal repositioning. The selected clip editor supports source in/out trimming, volume, midpoint split, adjacent split-segment merge, delete/cut, and sync to the start of a selected scene. Scene duration changes and reordering recalculate scene-linked audio offsets. The audio mix preview schedules all clips together in Web Audio.

These are browser-session edits. Download the project JSON to preserve the timeline edit metadata. Local audio bytes and blob URLs are not embedded in that JSON; keep the original audio files available for a later render.

## Full MP4 rendering worker

A separate FastAPI + FFmpeg worker is included in `render-worker/`. It renders scene motion-card frames, concatenates scenes into an H.264 MP4, mixes trimmed/positioned/volume-adjusted voice/music/SFX files, and overlays a recorded presenter WebM as picture-in-picture.

### Deploy the worker

1. Push the repository to GitHub.
2. Create a Render Blueprint from the repository using the root `render.yaml`, or create a Docker web service with root directory `render-worker`.
3. Wait for the service to deploy and test its `/health` endpoint.
4. In Vercel → Project → Settings → Environment Variables, set `VITE_RENDER_API_URL` to the Render service origin, for example `https://YOUR-WORKER.onrender.com`.
5. Redeploy the Vercel frontend so Vite includes the endpoint variable.

Optional worker bearer-token protection is available through `RENDER_API_TOKEN`. A matching `VITE_RENDER_API_TOKEN` can be supplied to the frontend, but **VITE variables are public in browser code and are not secrets**. For a private production credential, place an authenticated server-side API proxy in front of the worker. Restrict `CORS_ORIGINS` to the actual app origin.

### Worker request limits and current render scope

The worker currently accepts up to 100 scenes, 60 minutes per render, 300 MB per file and 800 MB total uploaded media. It returns an MP4 directly in the HTTP response; the request stays open while FFmpeg runs. The video is composed from the editable text-based scene cards and an optional presenter PIP overlay. Audio tracks are mixed from uploaded files using each clip's timeline offset, source trim and volume.

This first worker does not yet provide a persistent job queue, cloud asset library, generated stock imagery, per-word caption alignment, AI script/TTS service, or advanced transitions/chroma key. It is an actual MP4 render path, but not a substitute for a full multi-user NLE/render farm. Add authentication, rate limiting, persistent jobs, object storage and monitoring before opening it to unrestricted public traffic.


## Presenter-only MP4 export

The focused Presenter Studio records the user's webcam video and microphone audio together in one WebM capture. The **Convert to MP4** action uploads that recording directly to the Render worker's `/convert-presenter` endpoint, where FFmpeg converts it to H.264/AAC MP4. The browser then offers the MP4 download; a WebM backup is also available.

Configure `VITE_RENDER_API_URL` in the Vercel project to the Render worker origin (for example, `https://YOUR-WORKER.onrender.com`) and redeploy the frontend. If the Render worker has `RENDER_API_TOKEN` enabled, configure the matching `VITE_RENDER_API_TOKEN` for the frontend. **A VITE_ token is public to browser visitors**, so do not treat it as a secret or enable a shared public deployment with a private token embedded in client code. For a private production service, put an authenticated server-side upload proxy in front of the worker.

The worker accepts presenter recordings up to 300 MB. Conversion requires the Render worker to be deployed with FFmpeg. The original capture remains in the browser until the user downloads it or leaves the page; recordings are not cloud-saved.
