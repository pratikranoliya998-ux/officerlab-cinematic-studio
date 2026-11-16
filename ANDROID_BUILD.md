# OfficerLab Android app

The Android app is built from the existing React/Vite application with Capacitor. The web deployment remains unchanged.

## Current foundation

- Application ID: `com.officerlab.cinematicstudio`
- App name: `OfficerLab Studio`
- Capacitor Android runtime and native plugin packages
- Android permissions for internet, camera, microphone, audio settings and wake lock
- GitHub Actions debug-APK build workflow

## Build an APK

1. Install Node.js 20+, Java 21 and Android Studio with the Android SDK.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npx cap add android` once.
5. Run `npx cap sync android`.
6. Run `python3 scripts/patch-android-manifest.py`.
7. Run `cd android && ./gradlew assembleDebug`.

The debug APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`.

A GitHub Actions workflow is also provided. Run **Build OfficerLab Android APK** manually from the Actions tab or push changes to the Android foundation branch. Download the generated APK from the workflow artifact.

## Feature-preservation notes

The existing web app and Render worker remain the source of the current presentation, annotation and export workflows. Android integration must preserve the browser implementation while native-specific behavior is added behind platform checks.

Before public release, validate on physical Android devices: camera and microphone permission prompts, front/back camera switching, PPT/PPTX conversion, PDF rendering, slide navigation, annotation, recording with audio, app background/foreground interruption, MP4 conversion, and saving/sharing the exported file.

This initial workflow produces a **debug APK**, not a signed Play Store release. Release signing credentials must be configured securely as GitHub Actions secrets before publishing.
