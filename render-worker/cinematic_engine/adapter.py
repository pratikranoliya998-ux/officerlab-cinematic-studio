"""Manifest-driven adapter for the vendored cinematic-film engine.

The adapter deliberately accepts JSON only; it never imports or executes user-supplied Python.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from cinematic_engine.engine import BigText, Card, Counter, Film, Renderer, Route, Doc


def _make_board(path: Path, look: str) -> None:
    palettes = {
        "studio": ((224, 220, 210), (190, 185, 174)),
        "slate": ((23, 34, 48), (9, 15, 25)),
        "night": ((13, 19, 33), (3, 6, 14)),
        "paper": ((239, 231, 214), (205, 195, 175)),
        "blueprint": ((16, 42, 78), (7, 20, 42)),
        "charcoal": ((24, 24, 26), (5, 5, 7)),
        "wall": ((49, 35, 25), (16, 12, 10)),
    }
    top, bottom = palettes.get(look, palettes["studio"])
    w, h = 1024, 1024
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(top[i] * (1-t) + bottom[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    d = ImageDraw.Draw(im, "RGBA")
    for x in range(0, w, 64):
        d.line((x, 0, x, h), fill=(255,255,255,12), width=1)
    for y in range(0, h, 64):
        d.line((0, y, w, y), fill=(255,255,255,10), width=1)
    im.save(path, "PNG")


def render_cinematic(manifest: dict, output: Path, temp_dir: Path) -> None:
    scenes = manifest.get("scenes") or []
    if not scenes or len(scenes) > 60:
        raise ValueError("Cinematic render supports 1 to 60 scenes")
    fps = 24
    durations = []
    for scene in scenes:
        try:
            durations.append(max(2.0, min(45.0, float(scene.get("durationSeconds") or scene.get("duration") or 6))))
        except (TypeError, ValueError):
            durations.append(6.0)
    total = sum(durations)
    if total > 900:
        raise ValueError("Cinematic render is limited to 15 minutes per job")

    look = str(manifest.get("look") or "studio").lower()
    if look not in {"studio", "slate", "night", "paper", "blueprint", "charcoal", "wall"}:
        look = "studio"
    prep = temp_dir / "assets" / "prep"
    prep.mkdir(parents=True, exist_ok=True)
    board_name = {"studio":"studio.png","slate":"slate.png","night":"night.png",
                  "paper":"paper.png","blueprint":"blueprint.png","charcoal":"charcoal.png","wall":"cork_dark.png"}[look]
    _make_board(prep / board_name, look)

    segments = []
    cursor = 0.0
    for i, (scene, duration) in enumerate(zip(scenes, durations), 1):
        segments.append({"id": i, "start": cursor, "end": cursor + duration,
                         "vo": str(scene.get("narration") or scene.get("text") or scene.get("title") or "")})
        cursor += duration
    (temp_dir / "audio").mkdir(exist_ok=True)
    (temp_dir / "audio" / "timing.json").write_text(
        json.dumps({"total_duration": total, "segments": segments}, ensure_ascii=False), encoding="utf-8")
    doc = Doc(temp_dir)
    film = Film(total, fps=fps, look={**__import__("cinematic_engine.engine", fromlist=["LOOKS"]).LOOKS[look], "board": board_name})
    accent = (218, 166, 68)
    card_w, card_h, gap = 3000, 1500, 3900
    xs = [(i - (len(scenes)-1)/2) * gap for i in range(len(scenes))]
    mid = 0.0
    film.add(BigText(str(manifest.get("title") or "OFFICERLAB"), 0, -1900, 560, 0.0,
                     rgb=(246,243,236), type_on=0.8, grunge=False, shadow=True))
    for i, (scene, duration, x) in enumerate(zip(scenes, durations, xs), 1):
        start = sum(durations[:i-1])
        title = str(scene.get("title") or f"SCENE {i:02d}")[:80]
        body = str(scene.get("text") or scene.get("narration") or "")[:220]
        lines = [body[j:j+54] for j in range(0, len(body), 54)][:4]
        film.add(Card(x, 0, card_w, card_h, start + 0.1, title=title, lines=lines,
                      accent=accent, title_size=220, body_size=120))
        if i > 1:
            film.add(Route((xs[i-2] + card_w/2 + 100, 0), (x-card_w/2-100, 0),
                           t_in=start-0.25, dur=0.65, bend=-0.12, width=22, rgb=accent))
        if scene.get("counterValue") is not None:
            try:
                film.add(Counter(x, 1150, 280, int(scene["counterValue"]), start+0.5,
                                 suffix=str(scene.get("counterSuffix") or ""), caption="KEY FACT", rgb=accent))
            except (TypeError, ValueError):
                pass
        film.shot(start, x, 100, 0.48, rot=(-0.35 if i % 2 else 0.35))
        film.shot(start + duration, x, 0, 0.44)
    film.shot(0, mid, -1200, 0.34)
    film.shot(total, mid, 0, 0.28)
    film.fade_in, film.fade_out = 0.7, min(1.5, total/4)

    aspect = str(manifest.get("aspect") or "16:9")
    width, height = (720,1280) if "9:16" in aspect else (960,960) if "1:1" in aspect else (1280,720)
    renderer = Renderer(film, width=width, height=height, doc=doc)
    cmd = ["ffmpeg","-y","-hide_banner","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24",
           "-s",f"{width}x{height}","-r",str(fps),"-i","-","-an","-c:v","libx264","-preset","ultrafast",
           "-crf","21","-pix_fmt","yuv420p","-movflags","+faststart",str(output)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for n in range(int(total * fps)):
            frame = renderer.frame(n)
            proc.stdin.write(np.ascontiguousarray(frame).tobytes())
        proc.stdin.close()
        err = proc.stderr.read().decode("utf-8", "replace")[-3000:]
        code = proc.wait(timeout=max(180, int(total * 15)))
        if code:
            raise RuntimeError(err or "FFmpeg cinematic encoding failed")
    except Exception:
        proc.kill()
        proc.wait()
        raise
