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

## Current limitations

- The canvas exporter produces an 8-second **WebM preview**, not a full MP4 film.
- The webcam and microphone recordings are independent captures; automatic presenter/graphics compositing and audio muxing are not implemented yet.
- Captions use estimated sentence durations; accurate Gujarati word-level sync requires speech alignment.
- The app does not currently call an LLM or TTS API. Add provider integrations through secure server-side endpoints.
- Project state is exported as JSON; it is not cloud-saved.

## Upstream renderer

Original project: https://github.com/Moh4696/cinematic-skill

Review its licence, usage, attribution and image licensing requirements before integrating or redistributing its code. This starter is a separate implementation and does not include upstream source files.
