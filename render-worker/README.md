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
