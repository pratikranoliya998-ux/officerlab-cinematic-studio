# Android WebView microphone and camera permission bridge

## Why this is needed

The recorder page already requests microphone input with `navigator.mediaDevices.getUserMedia({ audio: ..., video: false })`. In an Android app that embeds the page in a WebView, that JavaScript request is not enough by itself. The Android app must declare and request the runtime permission, and its `WebChromeClient` must grant the matching WebView resource to the trusted page origin.

This is a **native Android wrapper change**, not a change that can be completed in the hosted HTML alone. The current repository contains the recorder webpage but does not contain an Android Studio project or `MainActivity`; integrate the following into the actual wrapper project.

## 1. AndroidManifest.xml

Add these permissions directly under the `<manifest>` element and outside `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Keep these only if the WebView recorder also uses the phone camera. -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.any" android:required="false" />
```

Do not add `usesCleartextTraffic="true"` for this fix. The OfficerLab site should remain on HTTPS.

## 2. Kotlin WebView permission bridge

Add the imports and members below to the Activity that owns the WebView. Replace the example host list with the exact HTTPS hostnames used by your production app and any preview build you test. Do not use a broad `*.netlify.app` or `*` origin rule.

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

private companion object {
    const val REQUEST_WEB_MEDIA_PERMISSION = 7601

    // Exact hosts only. Add your real production hostname here.
    val TRUSTED_WEB_HOSTS = setOf(
        "officerlab-cinematic-studio.netlify.app",
        "deploy-preview-20--officerlab-cinematic-studio.netlify.app"
    )
}

private data class PendingWebMediaPermission(
    val request: PermissionRequest,
    val webResources: Array<String>,
    val androidPermissions: Array<String>
)

private var pendingWebMediaPermission: PendingWebMediaPermission? = null

private fun isTrustedOfficerLabOrigin(origin: Uri): Boolean {
    return origin.scheme.equals("https", ignoreCase = true) &&
        !origin.host.isNullOrBlank() &&
        TRUSTED_WEB_HOSTS.contains(origin.host!!.lowercase())
}

/**
 * Call this after the WebView has been created.
 * If the Activity already has a WebChromeClient, merge these overrides into it;
 * do not replace existing file-chooser or other required callbacks.
 */
private fun installOfficerLabMediaPermissionBridge(webView: WebView) {
    webView.webChromeClient = object : WebChromeClient() {
        override fun onPermissionRequest(request: PermissionRequest) {
            runOnUiThread {
                if (!isTrustedOfficerLabOrigin(request.origin)) {
                    request.deny()
                    return@runOnUiThread
                }

                val webResources = request.resources
                if (webResources.isEmpty()) {
                    request.deny()
                    return@runOnUiThread
                }

                val androidPermissions = mutableSetOf<String>()
                val supportedResources = mutableSetOf<String>()

                for (resource in webResources) {
                    when (resource) {
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                            supportedResources.add(resource)
                            androidPermissions.add(Manifest.permission.RECORD_AUDIO)
                        }
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                            supportedResources.add(resource)
                            androidPermissions.add(Manifest.permission.CAMERA)
                        }
                        // Never grant unknown WebView capabilities.
                        else -> {
                            request.deny()
                            return@runOnUiThread
                        }
                    }
                }

                if (supportedResources.size != webResources.size) {
                    request.deny()
                    return@runOnUiThread
                }

                val missingPermissions = androidPermissions.filter { permission ->
                    ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        permission
                    ) != PackageManager.PERMISSION_GRANTED
                }

                if (missingPermissions.isEmpty()) {
                    request.grant(supportedResources.toTypedArray())
                } else {
                    // There should be only one outstanding WebView permission prompt.
                    pendingWebMediaPermission?.request?.deny()
                    pendingWebMediaPermission = PendingWebMediaPermission(
                        request = request,
                        webResources = supportedResources.toTypedArray(),
                        androidPermissions = missingPermissions.toTypedArray()
                    )
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        missingPermissions.toTypedArray(),
                        REQUEST_WEB_MEDIA_PERMISSION
                    )
                }
            }
        }

        override fun onPermissionRequestCanceled(request: PermissionRequest) {
            if (pendingWebMediaPermission?.request === request) {
                pendingWebMediaPermission = null
            }
        }

        // Preserve any existing onShowFileChooser(), onJsAlert(), etc. overrides
        // from the app's current WebChromeClient when merging this implementation.
    }
}
```

The sample assumes the Activity class is named `MainActivity`. If yours has a different name, replace `this@MainActivity` with that Activity class name.

## 3. Complete the Android runtime permission result

Add this override to the same Activity:

```kotlin
override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray
) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)

    if (requestCode != REQUEST_WEB_MEDIA_PERMISSION) return

    val pending = pendingWebMediaPermission
    pendingWebMediaPermission = null

    if (pending == null) return

    val allGranted = pending.androidPermissions.all { permission ->
        ContextCompat.checkSelfPermission(
            this,
            permission
        ) == PackageManager.PERMISSION_GRANTED
    }

    if (
        allGranted &&
        isTrustedOfficerLabOrigin(pending.request.origin)
    ) {
        pending.request.grant(pending.webResources)
    } else {
        pending.request.deny()
    }
}
```

Also cancel any outstanding request when the Activity is destroyed:

```kotlin
override fun onDestroy() {
    pendingWebMediaPermission?.request?.deny()
    pendingWebMediaPermission = null
    super.onDestroy()
}
```

## 4. Install the bridge on the recorder WebView

After creating the WebView and before loading the OfficerLab URL:

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true

installOfficerLabMediaPermissionBridge(webView)

webView.loadUrl("https://YOUR-EXACT-OFFICERLAB-HOST/gpsc-guidance-recorder.html")
```

Keep the app's existing WebViewClient, navigation restrictions, file chooser, upload handling, and download handling. This change must not remove those callbacks.

## 5. Test with the Type-C microphone

1. Build and install the updated Android app.
2. In Android Settings → Apps → OfficerLab app → Permissions, allow **Microphone**. Allow **Camera** too only if using the camera feature.
3. Connect the VILOMOX/VELOMAX Type-C microphone before opening the recorder.
4. Open the recorder and tap **Enable Microphone**. Android should display its microphone permission prompt on the first request.
5. After granting it, check that the mic meter moves and run the existing 10-second microphone test.
6. Reopen the microphone selector after permission is granted. Android/WebView may only expose device labels and IDs after access has been granted. Choose the external USB microphone if it appears; otherwise keep the default input and verify the phone's USB-C audio routing.

## Important behavior

- Screen-share/system audio and microphone input are separate capture sources. Granting screen-capture audio does not grant microphone access.
- A webpage cannot bypass a missing Android runtime permission or a WebView that does not forward `onPermissionRequest`.
- If Android permission is denied permanently, enable it from the app's Android Settings page and retry.
- If the system or another app has exclusive access to the USB microphone, close that app and retry.
- The Android framework/WebView version and device firmware still affect USB microphone routing. This bridge enables the supported WebView permission flow; it cannot force Android to route an unsupported USB microphone.

## Verification checklist

- [ ] `RECORD_AUDIO` is present in the installed app manifest.
- [ ] Android microphone runtime permission is granted.
- [ ] The loaded page origin exactly matches an entry in `TRUSTED_WEB_HOSTS`.
- [ ] The Activity's WebChromeClient receives `onPermissionRequest`.
- [ ] The WebView receives `RESOURCE_AUDIO_CAPTURE` only after Android permission is granted.
- [ ] The recorder mic meter and 10-second playback test both work.
