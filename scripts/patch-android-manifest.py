#!/usr/bin/env python3
"""Add the runtime permissions required by OfficerLab's presenter studio."""
from pathlib import Path
import xml.etree.ElementTree as ET

manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    raise SystemExit("Capacitor Android manifest was not generated")

ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
tree = ET.parse(manifest)
root = tree.getroot()
android = "{http://schemas.android.com/apk/res/android}"
required = [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.WAKE_LOCK",
]
existing = {node.get(android + "name") for node in root.findall("uses-permission")}
for permission in required:
    if permission not in existing:
        node = ET.Element("uses-permission")
        node.set(android + "name", permission)
        root.insert(0, node)

# Camera hardware is optional: users can still open slides and recorded files
# on devices without a camera.
features = {node.get(android + "name") for node in root.findall("uses-feature")}
if "android.hardware.camera" not in features:
    node = ET.Element("uses-feature")
    node.set(android + "name", "android.hardware.camera")
    node.set(android + "required", "false")
    root.insert(0, node)

tree.write(manifest, encoding="utf-8", xml_declaration=True)
print("OfficerLab Android permissions configured.")
