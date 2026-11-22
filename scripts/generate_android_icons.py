#!/usr/bin/env python3
"""Generate OfficerLab launcher icon resources from the supplied brand mark."""
from pathlib import Path
from PIL import Image

SOURCE = Path("assets/officerlab-app-icon.png")
RES = Path("android/app/src/main/res")
if not SOURCE.exists():
    raise SystemExit(f"Launcher logo not found: {SOURCE}")

logo = Image.open(SOURCE).convert("RGBA")
densities = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
adaptive_sizes = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

for density, px in densities.items():
    directory = RES / f"mipmap-{density}"
    directory.mkdir(parents=True, exist_ok=True)
    raster = logo.resize((px, px), Image.Resampling.LANCZOS)
    raster.save(directory / "ic_launcher.png", optimize=True)
    raster.save(directory / "ic_launcher_round.png", optimize=True)

    # Android adaptive-icon foreground uses the centered 66% safe zone.
    canvas_size = adaptive_sizes[density]
    artwork_size = round(canvas_size * 0.66)
    artwork = logo.resize((artwork_size, artwork_size), Image.Resampling.LANCZOS)
    foreground = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    foreground.alpha_composite(
        artwork, ((canvas_size - artwork_size) // 2, (canvas_size - artwork_size) // 2)
    )
    foreground.save(directory / "ic_launcher_foreground.png", optimize=True)

adaptive_dir = RES / "mipmap-anydpi-v26"
adaptive_dir.mkdir(parents=True, exist_ok=True)
adaptive_xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/officerlab_icon_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""
(adaptive_dir / "ic_launcher.xml").write_text(adaptive_xml, encoding="utf-8")
(adaptive_dir / "ic_launcher_round.xml").write_text(adaptive_xml, encoding="utf-8")

values_dir = RES / "values"
values_dir.mkdir(parents=True, exist_ok=True)
(values_dir / "officerlab_icon_colors.xml").write_text(
    """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="officerlab_icon_background">#061A3A</color>
</resources>
""",
    encoding="utf-8",
)
print("OfficerLab launcher icons generated for all Android densities and adaptive icons.")
