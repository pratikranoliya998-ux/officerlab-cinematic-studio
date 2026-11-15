import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Aperture, AudioLines, Captions, Check, ChevronDown, Clapperboard, Download,
  FileText, Film, FolderOpen, LayoutDashboard, Mic, MonitorPlay, Play, Plus,
  Radio, Settings, Sparkles, Square, Upload, Video, Volume2, WandSparkles, Pause,
  Webcam, X
} from "lucide-react";
import "./style.css";

const starter = `નમસ્કાર મિત્રો! OfficerLab માં આપનું સ્વાગત છે.
આજે આપણે ભારતીય બંધારણના મૂળભૂત અધિકારો વિશે સમજવાના છીએ.
મૂળભૂત અધિકારો નાગરિકોના સર્વાંગી વિકાસ અને લોકશાહી વ્યવસ્થાનું રક્ષણ કરે છે.
ભારતીય બંધારણના ભાગ 3 માં કલમ 12 થી 35 સુધી મૂળભૂત અધિકારોની જોગવાઈ કરવામાં આવી છે.
ચાલો, હવે દરેક અધિકારને ઉદાહરણ સાથે સમજીએ.`;

const initialScenes = [
  { id: 1, title: "Opening Hook", kind: "Title card", duration: "00:08", text: "ભારતીય બંધારણ\nમૂળભૂત અધિકારો", accent: "gold" },
  { id: 2, title: "Concept Overview", kind: "Explainer", duration: "00:18", text: "Fundamental Rights\nPart III | Articles 12–35", accent: "blue" },
  { id: 3, title: "Key Takeaway", kind: "Highlight", duration: "00:12", text: "નાગરિકોના અધિકારો\nઅને લોકશાહીનું રક્ષણ", accent: "purple" }
];

function App() {
  const [active, setActive] = useState("studio");
  const [project, setProject] = useState("Fundamental Rights | GPSC");
  const [script, setScript] = useState(starter);
  const [scenes, setScenes] = useState(initialScenes);
  const [selected, setSelected] = useState(1);
  const [theme, setTheme] = useState("midnight");
  const [status, setStatus] = useState("Ready to create");
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [exportedVideoUrl, setExportedVideoUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [captions, setCaptions] = useState(true);
  const [quality, setQuality] = useState("1080p");
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSetup, setVideoSetup] = useState({title:"",topic:"",category:"GPSC / GSSSB",exam:"GPSC Class 1-2",language:"Gujarati + English",duration:"10",aspect:"16:9 YouTube",style:"Cinematic explainer",presenter:"Graphics + face camera",voice:"Record my own voice",captions:"Gujarati + English",template:"Complete lesson"});
  const [showCreate, setShowCreate] = useState(false);
  const dragSceneId = useRef(null);
  const videoRef = useRef(null);
  const cameraStream = useRef(null);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const audioRecorder = useRef(null);
  const audioChunks = useRef([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const fileRef = useRef(null);
  const voiceFileRef = useRef(null);
  const selectedScene = scenes.find(s => s.id === selected) || scenes[0];
  const wordCount = useMemo(() => script.trim() ? script.trim().split(/\s+/).length : 0, [script]);

  useEffect(() => {
    drawPreview();
    return () => cancelAnimationFrame(animationRef.current);
  }, [selectedScene?.id, selectedScene?.title, selectedScene?.text, theme, mediaUrl, captions]);

  useEffect(() => {
    if (!isPlaying || scenes.length === 0) return;
    const current = scenes.find(scene => scene.id === selected) || scenes[0];
    const [minutes, seconds] = (current.duration || "00:10").split(":").map(Number);
    const durationMs = Math.max(1000, ((minutes || 0) * 60 + (seconds || 10)) * 1000);
    const timer = window.setTimeout(() => {
      const index = scenes.findIndex(scene => scene.id === current.id);
      if (index >= scenes.length - 1) {
        setIsPlaying(false);
        setStatus("Scene preview finished");
      } else {
        setSelected(scenes[index + 1].id);
      }
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, selected, scenes]);

  function drawPreview() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const render = (t) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, theme === "paper" ? "#e9e4d8" : "#111b32");
      grad.addColorStop(1, theme === "paper" ? "#c9c1b1" : "#080b13");
      ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = "rgba(218,170,83,.12)";
      for (let i=0;i<12;i++) ctx.fillRect((i*117 + t*.018)%w, 0, 1, h);
      ctx.fillStyle = "#d9a84f"; ctx.fillRect(68,68,6,80);
      ctx.fillStyle = theme === "paper" ? "#182238" : "#f6f3ec";
      ctx.font = "600 17px Arial"; ctx.fillText("OFFICERLAB  /  CINEMATIC EXPLAINER", 94, 88);
      ctx.font = "600 15px Arial"; ctx.fillStyle = "#d9a84f"; ctx.fillText(selectedScene?.title || "Untitled scene", 94, 132);
      ctx.font = "700 47px Arial";
      const lines = (selectedScene?.text || "Your cinematic scene").split("\n");
      lines.forEach((line,i) => ctx.fillText(line, 94, 220 + i*62));
      ctx.fillStyle = "#d9a84f"; ctx.fillRect(94, 360, 92, 4);
      ctx.fillStyle = theme === "paper" ? "#4c5260" : "#aeb8c9";
      ctx.font = "18px Arial"; ctx.fillText("Gujarati learning • GPSC / GSSSB", 94, 405);
      if (captions) {
        ctx.fillStyle = "rgba(0,0,0,.58)"; ctx.fillRect(40, h-74, w-80, 42);
        ctx.fillStyle = "#fff"; ctx.font = "18px Arial";
        ctx.textAlign = "center"; ctx.fillText(lines[0] || "Narration caption preview", w/2, h-47); ctx.textAlign = "left";
      }
      ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.font = "12px Arial"; ctx.fillText("PREVIEW • SAMPLE MOTION GRAPHIC", 94, h-22);
      animationRef.current = requestAnimationFrame(render);
    };
    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(render);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStream.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true); setStatus("Camera and microphone connected");
    } catch (e) { setStatus("Camera permission unavailable: " + e.message); }
  }
  function stopCamera() {
    cameraStream.current?.getTracks().forEach(t => t.stop());
    cameraStream.current = null; setCameraOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }
  function startVideoRecording() {
    if (!cameraStream.current) { setStatus("Connect the camera first"); return; }
    try {
      chunks.current = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const mr = new MediaRecorder(cameraStream.current, { mimeType: mime });
      recorder.current = mr;
      mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mime });
        setVideoUrl(URL.createObjectURL(blob)); setStatus("Presenter recording ready");
      };
      mr.start(); setRecording(true); setStatus("Recording presenter footage…");
    } catch(e) { setStatus("Recording failed: " + e.message); }
  }
  function stopVideoRecording() { recorder.current?.stop(); setRecording(false); }
  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const mr = new MediaRecorder(stream); audioRecorder.current = mr;
      mr.ondataavailable = e => { if (e.data.size) audioChunks.current.push(e.data); };
      mr.onstop = () => {
        setVoiceUrl(URL.createObjectURL(new Blob(audioChunks.current, { type: "audio/webm" })));
        stream.getTracks().forEach(t => t.stop()); setStatus("Voice recording ready");
      };
      mr.start(); setAudioRecording(true); setStatus("Recording narration…");
    } catch(e) { setStatus("Microphone permission unavailable: " + e.message); }
  }
  function stopAudioRecording() { audioRecorder.current?.stop(); setAudioRecording(false); }
  function createVideo() {
    const title = videoSetup.title.trim() || videoSetup.topic.trim() || "New OfficerLab Video";
    const topic = videoSetup.topic.trim() || "Your selected topic";
    const base = [
      ["Opening Hook","Title card", "આજનો મહત્વપૂર્ણ વિષય\n"+topic,"gold"],
      ["Learning Objectives","Objectives","આજે આપણે શું શીખીશું?\nમુખ્ય મુદ્દાઓ અને પરીક્ષા ઉપયોગિતા","blue"],
      ["Concept Foundation","Explainer",topic+"\nમૂળભૂત પરિચય અને વ્યાખ્યા","purple"],
      ["Detailed Explanation","Deep dive","મુખ્ય જોગવાઈઓ અને મહત્વપૂર્ણ મુદ્દાઓ\nઉદાહરણ સાથે સમજૂતી","blue"],
      ["Exam Focus","Exam analysis","GPSC / GSSSB માટે અગત્યના મુદ્દા\nતથ્ય, કલમો અને સંભવિત પ્રશ્નો","gold"],
      ["Quick Revision","Recap","ઝડપી પુનરાવર્તન\nમુખ્ય મુદ્દાઓ યાદ રાખો","purple"],
      ["Practice MCQs","Quiz","તમારી સમજ ચકાસો\nMCQ અને સમજૂતી","blue"],
      ["Final Takeaway","Outro","આજના પાઠનો સાર\nOfficerLab સાથે તૈયારી ચાલુ રાખો","gold"]
    ];
    const chosen = videoSetup.template === "Shorts / Reels" ? [base[0],base[2],base[4],base[7]] : videoSetup.template === "MCQ Practice" ? [base[0],base[4],base[6],base[7]] : videoSetup.template === "Concept Explainer" ? [base[0],base[2],base[3],base[5],base[7]] : base;
    const total = Math.max(1, Number(videoSetup.duration)||10) * 60;
    const each = Math.max(5, Math.floor(total/chosen.length));
    const nextScenes = chosen.map((s,i)=>({id:i+1,title:s[0],kind:s[1],duration:String(Math.floor(each/60)).padStart(2,"0")+":"+String(each%60).padStart(2,"0"),text:s[2],accent:s[3]}));
    const intro = "નમસ્કાર મિત્રો! OfficerLab માં આપનું સ્વાગત છે.\\nઆજે આપણે "+topic+" વિષયને સરળ ગુજરાતી અને જરૂરી English technical terms સાથે સમજવાના છીએ.\\nઆ પાઠમાં મૂળભૂત સંકલ્પનાઓ, અગત્યના મુદ્દાઓ, પરીક્ષાલક્ષી વિશ્લેષણ અને MCQ દ્વારા પુનરાવર્તન કરીશું.";
    setProject(title); setScript(intro); setScenes(nextScenes); setSelected(1); setIsPlaying(false); setActive("studio"); setShowCreate(false); setStatus("New video workspace created — customize your storyboard");
  }
  function addScene() {
    const id = Math.max(0, ...scenes.map(s => s.id)) + 1;
    const scene = { id, title: `Scene ${id}`, kind: "Explainer", duration: "00:10", text: "નવી દૃશ્ય રચના\nAdd your key message", accent: "blue" };
    setScenes(currentScenes => [...currentScenes, scene]); setSelected(id); setStatus(`Added ${scene.title}`);
  }
  function updateScene(field, value) {
    setScenes(currentScenes => currentScenes.map(s => s.id === selected ? { ...s, [field]: value } : s));
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function downloadPreviewFrame() {
    const canvas = canvasRef.current;
    if (!canvas) { setStatus("Preview is not ready"); return; }
    canvas.toBlob(blob => {
      if (blob) { downloadBlob(blob, "officerlab-scene-preview.png"); setStatus("Preview image downloaded"); }
      else setStatus("Could not create preview image");
    }, "image/png");
  }
  function reorderScene(draggedId, targetId) {
    if (!draggedId || draggedId === targetId) return;
    setScenes(current => {
      const from = current.findIndex(s => s.id === draggedId);
      const to = current.findIndex(s => s.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setStatus("Timeline order updated");
  }
  function exportCaptions() {
    const lines = script.split(/[.!?।\n]+/).map(x => x.trim()).filter(Boolean);
    let time = 0;
    const stamp = n => { const ms = Math.floor(n*1000), hh=String(Math.floor(ms/3600000)).padStart(2,"0"), mm=String(Math.floor(ms/60000)%60).padStart(2,"0"), ss=String(Math.floor(ms/1000)%60).padStart(2,"0"), m=String(ms%1000).padStart(3,"0"); return `${hh}:${mm}:${ss},${m}`; };
    const srt = lines.map((line,i) => { const start=time; time += Math.max(3, line.split(/\s+/).length*.42); return `${i+1}\n${stamp(start)} --> ${stamp(time)}\n${line}\n`; }).join("\n");
    downloadBlob(new Blob([srt], {type:"text/plain;charset=utf-8"}), "officerlab-captions.srt");
  }
  async function exportPreview() {
    const canvas = canvasRef.current;
    if (!canvas?.captureStream || !window.MediaRecorder) {
      setStatus("This browser does not support canvas video recording. Try the latest Chrome.");
      return;
    }
    setBusy(true); setExportedVideoUrl(""); setStatus("Recording preview — keep this tab open for 8 seconds…");
    let stream;
    try {
      stream = canvas.captureStream(30);
      const candidates = ["video/webm;codecs=vp8,opus","video/webm;codecs=vp8","video/webm"];
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
      const options = { videoBitsPerSecond: 2500000 };
      if (mimeType) options.mimeType = mimeType;
      const mr = new MediaRecorder(stream, options);
      const parts = [];
      mr.ondataavailable = event => { if (event.data && event.data.size > 0) parts.push(event.data); };
      mr.onerror = event => {
        stream?.getTracks().forEach(track => track.stop());
        setBusy(false); setStatus("Browser video recording failed: " + (event.error?.message || "unknown error"));
      };
      mr.onstop = () => {
        stream?.getTracks().forEach(track => track.stop());
        const blob = new Blob(parts, { type: mr.mimeType || mimeType || "video/webm" });
        setBusy(false);
        if (!blob.size) { setStatus("No video data was captured. Try Chrome and keep the preview visible."); return; }
        const url = URL.createObjectURL(blob);
        setExportedVideoUrl(url);
        setStatus("WebM ready — tap Download generated video below");
      };
      mr.start(1000);
      window.setTimeout(() => {
        if (mr.state !== "inactive") mr.stop();
      }, 8000);
    } catch (e) {
      stream?.getTracks().forEach(track => track.stop());
      setBusy(false); setStatus("Export failed: " + e.message);
    }
  }
  function uploadVoiceTrack(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setStatus("Please choose an audio file"); return; }
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceUrl(URL.createObjectURL(file));
    setStatus("Voice track added to timeline: " + file.name);
    e.target.value = "";
  }
  function removeVoiceTrack() {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceUrl("");
    setStatus("Voice track removed from timeline");
  }
  function uploadMedia(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(URL.createObjectURL(f)); setMediaName(f.name); setStatus(`Imported ${f.name}`);
  }
  function saveProject() {
    const data = { project, script, scenes, videoSetup, theme, captions, quality, createdAt: new Date().toISOString() };
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), "officerlab-project.json");
    setStatus("Project file saved");
  }

  const nav = [
    ["create","New Video",Plus], ["studio","Studio",LayoutDashboard], ["script","Script & Story",FileText],
    ["voice","Voice Studio",Mic], ["presenter","Presenter",Webcam],
    ["assets","Media Library",FolderOpen], ["export","Export",Film]
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Aperture size={21}/></div><div><b>OFFICERLAB</b><small>CINEMATIC STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="project-pill"><span className="live-dot"/><span>{project}</span><ChevronDown size={14}/></div>
      <nav>{nav.map(([id,label,Icon]) => <button key={id} className={active===id?"nav-item active":"nav-item"} onClick={()=>setActive(id)}><Icon size={17}/>{label}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="status-card"><span className="live-dot"/><div><b>Local studio</b><small>{status}</small></div></div>
        <button className="nav-item" onClick={()=>setShowSettings(true)}><Settings size={17}/>Settings</button>
        <div className="profile"><div className="avatar">OL</div><div><b>OfficerLab Creator</b><small>Education workspace</small></div></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="breadcrumb">Projects <span>/</span> <b>{project}</b></div>
        <div className="top-actions"><button className="btn primary" onClick={()=>setActive("create")}><Plus size={15}/> New video</button><span className="autosave"><Check size={14}/> Saved locally</span><button className="btn subtle" onClick={saveProject}><Download size={15}/> Save project</button><button className="btn primary" onClick={()=>setActive("export")}><Film size={15}/> Export video</button></div>
      </header>

      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">CREATIVE WORKSPACE / 01</div><h1>{nav.find(n=>n[0]===active)?.[1] || "Studio"}</h1><p>Build cinematic educational videos in Gujarati and English.</p></div><div className="heading-right"><span className="status-chip"><span className="live-dot"/> {status}</span></div></div>

        {active==="create" && <div className="create-layout">
          <section className="panel pad-panel create-main">
            <div className="eyebrow">NEW PROJECT / VIDEO BUILDER</div><h3>Start a fresh educational video</h3>
            <p className="muted">Choose your content format and production settings. OfficerLab will create an editable starter storyboard; refine the script and scenes before recording or exporting.</p>
            <div className="create-grid">
              <label className="field-label">Video / project title<input value={videoSetup.title} onChange={e=>setVideoSetup(v=>({...v,title:e.target.value}))} placeholder="e.g. Food Safety Act 2006"/></label>
              <label className="field-label">Topic / chapter<input value={videoSetup.topic} onChange={e=>setVideoSetup(v=>({...v,topic:e.target.value}))} placeholder="Enter the subject or chapter"/></label>
              <label className="field-label">Exam / audience<select value={videoSetup.exam} onChange={e=>setVideoSetup(v=>({...v,exam:e.target.value}))}><option>GPSC Class 1-2</option><option>GSSSB Class 3</option><option>Food Safety Officer</option><option>Talati / Junior Clerk</option><option>UPSC / State PSC</option><option>General learners</option></select></label>
              <label className="field-label">Subject category<select value={videoSetup.category} onChange={e=>setVideoSetup(v=>({...v,category:e.target.value}))}><option>GPSC / GSSSB</option><option>Indian Polity & Constitution</option><option>History & Culture</option><option>Geography</option><option>Economy</option><option>Science & Technology</option><option>Agriculture</option><option>Food Science & Food Laws</option><option>Reasoning & Quantitative Aptitude</option><option>Current Affairs</option><option>Government Rules & Administration</option><option>Other educational content</option></select></label>
              <label className="field-label">Language<select value={videoSetup.language} onChange={e=>setVideoSetup(v=>({...v,language:e.target.value}))}><option>Gujarati + English</option><option>Gujarati</option><option>Hindi + English</option><option>Hindi</option><option>English</option></select></label>
              <label className="field-label">Target duration<select value={videoSetup.duration} onChange={e=>setVideoSetup(v=>({...v,duration:e.target.value}))}><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label>
              <label className="field-label">Video format<select value={videoSetup.aspect} onChange={e=>setVideoSetup(v=>({...v,aspect:e.target.value}))}><option>16:9 YouTube</option><option>9:16 Shorts / Reels</option><option>1:1 Square</option><option>4:5 Social feed</option></select></label>
              <label className="field-label">Visual style<select value={videoSetup.style} onChange={e=>setVideoSetup(v=>({...v,style:e.target.value}))}><option>Cinematic explainer</option><option>Classroom lecture</option><option>News bulletin</option><option>Documentary</option><option>Whiteboard teaching</option><option>Minimal presentation</option><option>Motion graphics</option></select></label>
              <label className="field-label">Presenter layout<select value={videoSetup.presenter} onChange={e=>setVideoSetup(v=>({...v,presenter:e.target.value}))}><option>Graphics + face camera</option><option>Face camera full screen</option><option>Graphics only / faceless</option><option>Slides + presenter picture-in-picture</option></select></label>
              <label className="field-label">Voiceover plan<select value={videoSetup.voice} onChange={e=>setVideoSetup(v=>({...v,voice:e.target.value}))}><option>Record my own voice</option><option>Presenter camera + mic together</option><option>Import recorded narration</option><option>AI text-to-speech (backend required)</option><option>No narration / music-led</option></select></label>
              <label className="field-label">Captions<select value={videoSetup.captions} onChange={e=>setVideoSetup(v=>({...v,captions:e.target.value}))}><option>Gujarati + English</option><option>Gujarati</option><option>Hindi</option><option>English</option><option>No captions</option></select></label>
              <label className="field-label">Storyboard template<select value={videoSetup.template} onChange={e=>setVideoSetup(v=>({...v,template:e.target.value}))}><option>Complete lesson</option><option>Concept Explainer</option><option>Shorts / Reels</option><option>MCQ Practice</option></select></label>
            </div>
            <button className="btn primary create-submit" onClick={createVideo}><Sparkles size={16}/> Create editable video project</button>
          </section>
          <aside className="panel pad-panel create-side"><div className="eyebrow">AVAILABLE WORKFLOW</div><h3>From idea to publish</h3>
            <div className="workflow-list">{[["01","Plan","Topic, exam, duration and format"],["02","Storyboard","Opening, concepts, exam focus and recap"],["03","Script","Edit Gujarati / Hindi / English narration"],["04","Visuals","Import images, clips, diagrams and backgrounds"],["05","Voice & presenter","Record voice or camera + microphone"],["06","Timeline","Reorder scenes and set durations"],["07","Export","Preview, captions and project files"]].map(([n,t,d])=><div className="workflow-step"><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span></div>)}</div>
            <div className="note-box"><Sparkles size={18}/><div><b>Important</b><p>This creates a ready-to-edit storyboard and starter narration, not an automatically generated final MP4. AI script generation, TTS, stock-media search and full MP4 rendering need connected services / a rendering backend.</p></div></div>
          </aside>
        </div>}
        {active==="studio" && <>
          <div className="studio-grid">
            <section className="panel preview-panel">
              <div className="panel-head"><div><span className="eyebrow">LIVE CANVAS</span><h3>Scene preview</h3></div><div className="head-actions"><span className="format-tag">16:9 • {quality}</span><button className="icon-btn" title="Download preview image (PNG)" onClick={downloadPreviewFrame}><Download size={16}/></button><button className="icon-btn" title="Upload background" onClick={()=>fileRef.current?.click()}><Upload size={16}/></button></div></div>
              <div className="canvas-wrap"><canvas ref={canvasRef} width="1280" height="720"/><div className="canvas-overlay"><span><Radio size={12}/> PREVIEW</span><span>00:00 / 00:38</span></div></div>
              <div className="transport"><button className="play-btn" title={isPlaying ? "Pause scene preview" : "Play scene preview"} onClick={() => { setIsPlaying(value => !value); setStatus(isPlaying ? "Preview paused" : "Playing scene preview"); }}>{isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button><div className="transport-line"><div/></div><span className="timecode">00:00:00</span><button className="icon-btn" onClick={()=>setCaptions(!captions)}><Captions size={17}/></button></div>
            </section>
            <section className="panel scene-panel">
              <div className="panel-head"><div><span className="eyebrow">SEQUENCE</span><h3>Scenes <span className="count">{scenes.length}</span></h3></div><button className="icon-btn gold" onClick={addScene}><Plus size={17}/></button></div>
              <div className="scene-list">{scenes.map((s,i)=><button key={s.id} className={`scene-row ${selected===s.id?"selected":""}`} onClick={()=>setSelected(s.id)}><span className={`scene-thumb ${s.accent}`}>{String(i+1).padStart(2,"0")}</span><span className="scene-info"><b>{s.title}</b><small>{s.kind}</small></span><span className="scene-time">{s.duration}</span></button>)}</div>
              <button className="add-scene" onClick={addScene}><Plus size={15}/> Add scene</button>
              <div className="scene-editor"><div className="eyebrow">SELECTED SCENE</div><label>Scene title<input value={selectedScene?.title||""} onChange={e=>updateScene("title",e.target.value)}/></label><label>Scene duration (MM:SS)<input value={selectedScene?.duration||"00:10"} onChange={e=>updateScene("duration",e.target.value)} placeholder="00:10"/></label><label>On-screen text<textarea rows="2" value={selectedScene?.text||""} onChange={e=>updateScene("text",e.target.value)}/></label></div>
            </section>
          </div>
          <div className="lower-grid">
            <section className="panel timeline-panel"><div className="panel-head"><div><span className="eyebrow">EDITING</span><h3>Timeline</h3></div><span className="format-tag">00:38 total</span></div><div className="timeline-ruler"><span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span><span>00:40</span></div><div className="track"><span className="track-label">VIDEO</span><div className="track-items">{scenes.map((s,i)=><div key={s.id} draggable onDragStart={()=>{dragSceneId.current=s.id;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorderScene(dragSceneId.current,s.id);dragSceneId.current=null;}} onDragEnd={()=>{dragSceneId.current=null;}} onClick={()=>setSelected(s.id)} title="Drag to reorder; click to select" className={`clip clip-${i%3} ${selected===s.id?"clip-selected":""}`} style={{width:`${Math.max(14,100/scenes.length)}%`}}>{s.title} · {s.duration}</div>)}</div></div><div className="track voice-track"><span className="track-label">VOICE</span><div className="audio-track-content">{voiceUrl?<><div className="audio-clip"><AudioLines size={15}/> Narration attached</div><audio className="timeline-audio" controls preload="metadata" src={voiceUrl}/><button className="mini-action" onClick={removeVoiceTrack}>Remove</button></>:<><span className="empty-track">No narration attached</span><button className="mini-action" onClick={()=>setActive("voice")}><Mic size={13}/> Open Voice Studio</button><button className="mini-action" onClick={()=>voiceFileRef.current?.click()}><Upload size={13}/> Import audio</button></>}</div></div><div className="track"><span className="track-label">CAPTIONS</span><div className="caption-clip">Gujarati / English subtitles</div></div></section>
            <section className="panel quick-panel"><div className="panel-head"><div><span className="eyebrow">QUICK ACTIONS</span><h3>Production tools</h3></div><Sparkles size={18} className="gold-text"/></div><button className="action-row" onClick={()=>setActive("script")}><FileText/><span><b>Write your script</b><small>Prepare narration and scene beats</small></span><ChevronDown size={15}/></button><button className="action-row" onClick={()=>setActive("voice")}><Mic/><span><b>Record voiceover</b><small>Capture clean narration</small></span><ChevronDown size={15}/></button><button className="action-row" onClick={()=>setActive("presenter")}><Webcam/><span><b>Record presenter</b><small>Camera and microphone capture</small></span><ChevronDown size={15}/></button></section>
          </div>
        </>}

        {active==="script" && <div className="two-col"><section className="panel pad-panel"><div className="panel-head"><div><span className="eyebrow">SCRIPT EDITOR</span><h3>Gujarati narration</h3></div><span className="format-tag">{wordCount} words</span></div><label className="field-label">Project title<input value={project} onChange={e=>setProject(e.target.value)}/></label><textarea className="script-area" value={script} onChange={e=>setScript(e.target.value)} placeholder="Write your Gujarati narration here…"/><div className="editor-foot"><span>Gujarati + English technical terms supported</span><button className="btn primary" onClick={()=>setStatus("Script saved to project")}>Save script</button></div></section><section className="panel pad-panel"><div className="eyebrow">SCRIPT ASSISTANT</div><h3>Production checklist</h3><div className="checklist"><p><Check/> One clear learning objective per scene</p><p><Check/> Explain technical terms in context</p><p><Check/> Keep on-screen text concise</p><p><Check/> Verify facts against official sources</p></div><div className="note-box"><Sparkles size={18}/><div><b>AI integration ready</b><p>Connect your preferred LLM API to generate scripts, scene beats and visual prompts. API keys should be stored server-side, never in browser code.</p></div></div><button className="btn subtle full" onClick={()=>setActive("studio")}>Back to studio</button></section></div>}

        {active==="voice" && <div className="two-col"><section className="panel pad-panel"><div className="eyebrow">VOICE RECORDING / TIMELINE TRACK</div><h3>Record and attach narration</h3><p className="muted">Record narration separately here, or use Presenter → Record video + mic to capture presenter video and microphone voice-over simultaneously in one synchronized clip.</p><div className="record-orb"><div className={audioRecording?"pulse":""}><Mic size={30}/></div></div><div className="center">{audioRecording?<button className="btn danger" onClick={stopAudioRecording}><Square size={15}/> Stop recording</button>:<button className="btn primary" onClick={startAudioRecording}><Mic size={15}/> Start recording</button>}</div>{voiceUrl&&<><div className="recorded"><Check size={16}/> Voice recording ready<a href={voiceUrl} download="officerlab-voice.webm">Download audio</a></div><audio className="voice-player" controls src={voiceUrl}/><button className="btn primary full" onClick={()=>{setActive("studio");setStatus("Narration attached to timeline");}}>Attach / view in timeline</button></>}</section><section className="panel pad-panel"><div className="eyebrow">VOICE WORKFLOW</div><h3>Voiceover options</h3><div className="option-card"><Mic/><div><b>Own voice recording</b><small>Available now in this browser</small></div><span className="tag-ready">Ready</span></div><div className="option-card"><Volume2/><div><b>AI text-to-speech</b><small>Connect a TTS provider through a secure backend</small></div><span className="tag-planned">Integration</span></div><div className="option-card"><AudioLines/><div><b>Voice timing and sync</b><small>Precise word-level timing is part of the rendering-worker integration</small></div><span className="tag-planned">Next phase</span></div></section></div>}

        {active==="presenter" && <div className="two-col"><section className="panel pad-panel"><div className="panel-head"><div><div className="eyebrow">PRESENTER CAMERA</div><h3>Face-camera recording</h3></div><span className={cameraOn?"tag-ready":"tag-planned"}>{cameraOn?"Connected":"Not connected"}</span></div><div className="camera-box">{cameraOn?<video ref={videoRef} muted playsInline/>:<div className="camera-placeholder"><Webcam size={40}/><b>Camera preview</b><small>Connect your camera to begin</small></div>}{recording&&<span className="recording-label"><i/> REC</span>}</div><div className="camera-actions">{!cameraOn?<button className="btn primary" onClick={startCamera}><Webcam size={15}/> Connect camera</button>:<button className="btn subtle" onClick={stopCamera}>Disconnect</button>}{cameraOn&&!recording?<button className="btn danger" onClick={startVideoRecording}><Radio size={15}/> Record video + mic</button>:cameraOn&&<button className="btn danger" onClick={stopVideoRecording}><Square size={15}/> Stop</button>}</div>{videoUrl&&<div className="recorded"><Check size={16}/> Presenter video + microphone audio ready<a href={videoUrl} download="officerlab-presenter-with-audio.webm">Download synced clip</a></div>}</section><section className="panel pad-panel"><div className="eyebrow">COMPOSITION</div><h3>Presenter + graphics</h3><p className="muted">The planned composite workflow places your presenter footage alongside the animated explainer canvas.</p><div className="composition-preview"><div className="comp-slide">GRAPHICS<br/><small>Explainer visual</small></div><div className="comp-presenter"><Webcam size={25}/><small>Presenter</small></div></div><div className="note-box"><AudioLines size={18}/><div><b>Presenter + voice-over together</b><p>When you start presenter recording, the camera stream records its microphone audio and video in the same WebM file. Use headphones to prevent speaker echo. Separate voice-track mixing and final MP4 compositing still require the render worker.</p></div></div></section></div>}

        {active==="assets" && <section className="panel pad-panel"><div className="panel-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h3>Project assets</h3></div><button className="btn primary" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import media</button></div><input ref={fileRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={uploadMedia}/><input ref={voiceFileRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" hidden onChange={uploadVoiceTrack}/>{mediaUrl?<div className="asset-card"><div className="asset-icon"><FolderOpen/></div><div><b>{mediaName}</b><small>Imported project asset</small></div><button className="icon-btn" onClick={()=>{URL.revokeObjectURL(mediaUrl);setMediaUrl("");setMediaName("");}}><X size={16}/></button></div>:<div className="dropzone" onClick={()=>fileRef.current?.click()}><Upload size={27}/><b>Drop your media here</b><span>or click to browse • Images, video and audio</span></div>}<div className="note-box"><FileText size={18}/><div><b>Rights and credits</b><p>Track the source and licence of every third-party photo, map and music asset before publishing. The Cinematic Skill's Wikimedia Commons workflow can be integrated for credited public-domain and openly licensed images.</p></div></div></section>}

        {active==="export" && <div className="two-col"><section className="panel pad-panel"><div className="eyebrow">DELIVERY</div><h3>Export your video</h3><p className="muted">Export a short animated canvas preview now, or save the project for the full rendering pipeline.</p><label className="field-label">Resolution<select value={quality} onChange={e=>setQuality(e.target.value)}><option>1080p</option><option>720p</option><option>4K</option></select></label><div className="toggle-row"><div><b>Gujarati captions</b><small>Include captions in preview and export SRT separately</small></div><input type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/></div><button className="btn primary full" disabled={busy} onClick={exportPreview}><Download size={16}/>{busy?"Rendering…":"Export 8-second preview (WebM)"}</button>{exportedVideoUrl&&<div className="recorded"><Check size={16}/> Video file ready <a href={exportedVideoUrl} download="officerlab-preview.webm">Download generated video</a></div>}<button className="btn subtle full" onClick={downloadPreviewFrame}><Download size={16}/> Download current preview frame (PNG)</button><button className="btn subtle full" onClick={exportCaptions}><Captions size={16}/> Download subtitle file (.srt)</button><button className="btn subtle full" onClick={saveProject}><FileText size={16}/> Download editable project (.json)</button></section><section className="panel pad-panel"><div className="eyebrow">EXPORT STATUS</div><h3>Production readiness</h3><div className="readiness"><div><span>Script</span><b className="good">Ready</b></div><div><span>Scene graphics preview</span><b className="good">Ready</b></div><div><span>Voice capture</span><b className={voiceUrl?"good":"pending"}>{voiceUrl?"Recorded":"Optional"}</b></div><div><span>Presenter capture</span><b className={videoUrl?"good":"pending"}>{videoUrl?"Recorded":"Optional"}</b></div><div><span>Full cinematic render</span><b className="pending">Worker integration</b></div><div><span>Final MP4 + audio mux</span><b className="pending">Worker integration</b></div></div><div className="note-box"><Film size={18}/><div><b>About this build</b><p>The current browser export is a WebM motion-graphics preview, not the full Skia cinematic render. See README for the Vercel + Python worker deployment architecture.</p></div></div></section></div>}
      </div>
    </main>
    {showSettings&&<div className="modal-backdrop" onClick={()=>setShowSettings(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="panel-head"><h3>Studio settings</h3><button className="icon-btn" onClick={()=>setShowSettings(false)}><X/></button></div><label className="field-label">Visual theme<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="midnight">Midnight cinematic</option><option value="paper">Warm paper</option></select></label><p className="muted">Your project and recordings remain in this browser unless you download or export them.</p><button className="btn primary full" onClick={()=>setShowSettings(false)}>Done</button></div></div>}
    <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={uploadMedia}/>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
