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

app = FastAPI(title="OfficerLab Render Worker + AI Gateway", version="1.1.0")

from api.routes import router as ai_api_router
app.include_router(ai_api_router)
origins = [x.strip() for x in os.getenv(
    "CORS_ORIGINS",
    "https://officerlab-cinematic-studio.vercel.app,http://localhost:5173"
).split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Permit the stable production domain plus this project's generated Vercel
    # preview/deployment aliases. The regex is restricted to this app's slug.
    allow_origin_regex=r"https://officerlab-cinematic-studio(?:-[a-z0-9-]+)*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition"],
    max_age=600,
)


def font_file(bold: bool = False) -> str:
    candidates = [
        "/usr/share/fonts/truetype/noto/NotoSansGujarati-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSansGujarati-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansGujaratiUI-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSansGujaratiUI-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    return next((p for p in candidates if Path(p).exists()), "")


def load_font(size: int, bold: bool = False):
    path = font_file(bold)
    if not path:
        raise RuntimeError("Noto Sans Gujarati font is missing; install fonts-noto-core in the render image")
    # Layout the Gujarati text with RAQM/HarfBuzz so conjuncts and vowel marks are shaped correctly.
    try:
        return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
    except Exception:
        return ImageFont.truetype(path, size)


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
            if draw.textbbox((0, 0), candidate, font=font, direction="ltr")[2] <= max_width:
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
    # Keep the longest edge at 1280px on the 512 MB Render instance.
    # The UI may still request 1080p/4K, but the worker safely downsamples.
    if "9:16" in str(aspect).lower():
        return (720, 1280)
    if "1:1" in str(aspect).lower():
        return (960, 960)
    if "4:5" in str(aspect).lower():
        return (768, 960)
    return (1280, 720)


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

    # Pillow + RAQM is used for Indic shaping. Anchor="lt" avoids baseline ambiguity.
    draw.text((margin, int(height * .105)), "OFFICERLAB  /  CINEMATIC EXPLAINER", font=small_font, fill=accent, anchor="lt")
    draw.text((margin, int(height * .19)), str(scene.get("title") or f"Scene {number}"), font=small_font, fill=accent, anchor="lt")

    text = str(scene.get("text") or "")
    max_width = int(width * .82)
    lines = wrap_text(draw, text, body_font, max_width)
    y = int(height * .30)
    line_gap = int(height * .068)
    for line in lines[:9]:
        draw.text((margin, y), line, font=body_font, fill=foreground, stroke_width=0, anchor="lt")
        y += line_gap

    bar_y = int(height * .77)
    draw.rounded_rectangle((margin, bar_y, margin + int(width * .12), bar_y + max(4, int(height * .006))), radius=8, fill=accent)
    draw.text((margin, int(height * .81)), "Gujarati learning  •  GPSC / GSSSB", font=small_font, fill=muted, anchor="lt")
    draw.text((margin, int(height * .94)), f"SCENE {number:02d}", font=small_font, fill=(255, 255, 255, 145), anchor="lt")
    image.save(path, format="PNG", optimize=True)


def run_ffmpeg(args: list[str], timeout: int = 3600) -> None:
    completed = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "FFmpeg failed")[-5000:]
        raise RuntimeError(detail)


@app.post("/render/cinematic")
async def render_cinematic_endpoint(
    manifest: str = Form(...),
    authorization: str = Header(default=""),
):
    expected_token = os.getenv("RENDER_API_TOKEN", "").strip()
    if expected_token and authorization != "Bearer " + expected_token:
        raise HTTPException(status_code=401, detail="Invalid render token")
    try:
        data = json.loads(manifest)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="The cinematic project manifest is not valid JSON")
    work = Path(tempfile.mkdtemp(prefix="officerlab-cinematic-"))
    try:
        from cinematic_engine.adapter import render_cinematic
        output = work / "officerlab-cinematic.mp4"
        render_cinematic(data, output, work)
        if not output.exists() or output.stat().st_size < 1024:
            raise RuntimeError("Cinematic engine did not produce a valid MP4")
        return FileResponse(
            output, media_type="video/mp4", filename="officerlab-cinematic.mp4",
            background=BackgroundTask(shutil.rmtree, work, ignore_errors=True),
        )
    except HTTPException:
        shutil.rmtree(work, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Cinematic render failed: {str(exc)[-1800:]}")

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
        # Render each scene in its own short FFmpeg process. The previous pipeline
        # opened every still-image input simultaneously, which could exceed Render's
        # 512 MB free-instance memory limit on larger projects.
        segment_paths: list[Path] = []
        for index, (scene, duration) in enumerate(zip(scenes, durations), start=1):
            image_path = work / f"scene_{index:03d}.png"
            segment_path = work / f"segment_{index:03d}.mp4"
            make_scene_image(scene, index, width, height, data.get("theme", "midnight"), image_path)
            run_ffmpeg([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-threads", "1", "-filter_threads", "1",
                "-loop", "1", "-framerate", "30", "-t", str(duration), "-i", str(image_path),
                "-vf", "format=yuv420p",
                "-an", "-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage",
                "-threads", "1", "-pix_fmt", "yuv420p", "-r", "30",
                "-movflags", "+faststart", str(segment_path),
            ], timeout=max(120, int(duration * 8)))
            image_path.unlink(missing_ok=True)
            if not segment_path.exists() or segment_path.stat().st_size < 512:
                raise RuntimeError(f"FFmpeg failed to create scene segment {index}")
            segment_paths.append(segment_path)

        concat_file = work / "scenes.txt"
        concat_file.write_text(
            "".join(f"file '{path.as_posix()}'\n" for path in segment_paths),
            encoding="utf-8",
        )
        base_video = work / "scenes-concat.mp4"
        run_ffmpeg([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-threads", "1", "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-c", "copy", "-movflags", "+faststart", str(base_video),
        ])

        # The final pass handles only the concatenated video plus actual audio/PIP
        # inputs, with filter and codec threading constrained for low-memory hosts.
        args = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-threads", "1", "-filter_threads", "1", "-filter_complex_threads", "1",
            "-i", str(base_video),
        ]
        filter_parts: list[str] = []
        input_index = 1
        audio_labels: list[str] = []
        for index, clip in enumerate(data.get("audioClips") or []):
            asset_id = str(clip.get("assetId") or "")
            path = next((p for name, p in file_paths.items() if name.startswith(asset_id + ".")), None)
            if not path:
                continue
            source_start = max(0.0, float(clip.get("sourceStart") or 0))
            source_end = float(clip.get("sourceEnd") or 0)
            if source_end <= source_start:
                continue
            args += ["-i", str(path)]
            audio_input_index = input_index
            input_index += 1
            offset_ms = max(0, int(float(clip.get("start") or 0) * 1000))
            volume = max(0.0, min(4.0, float(clip.get("volume", 1))))
            label = f"a{index}"
            filters = [
                f"atrim=start={source_start}:end={source_end}",
                "asetpts=PTS-STARTPTS",
            ]
            fade_in = max(0.0, float(clip.get("fadeIn") or 0))
            fade_out = max(0.0, float(clip.get("fadeOut") or 0))
            clip_duration = max(0.01, source_end - source_start)
            if fade_in > 0 and fade_in < clip_duration:
                filters.append(f"afade=t=in:st=0:d={fade_in}")
            if fade_out > 0 and fade_out < clip_duration:
                filters.append(f"afade=t=out:st={max(0.0, clip_duration-fade_out)}:d={fade_out}")
            filters.extend([f"volume={volume}", f"adelay={offset_ms}|{offset_ms}"])
            filter_parts.append(f"[{audio_input_index}:a]" + ",".join(filters) + f"[{label}]")
            audio_labels.append(f"[{label}]")

        presenter_path = file_paths.get("presenter.webm")
        if presenter_path:
            args += ["-i", str(presenter_path)]
            presenter_index = input_index
            input_index += 1
            pip_width = max(180, int(width * 0.27))
            filter_parts.append(
                f"[{presenter_index}:v]scale={pip_width}:-2,setsar=1[presenter]"
            )
            filter_parts.append(
                f"[0:v][presenter]overlay=W-w-24:H-h-24:eof_action=pass:shortest=0[vout]"
            )
        else:
            filter_parts.append("[0:v]null[vout]")

        if audio_labels:
            # Mix clips on the same timeline; use amix with normalization disabled,
            # then apply a limiter so voice peaks do not clip.
            filter_parts.append(
                "".join(audio_labels)
                + f"amix=inputs={len(audio_labels)}:duration=longest:dropout_transition=0:normalize=0,"
                + "alimiter=limit=0.92:level=disabled,"
                + f"atrim=duration={total_duration},asetpts=PTS-STARTPTS[aout]"
            )
        else:
            # Do not silently render a silent movie when voice/audio clips were expected.
            args += [
                "-f", "lavfi", "-t", str(total_duration),
                "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            ]
            filter_parts.append(
                f"[{input_index}:a]atrim=duration={total_duration},asetpts=PTS-STARTPTS[aout]"
            )

        output = work / "officerlab-final.mp4"
        args += [
            "-filter_complex", ";".join(filter_parts),
            "-map", "[vout]", "-map", "[aout]",
            "-t", str(total_duration),
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-threads", "1", "-pix_fmt", "yuv420p", "-r", "30",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", str(output),
        ]
        run_ffmpeg(args, timeout=max(600, int(total_duration * 20)))
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
