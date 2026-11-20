# 🎞️ Complete Animation System — All 17 Tables Consolidated

One continuous reference. Every table, in build order, from foundation to decision guide.

---

## PART I — Architecture & Foundations

### Table 1: Architecture Overview

| Component | What It Does | Where It Lives | Lines of Code |
|---|---|---|---:|
| AnimationScheduler | Manages all active time-based animations; called every frame | `client/src/mobile/animations.ts` | ~40 |
| Easing functions | Map linear t (0→1) to eased motion curves | `animations.ts` | ~15 |
| Transitions module | Blends two slides over t using a chosen effect | `transitions.ts` | ~80 |
| KenBurns module | Drifts/zooms a single slide over its display duration | `kenBurns.ts` | ~30 |
| LowerThird renderer | Name/title bar that slides in, holds, fades out | `lowerThird.ts` | ~50 |
| ProgressBar renderer | Thin fill bar showing recording progress | `progressBar.ts` | ~10 |
| IntroCard renderer | Animated title screen at recording start | `introCard.ts` | ~40 |
| Compositor draw loop | Calls scheduler + transition + Ken Burns + overlays | `MobileSlideCompositor.tsx` | modified |

### Table 2: Easing Functions

| Name | Curve Shape | Best For | Avoid For |
|---|---|---|---|
| easeOutCubic | Fast start → gentle settle | Transitions, slide-ins, default choice | — |
| easeInOutCubic | Slow → fast → slow | Crossfades, symmetric motion | Directional slides |
| easeOutBack | Overshoots slightly, settles | Lower thirds, logo reveals | Text that must stay legible mid-motion |
| easeOutQuart | Very fast start, long settle | Snappy UI feedback | Cinematic motion |
| linear | Constant speed | Ken Burns drift, progress bar | Anything that "arrives" at a destination |

---

## PART II — Slide Motion

### Table 3: Slide Transitions

| Transition | Visual | Best For | Duration | Easing | Captured in Recording? |
|---|---|---|---:|---|---|
| Crossfade | Old fades out, new fades in | Dense slides, code, math | 450–600ms | easeInOutCubic | ✅ Canvas |
| Slide-left | Old exits left, new enters right (parallax) | Sequential narrative | 400–500ms | easeOutCubic | ✅ Canvas |
| Push-left | Old + new move together as one strip | Chapter changes | 500–650ms | easeInOutCubic | ✅ Canvas |
| Wipe | New reveals left-to-right over old | Before/after, reveals | 350–450ms | easeOutCubic | ✅ Canvas |
| Zoom | Old zooms out + fades; new scales in from 1.05 | Concept shifts, section openers | 550–700ms | easeInOutCubic | ✅ Canvas |

**Transition tuning rules**

| Rule | Value | Reason |
|---|---|---|
| Minimum duration | 350ms | Below this, 30fps capture shows ≤10 frames = visible stepping |
| Maximum duration | 700ms | Above this, motion feels sluggish |
| Professional band | 400–600ms | 12–18 captured frames = smooth |
| Consistency | One type per lesson | Mixed transitions read as amateur |
| Frequency | Per chapter, not per slide | Every-slide transitions distract from content |

### Table 4: Ken Burns Presets

| Preset # | Zoom | Pan X | Pan Y | Feel |
|---:|---|---|---|---|
| 1 | 1.00 → 1.08 | −2% → +2% | −1% → +1% | Drift right, subtle push-in |
| 2 | 1.06 → 1.00 | +2% → −2% | +1% → −1% | Pull-back, drift left |
| 3 | 1.00 → 1.10 | 0% → 0% | +2% → −2% | Vertical push, no lateral drift |
| 4 | 1.05 → 1.00 | 0% → 0% | −2% → +2% | Vertical pull-back |

**Ken Burns rules**

| Parameter | Safe Range | Danger Zone | Why |
|---|---|---|---|
| Zoom delta | 1.00 → 1.10 max | 1.15 | Text starts to swim visibly |
| Pan distance | ±2–3% of canvas width | ±5% | Looks like a mistake, not motion |
| Duration | Full slide display time | Shorter than display time | Motion should span the slide, not stop early |
| Direction alternation | Alternate per slide (presets 1→2→3→4) | Same direction every slide | Eye habituates; motion stops reading as intentional |
| Easing | Linear | easeIn/easeOut | Motion must be constant-speed to feel like a camera move |

---

## PART III — Overlays & Cards

### Table 5: Lower Third Animation Timeline

| Phase | Duration | Animation | Easing | Alpha |
|---|---:|---|---|---|
| Slide-in | 500–700ms | Panel enters from left, 10% overshoot | easeOutBack | Ramps 0→1 |
| Hold | 3000–4000ms | Fully visible, static | — | 1.0 |
| Fade-out | 400–600ms | Panel fades, slight leftward drift | easeOutCubic | Ramps 1→0 |
| Total | ~4.5s | — | — | — |

**Lower third placement**

| Position | Best For | Panel Width | Panel Height | Y Offset |
|---|---|---:|---:|---|
| Bottom-left | Default; leaves PiP area clear | 72% of W | 11% of H | H − 16% |
| Bottom-centre | Full-width talking head | 60% of W | 10% of H | H − 14% |
| Top-left | PiP in bottom-right layouts | 65% of W | 10% of H | 5% of H |

**Lower third content rules**

| Element | Font Weight | Size | Colour | Position |
|---|---:|---|---|---|
| Accent stripe | — | 6px wide | Brand accent | Left edge, full panel height |
| Name (line 1) | 600 | 32% of panel height | #f1f5f9 | x + 24px, y + 38% |
| Title (line 2) | 400 | 24% of panel height | #94a3b8 | x + 24px, y + 72% |
| Panel background | — | — | rgba(15,23,42,0.92) | Full panel, 12px radius |

### Table 6: Intro & Outro Cards

| Element | Intro Timing | Outro Timing | Animation | Easing |
|---|---|---|---|---|
| Background | 0–100% | 0–100% | Static fill | — |
| Title | 0–50% | 0–40% | Slides up from 5% below | easeOutCubic |
| Accent line | 30–70% | 20–60% | Draws from centre outward | easeOutCubic |
| Subtitle | 60–100% | 50–100% | Fades in | easeInOutCubic |
| Logo | 70–100% | 40–100% | Fades + slight scale | easeOutBack |
| Total duration | 1.5–2.0s | 2.0–2.5s | — | — |

**Intro card content fields**

| Field | Font | Size | Colour | Position |
|---|---:|---|---|---|
| Title | 700 | 5.5% of W | #f1f5f9 | Centre, 50% height |
| Accent line | — | 4px tall, 18% W | Brand accent | Centre, 56% height |
| Subtitle | 400 | 2.8% of W | #94a3b8 | Centre, 62% height |

### Table 7: Animated Progress Bar

| Property | Value | Notes |
|---|---|---|
| Height | 4px | Thin enough to not distract |
| Position | Bottom edge (y = H − 4) | Visible but unobtrusive |
| Background track | rgba(255,255,255,0.08) | Barely visible |
| Fill colour | Brand accent | Matches lower third stripe |
| Fill easing | easeOutCubic per update | Smoother than linear increment |
| Update source | elapsed / estimatedTotal | Or timeline position if known |
| Visibility | Optional toggle | Some recordings are better without |

---

## PART IV — Priority & Feature Matrix

### Table 8: Impact Ranking (What to Build First)

| Rank | Feature | Effort | Perceived Quality Gain | Build Order |
|---:|---|---|---|---:|
| 1 | Ken Burns on every slide | 30 min | ⭐⭐⭐⭐⭐ | 1st |
| 2 | Animated lower third per chapter | 1 hour | ⭐⭐⭐⭐⭐ | 2nd |
| 3 | Crossfade transitions (500ms) | 30 min | ⭐⭐⭐⭐ | 3rd |
| 4 | Animated intro card | 1 hour | ⭐⭐⭐⭐ | 4th |
| 5 | Animated progress bar | 15 min | ⭐⭐⭐ | 5th |
| 6 | Zoom transition at chapter boundaries | 30 min | ⭐⭐⭐ | 6th |
| 7 | Subtle PiP frame pulse | 20 min | ⭐⭐ | 7th |
| 8 | Animated outro card | 30 min | ⭐⭐ | 8th |

### Table 9: Complete Feature Matrix

| Animation Type | Render Method | Visible in Preview | Captured in Recording | Effort | Impact |
|---|---|---|---|---|---|
| Ken Burns drift | Canvas | ✅ | ✅ | Low | Very High |
| Crossfade transition | Canvas | ✅ | ✅ | Low | High |
| Slide/push/wipe transition | Canvas | ✅ | ✅ | Low | Medium |
| Zoom transition | Canvas | ✅ | ✅ | Low | Medium |
| Lower third | Canvas | ✅ | ✅ | Medium | Very High |
| Progress bar | Canvas | ✅ | ✅ | Low | Medium |
| Intro card | Canvas | ✅ | ✅ | Medium | High |
| Outro card | Canvas | ✅ | ✅ | Medium | Medium |
| Draggable PiP position | HTML + Canvas | ✅ | ✅ (drawn by loop) | Low | High |
| PiP shape (circle/rounded) | Canvas clip | ✅ | ✅ | Low | Medium |
| Text overlay / caption | Canvas | ✅ | ✅ | Low | Medium |
| Logo watermark | Canvas | ✅ | ✅ | Low | Medium |
| Live annotation drawing | Canvas | ✅ | ✅ | High | Very High |
| Countdown before recording | Canvas or HTML | ✅ | ❌ (stops before recording starts) | Low | High (UX) |
| Audio meter | HTML overlay | ✅ | ❌ (not on canvas) | Low | High (UX) |
| Camera flash/blink | HTML | ✅ | ❌ | Low | Medium |

---

## PART V — Rules & Anti-Patterns

### Table 10: Motion Timing Rules

| Rule | Value | Applies To | Consequence of Violation |
|---|---|---|---|
| Minimum animation duration | 350ms | All transitions | Visible frame stepping at 30fps |
| Maximum animation duration | 700ms | All transitions | Feels sluggish, stretches the recording |
| Sweeter spot for intros | 1.5–2.0s | Intro card | Too short = illegible; too long = annoying |
| Sweeter spot for lower thirds | 4.0–5.0s total | Lower third | Too short = unreadable; too long = clutters frame |
| Simultaneous animations | Max 2 on screen at once | Any | 2 = visual chaos |
| Motion direction consistency | One direction per lesson | Transitions | Mixed directions feel amateur |
| Motion accents per slide | 1 | Any slide | 1 = amateur feel |

### Table 11: What to Avoid

| Anti-Pattern | Why It Fails | Professional Alternative |
|---|---|---|
| Spinning text | Distracts from reading; reads as templated | Fade or slide up |
| Bouncing bullets (each word pops) | Makes text unreadable mid-motion | Reveal whole bullet, or use Ken Burns |
| Flashy wipes used everywhere | Visual noise; nothing feels important | Reserve wipes for reveals only |
| Animated emoji / stickers | Signals amateur content | Static brand marks only |
| Transitions under 300ms | Visible stepping at 30fps | 400–600ms crossfade |
| Transitions over 800ms | Stretches the video, feels broken | 500ms crossfade |
| Multiple animations firing simultaneously | Chaotic, unfocused | Stagger by 200ms minimum |
| Same Ken Burns direction every slide | Eye habituates; motion stops registering | Alternate presets 1→2→3→4 |
| Text that animates while being read | Cannot read moving text | Animate in, then hold static |
| Logo animations during content | Competes with the lecture | Only in intro/outro |

---

## PART VI — Technical Constraints

### Table 12: Stack-Specific Constraints

| Constraint | Value | Implication |
|---|---|---|
| Canvas capture framerate | 30 fps | Transitions < 350ms show stepping |
| Minimum transition duration | 350ms | 10.5 captured frames |
| 400ms transition | 400ms | 12 captured frames; smooth — use this as minimum "professional" duration |
| Text rendering | Must be redrawn every frame during animation | Cached text bitmaps blur during scale |
| roundRect support | Chrome 99+, Safari 16+ | Polyfill with arcTo for older Android WebViews |
| prefers-reduced-motion | Check at compositor init | Disable Ken Burns, use 200ms crossfade if reduce-motion is set |
| Intro/outro timing | Must draw while recording is active | Drawing after recorder.stop() = not captured |
| Canvas draw cost | fillText at 1080p is cheap | Don't cache text as images during animations |

### Table 13: prefers-reduced-motion Degradation

| Feature | Normal Mode | Reduced-Motion Mode |
|---|---|---|
| Ken Burns | Enabled with presets | Disabled (static slide) |
| Transitions | 400–700ms | 200ms crossfade only |
| Lower third slide-in | easeOutBack with overshoot | Simple fade in |
| Intro card | Full animation timeline | Static, 1s hold |
| Progress bar | Animated fill | Instant fill |
| PiP pulse | Enabled | Disabled |

---

## PART VII — Implementation

### Table 14: Implementation Order

| Step | Task | Time Estimate | Prerequisite | Shippable Alone? |
|---:|---|---|---|---|
| 1 | AnimationScheduler class | 30 min | — | ⚠️ Foundation only |
| 2 | Ken Burns | 30 min | Step 1 | ✅ Yes |
| 3 | Crossfade transition | 30 min | Step 1 | ✅ Yes |
| 4 | Animated lower third | 1 hour | Step 1 | ✅ Yes |
| 5 | Progress bar | 15 min | Step 1 | ✅ Yes |
| 6 | Intro card | 1 hour | Step 1 | ✅ Yes |
| 7 | Outro card | 30 min | Step 1 | ✅ Yes |
| 8 | Additional transitions (slide/push/wipe/zoom) | 2 hours | Step 3 stable | ✅ Yes |

---

## PART VIII — Registry & Audit

### Table 15: Component Registry (All Animation Types)

| Animation ID | Trigger | Duration | Easing | Canvas Layer | Configurable? |
|---|---|---:|---|---|---|
| intro | Recording start | 1.5–2.0s | easeOutCubic | Bottom layer | Title, subtitle, accent |
| slide-transition | Next/Prev button | 400–600ms | Per-type | Slides layer | Type, duration |
| ken-burns | Slide settled | Slide display time | Linear | Slides layer | Preset per slide |
| lower-third-in | Chapter start | 600ms | easeOutBack | Overlay layer | Name, title, colour |
| lower-third-out | 3–4s after in | 500ms | easeOutCubic | Overlay layer | — |
| progress-bar | Every frame | Continuous | easeOutCubic | Bottom bar | Accent colour |
| pip-pulse | Continuous | 3s loop | easeInOutCubic | PiP layer | Toggle on/off |
| outro | Before stop | 2.0–2.5s | easeOutCubic | Bottom layer | Title, next topic |
| countdown | Before recording | 3s | Linear (preview only) | 3 / 5 / 10 seconds | — |
| audio-meter | During recording | Continuous | — | HTML overlay | — |
| camera-flash | Frame captured | 150ms | easeOutCubic (preview only) | — | — |

### Table 16: Professional vs. Amateur Signal Audit

| Signal | Amateur | Professional |
|---|---|---|
| Slide motion | Static, or jittery | Slow Ken Burns drift |
| Slide cuts | Hard cuts | 500ms crossfade |
| Name display | None, or static text | Animated lower third |
| Start of video | Immediate content | 1.5s animated intro card |
| End of video | Abrupt stop | 2s outro card |
| Progress cue | None | Thin animated bar |
| Motion budget | Many animations, fast | Few animations, slow |
| Direction consistency | Mixed | One direction per lesson |
| Typography motion | Scaling / rotating | Slide + fade only |
| Emoji / stickers | Yes | No |

---

## PART IX — Decision Guide

### Table 17: Quick Decision Guide

| Your Question | Answer | Table to Check |
|---|---|---|
| Where do I start? | Ken Burns + crossfade | Table 8, Table 14 |
| How long should transitions be? | 400–600ms | Table 3, Table 10 |
| Which transition type? | Crossfade default; zoom for chapters | Table 3 |
| How much zoom on Ken Burns? | Max 1.10x | Table 4 |
| How big should lower third be? | 72% W × 11% H, bottom-left | Table 5 |
| What goes on the intro card? | Title + accent line + subtitle | Table 6 |
| What should I NOT do? | Spinning text, bouncing bullets | Table 11 |
| Will this run on Android? | Yes at 30fps, avoid <350ms transitions | Table 12 |
| How do I handle reduced motion? | Disable Ken Burns, 200ms crossfade | Table 13 |
| What's the render path? | All canvas — captured in recording | Table 9 |

---

## 🔑 The Three Rules That Summarize All 17 Tables

| # | Rule | Tables |
|---:|---|---|
| 1 | Canvas draws everything — if it's not on canvas, it's not in the video | 1, 9, 12 |
| 2 | 400–600ms transitions, linear Ken Burns, one motion accent per slide | 3, 4, 10 |
| 3 | Ship Ken Burns + lower third first — 80% of perceived quality, 20% of effort | 8, 14, 16 |

---

**Project reference:** `ANIMATION-SPEC.md` is the consolidated animation design reference. Treat it as the source specification for future animation decisions; check the live Recorder implementation before assuming a listed component is still unimplemented.
