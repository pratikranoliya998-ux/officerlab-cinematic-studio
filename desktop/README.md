# OfficerLab AI Companion (Windows)

A private local desktop companion for the OfficerLab web studio. It uses OpenAI's official Sign in with ChatGPT DevKit from the upstream repository; it does not use an API key, browser cookies, password collection, or a homemade OAuth implementation.

## Important eligibility note

The OpenAI open-source quickstart currently documents ChatGPT plan usage for eligible Plus and Pro users. Go eligibility is not established by that quickstart. The app checks the actual `session.sharing` permission returned by OpenAI and refuses AI requests unless that permission is present. Never assume identity sign-in means plan usage was granted.

## Requirements

- Windows 10/11
- Node.js 22.12 or later
- Git for Windows
- Windows user account with OS credential protection enabled
- An eligible ChatGPT account and explicit consent to ChatGPT plan usage

## Setup

From PowerShell, in this repository:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\desktop\setup.ps1
```

The script downloads the official OpenAI DevKit source into `vendor/sign-in-with-chatgpt-devkit`, builds its official `@siwc/local` package, and installs the desktop companion dependencies. Review upstream source and licence before distribution.

Start:

```powershell
cd desktop
npm start
```

Build Windows installer:

```powershell
npm run dist:win
```

## Security

- OAuth is delegated to OpenAI's official SDK, using system browser, PKCE and loopback callback.
- The SDK stores credentials in the app's local user-data directory through Electron safeStorage (Windows OS-backed encryption). Startup fails closed if encryption is unavailable.
- Renderer receives only safe connection state. Tokens never cross IPC.
- No ChatGPT credentials are sent to Vercel, Render, GitHub or the public OfficerLab website.
- Responses requests are made through the official SDK. The SDK's plan-usage implementation enforces the documented Responses API behavior.
- The app only accepts model identifiers returned by the current authorized profile.
- Disconnect uses the SDK's supported disconnect flow.

## Current scope and limitations

This is the first private companion scaffold: connect/disconnect, permission status, model discovery and a prompt playground. It is not yet embedded into the OfficerLab website; it runs as a separate local Windows app. The public site is unchanged.

The companion only supports eligible text Responses API requests. It does not provide plan-backed image generation, TTS, transcription, file search or other excluded preview capabilities. Keep OfficerLab's browser TTS and local rendering workflows separate.

Do not distribute this companion as a hosted public service. OpenAI's current plan-usage programme is for open-source/local personal projects and selected private clients; remotely hosted or paid distribution needs separate approval.