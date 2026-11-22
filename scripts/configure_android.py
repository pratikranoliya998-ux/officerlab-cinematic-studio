#!/usr/bin/env python3
"""Configure Android permissions, app label, and OfficerLab launcher artwork."""
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image

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
    application.set(ANDROID + "icon", "@mipmap/ic_launcher")
    application.set(ANDROID + "roundIcon", "@mipmap/ic_launcher_round")
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

# Generate density-specific legacy icons and modern Android adaptive icons.
logo_path = Path("assets/officerlab-app-icon.png")
if not logo_path.is_file():
    raise SystemExit(f"OfficerLab launcher logo not found: {logo_path}")

logo = Image.open(logo_path).convert("RGBA")
side = min(logo.width, logo.height)
left = (logo.width - side) // 2
top = (logo.height - side) // 2
logo = logo.crop((left, top, left + side, top + side))

res_dir = Path("android/app/src/main/res")
legacy_sizes = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
adaptive_canvas_sizes = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

for density, pixels in legacy_sizes.items():
    folder = res_dir / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = logo.resize((pixels, pixels), Image.Resampling.LANCZOS)
    icon.save(folder / "ic_launcher.png", optimize=True)
    icon.save(folder / "ic_launcher_round.png", optimize=True)

for density, canvas_pixels in adaptive_canvas_sizes.items():
    folder = res_dir / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    artwork_pixels = round(canvas_pixels * 0.66)
    artwork = logo.resize(
        (artwork_pixels, artwork_pixels),
        Image.Resampling.LANCZOS,
    )
    foreground = Image.new(
        "RGBA",
        (canvas_pixels, canvas_pixels),
        (0, 0, 0, 0),
    )
    foreground.alpha_composite(
        artwork,
        (
            (canvas_pixels - artwork_pixels) // 2,
            (canvas_pixels - artwork_pixels) // 2,
        ),
    )
    foreground.save(folder / "ic_launcher_foreground.png", optimize=True)

adaptive_dir = res_dir / "mipmap-anydpi-v26"
adaptive_dir.mkdir(parents=True, exist_ok=True)
adaptive_xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/officerlab_icon_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""
(adaptive_dir / "ic_launcher.xml").write_text(adaptive_xml, encoding="utf-8")
(adaptive_dir / "ic_launcher_round.xml").write_text(adaptive_xml, encoding="utf-8")

colors_dir = res_dir / "values"
colors_dir.mkdir(parents=True, exist_ok=True)
(colors_dir / "officerlab_icon_colors.xml").write_text(
    """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="officerlab_icon_background">#061A3A</color>
</resources>
""",
    encoding="utf-8",
)

print("Configured OfficerLab permissions, label, and gold/navy launcher icons.")
