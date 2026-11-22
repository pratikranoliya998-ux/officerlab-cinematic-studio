#!/usr/bin/env python3
"""Add runtime permissions required by OfficerLab's lecture recorder."""
from pathlib import Path
import xml.etree.ElementTree as ET

manifest = Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    raise SystemExit("Capacitor Android manifest was not generated. Run npx cap add android first.")

ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
tree = ET.parse(manifest)
root = tree.getroot()
android = "{http://schemas.android.com/apk/res/android}"

required_permissions = [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.WAKE_LOCK",
]
existing_permissions = {
    node.get(android + "name")
    for node in root.findall("uses-permission")
}
for permission in required_permissions:
    if permission not in existing_permissions:
        node = ET.Element("uses-permission")
        node.set(android + "name", permission)
        root.insert(0, node)

for feature in [
    ("android.hardware.camera", False),
    ("android.hardware.microphone", False),
]:
    name, required = feature
    features = {node.get(android + "name") for node in root.findall("uses-feature")}
    if name not in features:
        node = ET.Element("uses-feature")
        node.set(android + "name", name)
        node.set(android + "required", "true" if required else "false")
        root.insert(0, node)

tree.write(manifest, encoding="utf-8", xml_declaration=True)
print("OfficerLab Android camera, microphone and network permissions configured.")
