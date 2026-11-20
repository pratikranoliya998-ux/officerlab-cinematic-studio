# OfficerLab installation and native builds

## PC: install as a desktop app

1. Open the deployed OfficerLab site in Chrome or Microsoft Edge.
2. Select Install OfficerLab on the page, or use the browser menu and choose Install OfficerLab / Install this site as an app.
3. Launch it from the Windows Start menu or desktop app list.

This is an installable web app (PWA), not a signed Windows executable. It uses the browser's secure runtime for camera and microphone access.

## Android: install as a web app

1. Open the deployed OfficerLab site in Chrome for Android.
2. Tap Install OfficerLab, or open Chrome's menu and choose Install app / Add to Home screen.
3. Open OfficerLab from the home screen.

The app shell and built JavaScript/CSS are cached after the first successful online visit. Cloud rendering, AI endpoints, PowerPoint conversion and third-party PDF resources still require internet access.

## Android: build a debug APK

The repository workflow named Build OfficerLab Android APK generates a debug APK using Capacitor:

1. Open the repository's Actions tab.
2. Select Build OfficerLab Android APK.
3. Choose Run workflow, or wait for the workflow triggered by a pull request or push.
4. When the run succeeds, open it and download the officerlab-android-debug-apk artifact.
5. Extract app-debug.apk, transfer it to the Android phone, and open it to install. Android may ask you to allow installation from that source.

Local build prerequisites: Node.js 20+, JDK 21, Android Studio and Android SDK. Commands:

    npm install
    npm run build
    npx cap add android
    npx cap sync android
    python3 scripts/patch-android-manifest.py

Then open the Android project in Android Studio or build from a compatible shell using Gradle.

Important: this workflow produces a debug APK for testing. It is not a Play Store release. Physical-device checks are still required for camera/microphone permissions, camera switching, recording audio, file selection, background/foreground behavior and export.

## GitHub Pages

The Pages workflow builds with the repository subpath /officerlab-cinematic-studio/. In repository Settings > Pages, set the deployment source to GitHub Actions. Merge PR #17 into feature/recorder-animation-scheduler; the subsequent branch push runs the Pages deployment. The app URL will be:

    https://pratikranoliya998-ux.github.io/officerlab-cinematic-studio/
