#!/usr/bin/env python3
"""Apply the Android permissions and app label after Capacitor scaffolds the native project."""
from pathlib import Path
import xml.etree.ElementTree as ET

manifest_path = Path("android/app/src/main/AndroidManifest.xml")
if not manifest_path.exists():
    raise SystemExit(f"Android manifest not found: {manifest_path}")

ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
ANDROID = "{http://schemas.android.com/apk/res/android}"
tree = ET.parse(manifest_path)
root = tree.getroot()

required_permissions = [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.INTERNET",
]
existing = {
    item.get(ANDROID + "name")
    for item in root.findall("uses-permission")
}
for permission in required_permissions:
    if permission not in existing:
        ET.SubElement(root, "uses-permission", {ANDROID + "name": permission})

# Camera and microphone are optional hardware features so the app can still install
# on tablets/emulators without those devices; recording is enabled when available.
for feature_name in ("android.hardware.camera.any", "android.hardware.microphone"):
    found = any(
        feature.get(ANDROID + "name") == feature_name
        for feature in root.findall("uses-feature")
    )
    if not found:
        ET.SubElement(root, "uses-feature", {
            ANDROID + "name": feature_name,
            ANDROID + "required": "false",
        })

application = root.find("application")
if application is not None:
    application.set(ANDROID + "label", "@string/app_name")
    application.set(ANDROID + "usesCleartextTraffic", "false")

ET.indent(tree, space="    ")
tree.write(manifest_path, encoding="utf-8", xml_declaration=True)

strings_path = Path("android/app/src/main/res/values/strings.xml")
strings_path.parent.mkdir(parents=True, exist_ok=True)
if strings_path.exists():
    strings_tree = ET.parse(strings_path)
    resources = strings_tree.getroot()
else:
    resources = ET.Element("resources")
    strings_tree = ET.ElementTree(resources)

app_name = resources.find("string[@name='app_name']")
if app_name is None:
    app_name = ET.SubElement(resources, "string", {"name": "app_name"})
app_name.text = "OfficerLab Lecture Studio"
ET.indent(strings_tree, space="    ")
strings_tree.write(strings_path, encoding="utf-8", xml_declaration=True)

print("Configured camera, microphone, audio, internet permissions and OfficerLab app label.")
