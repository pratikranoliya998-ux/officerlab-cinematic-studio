import React, { useMemo, useState } from "react";
import {
  ArrowLeft, BookOpen, Check, ChevronDown, Clock3, Copy, Download,
  FileJson, Film, Layers, Palette, Search, Sparkles
} from "lucide-react";
import "./scene-designer.css";

const STYLE_LIBRARY = [
  { id:"handdrawn", name:"Hand-drawn, sketch & comic", count:22, icon:"✏️", description:"Pencil lines, whiteboard sketches, halftone comics and human-made frame-by-frame motion.", recipe:"Use a warm paper-like canvas, visible pencil or ink linework, controlled hatching, hand-drawn arrows and imperfect but consistent strokes. Animate marks as if they are being drawn in real time. Use restrained accent colors and preserve legibility." },
  { id:"collage", name:"Collage, cutout & sand", count:6, icon:"🧩", description:"Layered paper, cutout shapes, silhouettes, sand and handmade textures.", recipe:"Build the scene from layered paper cutouts, torn edges, tactile shadows and carefully limited textures. Animate elements with stop-motion-like steps, sliding layers and silhouette reveals. Keep labels on clean, high-contrast paper panels." },
  { id:"pixel", name:"Pixel art", count:22, icon:"👾", description:"Crisp 8-bit and 16-bit sprites, tile maps and retro game-inspired motion.", recipe:"Use a strict integer pixel grid, a limited palette, hard pixel edges and nearest-neighbour scaling. Animate with sprite-like frame changes and deliberate step timing. Disable smoothing and avoid gradients or anti-aliased outlines." },
  { id:"cartoon", name:"Flat cartoon", count:43, icon:"🎨", description:"Friendly vector characters, bold shapes and clear visual metaphors.", recipe:"Use simple vector geometry, confident outlines, flat color blocks and a consistent character design system. Animate with readable poses, squash-and-stretch used sparingly, clean 2D parallax and minimal background clutter." },
  { id:"cinematic3d", name:"Cinematic 3D", count:82, icon:"🎬", description:"Immersive three-dimensional scenes, realistic lighting and controlled camera moves.", recipe:"Create a coherent 3D environment with believable scale, physically based materials, purposeful depth, soft volumetric lighting and cinematic composition. Use a deliberate dolly, orbit or macro push-in; keep the subject readable and avoid decorative camera motion." },
  { id:"lowpoly", name:"Low-poly & voxel", count:32, icon:"🧊", description:"Isometric worlds, faceted geometry, voxel objects and compact environments.", recipe:"Use a consistent low-poly or voxel construction language, simple faceted geometry, controlled ambient occlusion and an isometric or orthographic camera. Group objects by function and animate processes in clearly separated stages." },
  { id:"generative", name:"Generative & neon", count:34, icon:"✨", description:"Procedural geometry, particle fields, luminous gradients and shader-driven visuals.", recipe:"Use procedural shapes, particle systems, restrained neon accents and smooth shader-like transitions against a dark or neutral field. Make every glow support hierarchy; reserve the brightest effects for the central concept and key transitions." },
  { id:"typography", name:"Kinetic typography", count:52, icon:"🔠", description:"Words, numbers and definitions become the main animated visual subject.", recipe:"Treat typography as the primary visual actor. Stage words by meaning, hierarchy and reading order; use precise entrance, emphasis and exit timing. Keep Gujarati glyphs intact with a Gujarati-capable font such as Noto Sans Gujarati, and never distort or split letterforms." },
  { id:"productui", name:"Product UI promo", count:80, icon:"🖥️", description:"Polished interface walkthroughs, product screens and feature demonstrations.", recipe:"Use a clean interface frame, consistent spacing, realistic cursor or touch interactions, focused zooms and clear before/after states. Highlight only one interface action at a time. Keep labels, controls and data crisp rather than ornamental." },
  { id:"retro", name:"Retro, terminal & old film", count:5, icon:"📼", description:"Archival documentary mood, terminal screens, CRT and vintage film treatments.", recipe:"Use a restrained archival palette, subtle grain, gentle flicker, period-appropriate typography or terminal motifs. Keep all texture effects subtle enough that facts and captions remain sharp and accessible." },
  { id:"explainer", name:"Explainers & data viz", count:38, icon:"📊", description:"Diagrams, data, maps, timelines, labelled systems and step-by-step explanations.", recipe:"Prioritize explanatory clarity: one concept per shot, clean grids, accurate labels, consistent iconography, visible directional arrows and staged diagram builds. Animate relationships and cause-and-effect, not just the objects. Make all figures traceable to supplied sources." },
  { id:"photoreal", name:"Photoreal & live action", count:9, icon:"📷", description:"Documentary-style real-world scenes, natural materials and credible camera work.", recipe:"Use physically credible people, objects and environments, natural motivated lighting, realistic lens behavior and documentary camera movement. Avoid synthetic-looking faces, impossible anatomy and invented logos, signage or evidence." }
];

const USE_CASES = [
  { name:"Product & Brand Videos", count:86, file:"product-brand.md" },
  { name:"Motion Graphics & Typography", count:242, file:"motion-graphics.md" },
  { name:"UI & Web Animation", count:19, file:"ui-web.md" },
  { name:"Explainers & Education", count:91, file:"explainers.md" },
  { name:"Music & Storytelling", count:35, file:"music-storytelling.md" },
  { name:"3D Worlds & Simulations", count:176, file:"3d-scenes.md" },
  { name:"Games & Interactive Experiences", count:102, file:"games-interactive.md" }
];

const ENGINE_OPTIONS = [
  { value:"Remotion (React)", command:"npx remotion render src/index.ts Main out/officerlab-scene.mp4 --codec h264" },
  { value:"Manim (Python)", command:"manim -qh scene.py MainScene -o officerlab-scene.mp4" },
  { value:"Three.js (WebGL)", command:"Capture deterministic frames with Playwright, then encode with FFmpeg using H.264." },
  { value:"Blender (3D)", command:"Render a numbered image sequence in background mode, then encode the sequence and audio with FFmpeg." },
  { value:"HTML Canvas / SVG", command:"Render fixed-time frames in a browser with Playwright, then encode with FFmpeg using H.264." }
];

const STAGES = {
  3: [
    ["Opening hook", "Present a familiar real-world question or problem that makes the topic matter."],
    ["Core explanation", "Reveal the central idea with a clear visual model and explain the parts and their relationships."],
    ["Exam-ready takeaway", "Consolidate the key definition, distinction or takeaway without adding unsupported facts."]
  ],
  5: [
    ["Opening hook", "Create a concise real-world question or problem that makes the topic matter."],
    ["Concept foundation", "Introduce the correct definition, context and key terms."],
    ["How it works", "Show the mechanism, sequence, institutional relationship or cause-and-effect."],
    ["Example / application", "Apply the concept to a realistic example grounded in the supplied notes."],
    ["Exam recall", "Close with the most important distinction, fact or revision cue."]
  ],
  7: [
    ["Opening hook", "Create a real-world question or problem that makes the topic matter."],
    ["Context and background", "Establish the setting and explain why the concept emerged."],
    ["Definition and core terms", "Introduce the precise definition and technical vocabulary."],
    ["Main structure", "Show components, authorities, stages or relationships."],
    ["Process / mechanism", "Animate how the system works, step by step."],
    ["Example and exam trap", "Demonstrate an application and clarify a common confusion, if supported by sources."],
    ["Rapid revision", "Summarize the verified takeaways in a crisp, memorable final frame."]
  ]
};

function makeScenes(data) {
  const stages = STAGES[data.sceneCount] || STAGES[5];
  const total = Math.max(15, Number(data.duration) || 90);
  const weights = stages.map((_, index) => index === stages.length - 1 ? 1.15 : 1);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let used = 0;
  return stages.map((stage, index) => {
    const seconds = index === stages.length - 1 ? total - used : Math.max(3, Math.round(total * weights[index] / weightTotal));
    used += seconds;
    const overlay = index === 0 ? data.topic : index === stages.length - 1 ? "EXAM RECALL" : stage[0].toUpperCase();
    return {
      number:index + 1,
      title:stage[0],
      purpose:stage[1],
      seconds,
      overlay,
      visualDirection:data.style.recipe,
      cameraDirection:index === 0 ? "Begin with a deliberate establishing shot, then move toward the key subject." : index === stages.length - 1 ? "Settle into a stable, readable composition for the final takeaway." : "Use one motivated push-in, orbit, pan or diagram reveal; avoid unnecessary camera movement.",
      motionDirection:index === 0 ? "Reveal the central subject in two or three readable beats." : index === stages.length - 1 ? "Bring verified takeaways on screen in a clear hierarchy and hold long enough to read." : "Animate the relationship between the elements in a clear left-to-right or top-to-bottom sequence.",
      narrationDirection:"Use the supplied narration/script where provided. Otherwise draft concise Gujarati narration with English technical terms, then verify every factual statement against the supplied source notes.",
      transition:index === stages.length - 1 ? "Resolve cleanly to the closing frame." : "Use a visual match cut or a short directional transition that preserves continuity."
    };
  });
}

function scenePrompt(data, scene) {
  return [
    "OFFICERLAB — SINGLE SCENE PRODUCTION PROMPT",
    "Create scene " + scene.number + " of " + data.sceneCount + " for a factual educational video.",
    "",
    "TOPIC: " + data.topic,
    "LEARNING OBJECTIVE: " + data.objective,
    "AUDIENCE: " + data.audience,
    "NARRATION LANGUAGE: " + data.language,
    "VISUAL STYLE: " + data.style.name,
    "STYLE RECIPE: " + data.style.recipe,
    "SCENE: " + scene.title + " (" + scene.seconds + " seconds)",
    "PURPOSE: " + scene.purpose,
    "ON-SCREEN ANCHOR: " + scene.overlay,
    "CAMERA: " + scene.cameraDirection,
    "MOTION: " + scene.motionDirection,
    "NARRATION: " + scene.narrationDirection,
    "TRANSITION: " + scene.transition,
    "",
    "SOURCE NOTES / VERIFIED FACTS:",
    data.sourceFacts || "No source notes supplied. Do not invent dates, statistics, legal sections, quotations, names or technical claims. Mark any fact that needs checking as [VERIFY].",
    "",
    "SCRIPT / NARRATION INPUT:",
    data.script || "Write a concise, natural Gujarati explanation with English technical terms. Keep the narration synchronized to the scene duration.",
    "",
    "PRODUCTION RULES:",
    "- Use only the facts supplied above. Do not create fake citations, official seals, government logos, data or quotations.",
    "- Keep the scene focused on one learning point. Do not overload the frame with text.",
    "- Render Gujarati text with a Gujarati-capable font (prefer Noto Sans Gujarati) and preserve correct conjuncts, matras and line breaks.",
    "- Keep English technical terms spelled exactly; highlight important definitions and exam-relevant phrases.",
    "- Use readable contrast, safe margins and deliberate pacing; hold important labels long enough to read.",
    "- Maintain the selected visual style, palette, typography and visual continuity across the full lesson.",
    "- Do not imitate a living artist or copy a specific creator's finished work. Create an original scene using the style recipe.",
    "",
    "ENGINE: " + data.engine.value,
    "DELIVERABLE: executable scene source for the selected engine, plus assets list, timing notes and a clean H.264 MP4 export path."
  ].join("\n");
}

function masterPrompt(data, scenes) {
  const sceneOutline = scenes.map(scene =>
    "SCENE " + scene.number + " — " + scene.title + " — " + scene.seconds + " sec\n" +
    "Purpose: " + scene.purpose + "\n" +
    "Visual: " + scene.visualDirection + "\n" +
    "Camera: " + scene.cameraDirection + "\n" +
    "Motion: " + scene.motionDirection + "\n" +
    "Screen anchor: " + scene.overlay + "\n" +
    "Transition: " + scene.transition
  ).join("\n\n");
  const chosenEngine = ENGINE_OPTIONS.find(item => item.value === data.engine.value) || ENGINE_OPTIONS[0];
  return [
    "OFFICERLAB CINEMATIC EXPLAINER — MASTER PRODUCTION PROMPT",
    "",
    "ROLE",
    "Act as a senior educational film director, instructional designer and creative-coding engineer. Plan and implement an original, source-grounded educational explainer. Do not merely describe an idea: produce working source code for the chosen engine and a reproducible MP4 render workflow.",
    "",
    "PROJECT BRIEF",
    "Topic: " + data.topic,
    "Learning objective: " + data.objective,
    "Audience: " + data.audience,
    "Narration language: " + data.language,
    "Target duration: " + data.duration + " seconds",
    "Scene count: " + data.sceneCount,
    "Aspect ratio: " + data.aspect,
    "Visual style: " + data.style.name,
    "Engine: " + data.engine.value,
    "Brand direction: OfficerLab editorial look — deep navy, warm gold accents, clean educational typography and restrained cinematic lighting.",
    "",
    "STYLE LOCK",
    data.style.recipe,
    "Apply this look consistently across every scene. Avoid mixing unrelated styles.",
    "",
    "FACTUAL ACCURACY",
    "Use only the source notes below as factual authority. Do not invent legal sections, article numbers, statistics, dates, institutional structures, quotations or examples. If a factual detail is missing, insert [VERIFY] and list it in a fact-check checklist before final rendering.",
    "SOURCE NOTES:\n" + (data.sourceFacts || "[No source notes supplied — factual claims must be verified before publication.]"),
    "",
    "NARRATION AND TYPOGRAPHY",
    "Use " + data.language + ". Preserve technical English terms exactly and explain them in natural Gujarati. Use a Gujarati-capable font such as Noto Sans Gujarati. Do not rasterize text prematurely; preserve correct Gujarati glyph shaping. Keep captions concise and synchronized to scene timing.",
    "SCRIPT INPUT:\n" + (data.script || "[Write original narration only after checking the verified source notes.]"),
    "",
    "SCENE-BY-SCENE STORYBOARD",
    sceneOutline,
    "",
    "GLOBAL MOTION AND EDITING RULES",
    "- One principal learning idea per scene; use transitions to show relationships, not to decorate.",
    "- Use smooth easing, stable object continuity, purposeful camera movement and readable pacing.",
    "- Keep all text inside title-safe margins. Use high contrast and avoid tiny labels.",
    "- Give each scene a clear opening state, transformation and settled end state.",
    "- Use original diagrams and visual metaphors. Label metaphors when they could be mistaken for factual evidence.",
    "- Mix narration, subtle ambience and restrained sound effects; never let music compete with speech.",
    "- Provide a silent-caption-safe version of every important spoken fact.",
    "",
    "TECHNICAL OUTPUT",
    "Create a complete, runnable project for " + data.engine.value + ". Target " + data.aspect + " at 1920x1080 for 16:9 or 1080x1920 for 9:16, 30 fps, H.264 MP4, with AAC audio. Use the correct dimensions for the selected aspect ratio.",
    "Suggested render command / pipeline: " + chosenEngine.command,
    "Deliver: source files, scene assets, narration/caption timing, a fact-check checklist, and the final MP4. If external dependencies or assets are required, document them and provide an offline-safe fallback where practical.",
    "",
    "FINAL QUALITY CHECK",
    "Before export, verify factual claims against source notes, test Gujarati font rendering, confirm scene durations add up to " + data.duration + " seconds, check that no captions are cropped, and play the full MP4 from beginning to end."
  ].join("\n");
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type:mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ScenePromptStudio({ onBack }) {
  const [topic,setTopic] = useState("Food Safety and Standards Act, 2006");
  const [objective,setObjective] = useState("Explain the topic accurately, show how its main provisions or mechanisms work, and help aspirants remember exam-relevant facts.");
  const [audience,setAudience] = useState("GPSC / GSSSB competitive-exam aspirants");
  const [language,setLanguage] = useState("Gujarati narration + English technical terms");
  const [duration,setDuration] = useState(90);
  const [sceneCount,setSceneCount] = useState(5);
  const [aspect,setAspect] = useState("16:9 YouTube landscape");
  const [engine,setEngine] = useState("Remotion (React)");
  const [script,setScript] = useState("");
  const [sourceFacts,setSourceFacts] = useState("");
  const [styleId,setStyleId] = useState("explainer");
  const [styleQuery,setStyleQuery] = useState("");
  const [scenes,setScenes] = useState([]);
  const [activeScene,setActiveScene] = useState(0);
  const [prompt,setPrompt] = useState("");
  const [hasBuilt,setHasBuilt] = useState(false);
  const [notice,setNotice] = useState("");

  const selectedStyle = STYLE_LIBRARY.find(style => style.id === styleId) || STYLE_LIBRARY[10];
  const selectedEngine = ENGINE_OPTIONS.find(item => item.value === engine) || ENGINE_OPTIONS[0];
  const filteredStyles = useMemo(() => STYLE_LIBRARY.filter(style =>
    (style.name + " " + style.description).toLowerCase().includes(styleQuery.toLowerCase())
  ), [styleQuery]);

  const projectData = {
    topic, objective, audience, language, duration:Number(duration), sceneCount:Number(sceneCount),
    aspect, engine:selectedEngine, style:selectedStyle, script, sourceFacts
  };

  function build() {
    const safeData = { ...projectData, duration:Math.max(15,Math.min(600,Number(duration) || 90)) };
    const generated = makeScenes(safeData).map(scene => ({ ...scene, prompt:scenePrompt(safeData,scene) }));
    setScenes(generated);
    setPrompt(masterPrompt(safeData,generated));
    setActiveScene(0);
    setHasBuilt(true);
    setNotice("Scene blueprint created. Review factual notes and prompts before production.");
  }

  async function copyContent(content, label) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const input = document.createElement("textarea");
        input.value = content;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setNotice(label + " copied to clipboard.");
    } catch (error) {
      setNotice("Clipboard permission unavailable. Select the prompt text and copy it manually.");
    }
  }

  function exportBlueprint() {
    const data = {
      format:"officerlab-scene-blueprint",
      version:1,
      createdAt:new Date().toISOString(),
      project:{
        topic, objective, audience, language, duration:Number(duration), sceneCount:Number(sceneCount),
        aspect, engine:engine, visualStyle:{ id:selectedStyle.id, name:selectedStyle.name, recipe:selectedStyle.recipe },
        sourceFacts, narrationScript:script
      },
      scenes
    };
    downloadText("officerlab-scene-blueprint.json",JSON.stringify(data,null,2),"application/json");
    setNotice("Blueprint JSON exported. This is a creative brief, not a Render Worker job manifest.");
  }

  function exportPrompt() {
    downloadText("officerlab-production-prompt.md",prompt,"text/markdown;charset=utf-8");
    setNotice("Master production prompt downloaded.");
  }

  const active = scenes[activeScene] || null;

  return (
    <div className="scene-designer-app">
      <header className="scene-designer-topbar">
        <button className="scene-back-btn" onClick={onBack} type="button"><ArrowLeft size={16}/> Presenter Studio</button>
        <div className="scene-brand-lockup"><span className="scene-brand-emblem">OL</span><span><b>OFFICERLAB</b><small>CINEMATIC SCENE DESIGNER</small></span></div>
        <div className="scene-source-links">
          <a href="https://github.com/LeaddeOpenLab/awesome-opus-5-5-video-prompts" target="_blank" rel="noreferrer">Prompt library <span>↗</span></a>
          <a href="https://github.com/HiAPIAI/awesome-opus-5-5-video-styles" target="_blank" rel="noreferrer">Style recipes <span>↗</span></a>
        </div>
      </header>

      <main className="scene-designer-main">
        <section className="scene-hero">
          <div className="scene-hero-copy">
            <span className="scene-eyebrow"><Sparkles size={13}/> EDUCATIONAL VIDEO PRODUCTION WORKSPACE</span>
            <h1>Turn every lesson into a <em>cinematic explainer.</em></h1>
            <p>Build scene-by-scene visual direction, motion prompts and production instructions for OfficerLab lectures. Designed for Gujarati explanations with precise English technical terminology.</p>
            <div className="scene-hero-tags"><span>12 visual styles</span><span>7 prompt collections</span><span>3–7 scene storyboards</span><span>MP4-oriented workflow</span></div>
          </div>
          <div className="scene-hero-art" aria-hidden="true">
            <div className="scene-art-orbit orbit-one"></div><div className="scene-art-orbit orbit-two"></div>
            <div className="scene-art-core"><Film size={42}/><b>SCENE</b><small>DESIGN</small></div>
            <div className="scene-art-chip chip-one">3D</div><div className="scene-art-chip chip-two">MOTION</div><div className="scene-art-chip chip-three">EXPLAIN</div>
          </div>
        </section>

        <div className="scene-workspace-grid">
          <section className="scene-panel scene-brief-panel">
            <div className="scene-panel-heading"><div><span className="scene-eyebrow">01 · PROJECT BRIEF</span><h2>What are we teaching?</h2><p>Set the learning goal and factual source notes before choosing the look.</p></div><BookOpen size={21}/></div>
            <div className="scene-form-grid">
              <label className="scene-field scene-field-wide">Lecture topic<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Food Safety and Standards Act, 2006"/></label>
              <label className="scene-field scene-field-wide">Learning objective<textarea rows="2" value={objective} onChange={e=>setObjective(e.target.value)} placeholder="What should learners understand after this video?"/></label>
              <label className="scene-field">Target audience<input value={audience} onChange={e=>setAudience(e.target.value)}/></label>
              <label className="scene-field">Narration language<select value={language} onChange={e=>setLanguage(e.target.value)}><option>Gujarati narration + English technical terms</option><option>Gujarati only</option><option>English narration</option><option>Hindi narration + English technical terms</option><option>Gujarati-English bilingual dialogue</option></select></label>
              <label className="scene-field">Duration (seconds)<input type="number" min="15" max="600" value={duration} onChange={e=>setDuration(e.target.value)}/></label>
              <label className="scene-field">Storyboard size<select value={sceneCount} onChange={e=>setSceneCount(Number(e.target.value))}><option value="3">3 scenes · concise</option><option value="5">5 scenes · standard</option><option value="7">7 scenes · detailed</option></select></label>
              <label className="scene-field">Video format<select value={aspect} onChange={e=>setAspect(e.target.value)}><option>16:9 YouTube landscape</option><option>9:16 YouTube Shorts / Reels</option><option>1:1 square social video</option></select></label>
              <label className="scene-field">Creative / rendering engine<select value={engine} onChange={e=>setEngine(e.target.value)}>{ENGINE_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.value}</option>)}</select></label>
              <label className="scene-field scene-field-wide">Narration / draft script<textarea rows="4" value={script} onChange={e=>setScript(e.target.value)} placeholder="Paste your Gujarati narration or lecture script. Leave blank to ask your coding agent to draft only after checking sources."/></label>
              <label className="scene-field scene-field-wide">Verified source notes, facts, sections and figures<textarea rows="5" value={sourceFacts} onChange={e=>setSourceFacts(e.target.value)} placeholder="Paste verified facts, official source extracts, section numbers, statistics and URLs. The prompt will instruct the model not to invent missing facts."/></label>
            </div>
            <div className="scene-accuracy-note"><span>✓</span><div><b>Fact-check guardrail is on</b><small>Missing evidence is marked [VERIFY]. The prompt explicitly prohibits invented laws, statistics, dates, citations and official logos.</small></div></div>
          </section>

          <aside className="scene-panel scene-style-panel">
            <div className="scene-panel-heading"><div><span className="scene-eyebrow">02 · VISUAL DIRECTION</span><h2>Choose a visual style</h2><p>Select one consistent look for the lesson.</p></div><Palette size={21}/></div>
            <label className="scene-search"><Search size={15}/><input value={styleQuery} onChange={e=>setStyleQuery(e.target.value)} placeholder="Search 12 visual styles"/></label>
            <div className="scene-style-grid">
              {filteredStyles.map(style=>(
                <button type="button" key={style.id} className={"scene-style-card " + (styleId===style.id?"selected":"")} onClick={()=>setStyleId(style.id)}>
                  <span className="scene-style-icon">{style.icon}</span><span className="scene-style-meta"><b>{style.name}</b><small>{style.count} style examples</small></span>{styleId===style.id&&<Check size={15}/>}
                </button>
              ))}
            </div>
            <div className="scene-style-recipe"><div><span className="scene-recipe-label">SELECTED STYLE RECIPE</span><b>{selectedStyle.name}</b></div><p>{selectedStyle.recipe}</p><small>{selectedStyle.description}</small></div>
            <div className="scene-library-note"><Layers size={16}/><span>Inspired by the public style taxonomy; these OfficerLab recipes are original production guidance, not copied prompt entries.</span></div>
          </aside>
        </div>

        <section className="scene-source-panel">
          <div className="scene-panel-heading"><div><span className="scene-eyebrow">REFERENCE LIBRARIES</span><h2>Browse by production use case</h2><p>Open the original collections for examples, previews, required inputs and tools.</p></div><BookOpen size={21}/></div>
          <div className="scene-usecase-grid">
            {USE_CASES.map(item=>(
              <a key={item.file} href={"https://github.com/LeaddeOpenLab/awesome-opus-5-5-video-prompts/blob/main/data/categories/"+item.file} target="_blank" rel="noreferrer" className="scene-usecase-card">
                <b>{item.name}</b><span>{item.count} curated examples</span><small>Browse collection ↗</small>
              </a>
            ))}
          </div>
        </section>

        <section className="scene-build-panel">
          <div className="scene-build-copy"><span className="scene-eyebrow">03 · STORYBOARD & PROMPT BUILDER</span><h2>Generate your production blueprint</h2><p>Create timed scenes, visual directions, camera moves, transitions and a master prompt for your selected engine.</p></div>
          <button type="button" className="scene-build-btn" onClick={build}><Sparkles size={17}/> Build scene blueprint</button>
        </section>

        {hasBuilt&&(
          <section className="scene-results">
            <div className="scene-results-heading"><div><span className="scene-eyebrow">04 · PRODUCTION OUTPUT</span><h2>{topic} <small>· {duration}s · {scenes.length} scenes</small></h2><p>Review the storyboard, copy scene prompts individually, or export the complete brief.</p></div><div className="scene-output-actions"><button type="button" onClick={()=>copyContent(prompt,"Master prompt")}><Copy size={15}/> Copy master prompt</button><button type="button" onClick={exportPrompt}><Download size={15}/> Prompt .md</button><button type="button" onClick={exportBlueprint}><FileJson size={15}/> Blueprint JSON</button></div></div>
            <div className="scene-results-grid">
              <div className="scene-timeline-list">
                <div className="scene-timeline-title"><span>SCENE TIMELINE</span><span>{scenes.reduce((sum,scene)=>sum+scene.seconds,0)} sec total</span></div>
                {scenes.map((scene,index)=>(
                  <button type="button" key={scene.number} className={"scene-timeline-item "+(activeScene===index?"active":"")} onClick={()=>setActiveScene(index)}>
                    <span className="scene-index">{String(scene.number).padStart(2,"0")}</span><span className="scene-timeline-copy"><b>{scene.title}</b><small>{scene.purpose}</small></span><span className="scene-duration"><Clock3 size={12}/>{scene.seconds}s</span>
                  </button>
                ))}
                <div className="scene-total-time">Target runtime <b>{scenes.reduce((sum,scene)=>sum+scene.seconds,0)} seconds</b></div>
              </div>
              {active&&<div className="scene-detail-card">
                <div className="scene-detail-top"><div><span className="scene-eyebrow">SCENE {String(active.number).padStart(2,"0")} · {active.seconds} SECONDS</span><h3>{active.title}</h3></div><button type="button" onClick={()=>copyContent(active.prompt,"Scene prompt")}><Copy size={14}/> Copy scene prompt</button></div>
                <div className="scene-detail-visual"><div className="scene-visual-tag">{selectedStyle.name}</div><b>{active.overlay}</b><small>{active.visualDirection}</small><div className="scene-visual-footer"><span>CAMERA · {active.cameraDirection}</span><span>MOTION · {active.motionDirection}</span></div></div>
                <pre className="scene-code-preview">{active.prompt}</pre>
              </div>}
            </div>
            <div className="scene-master-panel"><div className="scene-master-heading"><div><span className="scene-eyebrow">MASTER PROMPT</span><h3>Complete production instructions</h3></div><button type="button" onClick={()=>copyContent(prompt,"Master prompt")}><Copy size={14}/> Copy all</button></div><pre>{prompt}</pre></div>
          </section>
        )}

        <section className="scene-handoff">
          <div><span className="scene-eyebrow">FINAL STEP · EXISTING OFFICERLAB WORKFLOW</span><h2>From prompt to your Presenter Studio</h2><p>Use the master prompt with your chosen coding/video agent to create scene assets and render the MP4. Then return to Presenter Studio to record or import the finished media. The current browser app does not call Claude Opus automatically.</p></div>
          <button type="button" onClick={onBack}><ArrowLeft size={16}/> Back to Presenter Studio</button>
        </section>
        {notice&&<div className="scene-toast" role="status">{notice}</div>}
        <footer className="scene-designer-footer">OFFICERLAB · THE BUREAUCRAT BLUEPRINT · Creative prompt builder · Review sources and rendered output before publishing.</footer>
      </main>
    </div>
  );
}
