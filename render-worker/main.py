from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw, ImageFont
from starlette.background import BackgroundTask

app = FastAPI(title="OfficerLab Render Worker", version="1.0.0")
origins = [x.strip() for x in os.getenv(
    "CORS_ORIGINS",
    "https://officerlab-cinematic-studio.vercel.app,http://localhost:5173"
).split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def font_file(bold: bool = False) -> str:
    candidates = [
        "/usr/share/fonts/truetype/noto/NotoSansGujarati-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSansGujarati-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    return next((p for p in candidates if Path(p).exists()), "")


def load_font(size: int, bold: bool = False):
    path = font_file(bold)
    return ImageFont.truetype(path, size) if path else ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in str(text or "").splitlines() or [""]:
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = line + " " + word
            if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
                line = candidate
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def parse_duration(value: str) -> float:
    try:
        bits = [float(part) for part in str(value).split(":")]
        if len(bits) == 2:
            return max(1.0, min(600.0, bits[0] * 60 + bits[1]))
        return max(1.0, min(600.0, bits[0]))
    except (TypeError, ValueError):
        return 10.0


def dimensions(aspect: str, quality: str) -> tuple[int, int]:
    q = str(quality).lower()
    if "4k" in q:
        wide, high = 3840, 2160
    elif "720" in q:
        wide, high = 1280, 720
    else:
        wide, high = 1920, 1080
    a = str(aspect).lower()
    if "9:16" in a:
        return (high, wide)
    if "1:1" in a:
        side = high
        return (side, side)
    if "4:5" in a:
        return (int(high * 0.8), high)
    return wide, high


def make_scene_image(scene: dict, number: int, width: int, height: int, theme: str, path: Path) -> None:
    dark = theme != "paper"
    top = (14, 25, 46) if dark else (238, 233, 220)
    bottom = (7, 11, 20) if dark else (205, 197, 180)
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(int(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3))
        draw.line((0, y, width, y), fill=(*color, 255))
    accent = (218, 170, 83, 255)
    draw.rectangle((int(width * .055), int(height * .10), int(width * .06), int(height * .30)), fill=accent)
    for x in range(int(width * .08), width, max(30, int(width * .09))):
        draw.line((x, 0, x, height), fill=(255, 255, 255, 10), width=1)

    margin = int(width * .085)
    body_font = load_font(max(21, int(height * .039)), False)
    small_font = load_font(max(16, int(height * .018)), True)
    foreground = (247, 245, 239, 255) if dark else (25, 35, 53, 255)
    muted = (177, 190, 208, 255) if dark else (76, 83, 96, 255)

    draw.text((margin, int(height * .105)), "OFFICERLAB  /  CINEMATIC EXPLAINER", font=small_font, fill=accent)
    draw.text((margin, int(height * .19)), str(scene.get("title") or f"Scene {number}"), font=small_font, fill=accent)

    text = str(scene.get("text") or "")
    max_width = int(width * .82)
    lines = wrap_text(draw, text, body_font, max_width)
    y = int(height * .30)
    line_gap = int(height * .068)
    for line in lines[:9]:
        draw.text((margin, y), line, font=body_font, fill=foreground, stroke_width=0)
        y += line_gap

    bar_y = int(height * .77)
    draw.rounded_rectangle((margin, bar_y, margin + int(width * .12), bar_y + max(4, int(height * .006))), radius=8, fill=accent)
    draw.text((margin, int(height * .81)), "Gujarati learning  •  GPSC / GSSSB", font=small_font, fill=muted)
    draw.text((margin, int(height * .94)), f"SCENE {number:02d}", font=small_font, fill=(255, 255, 255, 145))
    image.save(path, format="PNG", optimize=True)


def run_ffmpeg(args: list[str], timeout: int = 3600) -> None:
    completed = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "FFmpeg failed")[-5000:]
        raise RuntimeError(detail)


@app.get("/health")
def health():
    return {"ok": True, "service": "officerlab-render-worker", "ffmpeg": shutil.which("ffmpeg") is not None}


@app.post("/render")
async def render(
    manifest: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    authorization: str = Header(default=""),
):
    expected_token = os.getenv("RENDER_API_TOKEN", "").strip()
    if expected_token and authorization != "Bearer " + expected_token:
        raise HTTPException(status_code=401, detail="Invalid render token")
    if not shutil.which("ffmpeg"):
        raise HTTPException(status_code=503, detail="FFmpeg is not installed on this worker")
    try:
        data = json.loads(manifest)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="The project manifest is not valid JSON")

    scenes = data.get("scenes") or []
    if not scenes or len(scenes) > 100:
        raise HTTPException(status_code=400, detail="Add between 1 and 100 scenes before rendering")
    durations = [parse_duration(scene.get("duration", "00:10")) for scene in scenes]
    total_duration = sum(durations)
    if total_duration > 3600:
        raise HTTPException(status_code=400, detail="A single render is limited to 60 minutes")
    if len(files) > 80:
        raise HTTPException(status_code=400, detail="Too many uploaded files")

    work = Path(tempfile.mkdtemp(prefix="officerlab-render-"))
    try:
        file_paths: dict[str, Path] = {}
        total_bytes = 0
        for upload in files:
            safe_name = Path(upload.filename or "asset.bin").name
            target = work / safe_name
            size = 0
            with target.open("wb") as handle:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    total_bytes += len(chunk)
                    if size > 300 * 1024 * 1024 or total_bytes > 800 * 1024 * 1024:
                        raise HTTPException(status_code=413, detail="Upload limit exceeded (300 MB per asset, 800 MB per project)")
                    handle.write(chunk)
            file_paths[safe_name] = target

        width, height = dimensions(data.get("aspect", "16:9"), data.get("quality", "1080p"))
        scene_images = []
        for index, scene in enumerate(scenes, start=1):
            image_path = work / f"scene_{index:03d}.png"
            make_scene_image(scene, index, width, height, data.get("theme", "midnight"), image_path)
            scene_images.append(image_path)

        args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
        filter_parts: list[str] = []
        video_labels: list[str] = []
        for index, (image_path, duration) in enumerate(zip(scene_images, durations)):
            args += ["-loop", "1", "-framerate", "30", "-t", str(duration), "-i", str(image_path)]
            label = f"v{index}"
            filter_parts.append(
                f"[{index}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,setpts=PTS-STARTPTS[{label}]"
            )
            video_labels.append(f"[{label}]")
        filter_parts.append("".join(video_labels) + f"concat=n={len(video_labels)}:v=1:a=0[vbase]")

        input_index = len(scene_images)
        audio_labels: list[str] = []
        for index, clip in enumerate(data.get("audioClips") or []):
            asset_id = str(clip.get("assetId") or "")
            path = next((p for name, p in file_paths.items() if name.startswith(asset_id + ".")), None)
            if not path:
                continue
            args += ["-i", str(path)]
            audio_input_index = input_index
            input_index += 1
            source_start = max(0.0, float(clip.get("sourceStart") or 0))
            source_end = float(clip.get("sourceEnd") or 0)
            if source_end <= source_start:
                continue
            offset_ms = max(0, int(float(clip.get("start") or 0) * 1000))
            volume = max(0.0, min(2.0, float(clip.get("volume", 1))))
            label = f"a{index}"
            filter_parts.append(
                f"[{audio_input_index}:a]atrim=start={source_start}:end={source_end},"
                f"asetpts=PTS-STARTPTS,volume={volume},adelay={offset_ms}|{offset_ms}[{label}]"
            )
            audio_labels.append(f"[{label}]")

        presenter_path = file_paths.get("presenter.webm")
        presenter_label_added = False
        if presenter_path:
            args += ["-i", str(presenter_path)]
            p_index = input_index
            pip_width = max(220, int(width * 0.27))
            filter_parts.append(
                f"[{p_index}:v]scale={pip_width}:-2,setsar=1[presenter]"
            )
            filter_parts.append(
                f"[vbase][presenter]overlay=W-w-40:H-h-40:eof_action=pass:shortest=0[vout]"
            )
            presenter_label_added = True
            input_index += 1
        if not presenter_label_added:
            filter_parts.append("[vbase]null[vout]")

        if audio_labels:
            filter_parts.append(
                "".join(audio_labels) + f"amix=inputs={len(audio_labels)}:duration=longest:dropout_transition=0,"
                f"atrim=duration={total_duration},asetpts=PTS-STARTPTS[aout]"
            )
        else:
            args += ["-f", "lavfi", "-t", str(total_duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]
            filter_parts.append(f"[{input_index}:a]atrim=duration={total_duration},asetpts=PTS-STARTPTS[aout]")

        output = work / "officerlab-final.mp4"
        args += [
            "-filter_complex", ";".join(filter_parts),
            "-map", "[vout]", "-map", "[aout]",
            "-t", str(total_duration),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
            "-pix_fmt", "yuv420p", "-r", "30",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", str(output),
        ]
        run_ffmpeg(args)
        if not output.exists() or output.stat().st_size < 1024:
            raise RuntimeError("The renderer did not produce a valid MP4 file")
        return FileResponse(
            output,
            media_type="video/mp4",
            filename="officerlab-final.mp4",
            background=BackgroundTask(shutil.rmtree, work, ignore_errors=True),
        )
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except subprocess.TimeoutExpired:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(status_code=504, detail="Render timed out. Try a shorter video or lower resolution.")
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Render failed: {str(exc)[-1800:]}")
