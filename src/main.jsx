import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Aperture, AudioLines, Captions, Check, ChevronDown, Clapperboard, Download, Home, GraduationCap,
  FileText, Film, FolderOpen, LayoutDashboard, Mic, MonitorPlay, Play, Plus,
  Radio, Settings, Sparkles, Square, Upload, Video, Volume2, WandSparkles, Pause,
  Webcam, X
} from "lucide-react";
import "./style.css";

const starter = "";

const initialScenes = [
  { id: 1, title: "Opening Scene", kind: "Title card", duration: "00:08", text: "તમારા વિડિયોનું શીર્ષક\\nઅહીં ઉમેરો", accent: "gold" },
  { id: 2, title: "Core Concept", kind: "Explainer", duration: "00:18", text: "મુખ્ય સંકલ્પના\\nતમારો વિષય અહીં ઉમેરો", accent: "blue" },
  { id: 3, title: "Key Takeaway", kind: "Highlight", duration: "00:12", text: "મહત્વપૂર્ણ મુદ્દાઓ\\nઝડપી પુનરાવર્તન", accent: "purple" }
];

const DEFAULT_VIDEO_SETUP = {
  title: "", topic: "", category: "Other educational content", exam: "General learners",
  language: "Gujarati + English", duration: "10", aspect: "16:9 YouTube",
  style: "Cinematic explainer", presenter: "Slides + presenter picture-in-picture",
  voice: "Presenter camera + mic together", captions: "Gujarati + English",
  template: "Complete lesson"
};

function loadWorkspaceState() {
  const fallback = {
    id: "workspace-default", name: "Untitled Exam Lesson", mode: "exam", script: starter,
    scenes: initialScenes, videoSetup: DEFAULT_VIDEO_SETUP, theme: "midnight",
    captions: true, quality: "1080p"
  };
  try {
    const saved = JSON.parse(localStorage.getItem("officerlab-workspaces-v1") || "null");
    if (saved && Array.isArray(saved.projects) && saved.projects.length) {
      const activeId = saved.projects.some(item => item.id === saved.activeId) ? saved.activeId : saved.projects[0].id;
      return { ...saved, activeId, projects: saved.projects.map(item => ({ ...fallback, ...item, mode: item.mode || "exam" })) };
    }
  } catch {}
  return { activeId: fallback.id, projects: [fallback] };
}

function App() {
  const [workspaceState, setWorkspaceState] = useState(loadWorkspaceState);
  const initialWorkspace = workspaceState.projects.find(item => item.id === workspaceState.activeId) || workspaceState.projects[0];
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [workspaceMode, setWorkspaceMode] = useState(initialWorkspace.mode || "exam");
  const [active, setActive] = useState("home");
  const [project, setProject] = useState(initialWorkspace.name);
  const [script, setScript] = useState(initialWorkspace.script || "");
  const [scenes, setScenes] = useState(initialWorkspace.scenes || initialScenes);
  const [selected, setSelected] = useState(1);
  const [theme, setTheme] = useState(initialWorkspace.theme || "midnight");
  const [status, setStatus] = useState("Ready to create");
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceTrimStart, setVoiceTrimStart] = useState(0);
  const [voiceTrimEnd, setVoiceTrimEnd] = useState(0);
  const [voiceOffset, setVoiceOffset] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [voicePeaks, setVoicePeaks] = useState([]);
  const [musicUrl, setMusicUrl] = useState("");
  const [sfxUrl, setSfxUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(25);
  const [sfxVolume, setSfxVolume] = useState(70);
  const [audioClips,setAudioClips]=useState([]);
  const [selectedAudioClip,setSelectedAudioClip]=useState("");
  const [audioPlaying,setAudioPlaying]=useState(false);
  const audioVoiceInputRef=useRef(null), audioMusicInputRef=useRef(null), audioSfxInputRef=useRef(null);
  const audioDragRef=useRef(null), audioContextRef=useRef(null), audioSourcesRef=useRef([]), audioStopTimerRef=useRef(null);
  const musicFileRef = useRef(null);
  const sfxFileRef = useRef(null);
  const voicePlayerRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [exportedVideoUrl, setExportedVideoUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [captions, setCaptions] = useState(initialWorkspace.captions ?? true);
  const [quality, setQuality] = useState(initialWorkspace.quality || "1080p");
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSetup, setVideoSetup] = useState(initialWorkspace.videoSetup || DEFAULT_VIDEO_SETUP);
  const [showCreate, setShowCreate] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const importProjectRef = useRef(null);
  const dragSceneId = useRef(null);
  const videoRef = useRef(null);
  const studioPresenterVideoRef = useRef(null);
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
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiProviders, setAiProviders] = useState({});
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  useEffect(() => {
    if (active !== "script") return;
    let cancelled = false;
    fetch("/api/ai/providers").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load provider status");
      if (!cancelled) setAiProviders(data.providers || {});
    }).catch(error => { if (!cancelled) setAiNotice(error.message); });
    return () => { cancelled = true; };
  }, [active]);
  async function testAiProvider() {
    setAiBusy(true); setAiNotice("Testing " + aiProvider + " connection…");
    try {
      const response = await fetch("/api/ai/providers/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: aiProvider }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Provider test failed");
      setAiNotice(data.message || (aiProvider + " connection successful"));
      setAiProviders(current => ({ ...current, [aiProvider]: { ...(current[aiProvider] || {}), configured: true, model: data.model } }));
    } catch (error) { setAiNotice(error.message); }
    finally { setAiBusy(false); }
  }
  async function generateAiScript() {
    const topic = (videoSetup.topic || project || "").trim();
    if (topic.length < 3) { setAiNotice("Enter a topic in Create Video before generating a script."); return; }
    setAiBusy(true); setAiNotice("Generating your lesson script…");
    try {
      const response = await fetch("/api/ai/script/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        topic, audience: workspaceMode === "exam" ? "GPSC / GSSSB aspirants" : "General YouTube audience",
        language: videoSetup.language || "Gujarati + English technical terms",
        duration_minutes: Math.max(1, Math.min(60, Number(videoSetup.duration) || 10)),
        subject_context: script, provider: aiProvider,
        style: workspaceMode === "exam" ? "Gujarati classroom lecture, exam-oriented, concept-first" : "engaging cinematic explainer with storytelling"
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Script generation failed");
      setScript(data.text || "");
      setAiNotice("Generated with " + (data.provider || aiProvider) + " · " + (data.model || "AI"));
      setStatus("AI script generated and saved in this project");
    } catch (error) { setAiNotice(error.message); }
    finally { setAiBusy(false); }
  }

  useEffect(() => {
    setWorkspaceState(current => {
      const projects = current.projects.map(item => item.id === current.activeId
        ? { ...item, name: project, script, scenes, videoSetup, theme, captions, quality }
        : item);
      const next = { ...current, projects };
      try { localStorage.setItem("officerlab-workspaces-v1", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [project, script, scenes, videoSetup, theme, captions, quality]);

  useEffect(() => {
    const player = active === "studio" ? studioPresenterVideoRef.current
      : active === "presenter" ? videoRef.current : null;
    if (!player) return;
    if (cameraOn && cameraStream.current) {
      player.removeAttribute("src");
      player.srcObject = cameraStream.current;
      player.muted = true;
      player.play().catch(() => setStatus("Camera connected. Tap the preview to start playback if needed."));
    } else {
      player.srcObject = null;
      if (videoUrl) {
        player.src = videoUrl;
        player.load();
      } else {
        player.removeAttribute("src");
      }
    }
  }, [active, cameraOn, videoUrl]);

  useEffect(() => {
    drawPreview();
    return () => cancelAnimationFrame(animationRef.current);
  }, [selectedScene?.id, selectedScene?.title, selectedScene?.text, theme, mediaUrl, captions]);

  useEffect(()=>{setAudioClips(current=>current.map(clip=>clip.sceneId?{...clip,start:sceneStartSeconds(Number(clip.sceneId))}:clip));},[scenes]);
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
        const voiceBlobUrl=URL.createObjectURL(new Blob(audioChunks.current, { type: "audio/webm" })); setVoiceUrl(voiceBlobUrl); makeWaveform(voiceBlobUrl); addAudioClip("voice",null,voiceBlobUrl);
        setVoiceDuration(0); setVoiceTrimStart(0); setVoiceTrimEnd(0); setVoiceOffset(0); setVoiceVolume(100);
        stream.getTracks().forEach(t => t.stop()); setStatus("Voice recording ready");
      };
      mr.start(); setAudioRecording(true); setStatus("Recording narration…");
    } catch(e) { setStatus("Microphone permission unavailable: " + e.message); }
  }
  function stopAudioRecording() { audioRecorder.current?.stop(); setAudioRecording(false); }
  function activateWorkspace(target) {
    if (!target || target.id === workspaceState.activeId) {
      setWorkspaceOpen(false);
      return;
    }
    const current = {
      id: workspaceState.activeId, name: project, mode: workspaceMode, script, scenes, videoSetup,
      theme, captions, quality
    };
    const projects = workspaceState.projects.map(item => item.id === current.id ? current : item);
    const selectedWorkspace = projects.find(item => item.id === target.id) || target;
    const next = { activeId: selectedWorkspace.id, projects };
    setWorkspaceState(next);
    try { localStorage.setItem("officerlab-workspaces-v1", JSON.stringify(next)); } catch {}
    setProject(selectedWorkspace.name);
    setWorkspaceMode(selectedWorkspace.mode || "exam");
    setScript(selectedWorkspace.script || "");
    setScenes(selectedWorkspace.scenes || initialScenes);
    setVideoSetup(selectedWorkspace.videoSetup || DEFAULT_VIDEO_SETUP);
    setTheme(selectedWorkspace.theme || "midnight");
    setCaptions(selectedWorkspace.captions ?? true);
    setQuality(selectedWorkspace.quality || "1080p");
    setSelected(1);
    setAudioClips([]);
    setSelectedAudioClip("");
    setVoiceUrl("");
    setVideoUrl("");
    setExportedVideoUrl("");
    setActive("studio");
    setWorkspaceOpen(false);
    setStatus("Workspace switched");
  }

  function createWorkspace() {
    const current = {
      id: workspaceState.activeId, name: project, script, scenes, videoSetup,
      theme, captions, quality
    };
    const id = "workspace-" + Date.now();
    const nextWorkspace = {
      id, name: workspaceMode === "exam" ? "Untitled Exam Lesson" : "Untitled General Video", mode: workspaceMode,
      script: "", scenes: initialScenes.map(scene => ({ ...scene })),
      videoSetup: { ...DEFAULT_VIDEO_SETUP, template: workspaceMode === "exam" ? "Complete lesson" : "Cinematic story" }, theme: "midnight", captions: true, quality: "1080p"
    };
    const projects = [...workspaceState.projects.map(item => item.id === current.id ? current : item), nextWorkspace];
    const next = { activeId: id, projects };
    setWorkspaceState(next);
    try { localStorage.setItem("officerlab-workspaces-v1", JSON.stringify(next)); } catch {}
    setProject(nextWorkspace.name);
    setScript("");
    setScenes(nextWorkspace.scenes);
    setVideoSetup(nextWorkspace.videoSetup);
    setTheme("midnight");
    setCaptions(true);
    setQuality("1080p");
    setSelected(1);
    setAudioClips([]);
    setSelectedAudioClip("");
    setVoiceUrl("");
    setVideoUrl("");
    setExportedVideoUrl("");
    setWorkspaceOpen(true);
    setActive("create");
    setStatus("New workspace created");
  }

  function enterMode(mode) {
    const current = { id: workspaceState.activeId, name: project, mode: workspaceMode, script, scenes, videoSetup, theme, captions, quality };
    const savedProjects = workspaceState.projects.map(item => item.id === current.id ? current : item);
    let target = savedProjects.find(item => (item.mode || "exam") === mode);
    if (!target) {
      const id = "workspace-" + mode + "-" + Date.now();
      target = { id, name: mode === "exam" ? "New Exam Preparation Project" : "New General Video Project", mode,
        script: "", scenes: initialScenes.map(scene => ({ ...scene })),
        videoSetup: { ...DEFAULT_VIDEO_SETUP, exam: mode === "exam" ? "GPSC Class 1-2" : "General learners",
          category: mode === "exam" ? "GPSC / GSSSB" : "Other educational content",
          template: mode === "exam" ? "Complete lesson" : "Cinematic story" },
        theme: "midnight", captions: true, quality: "1080p" };
      savedProjects.push(target);
    }
    const next = { activeId: target.id, projects: savedProjects };
    setWorkspaceState(next);
    try { localStorage.setItem("officerlab-workspaces-v1", JSON.stringify(next)); } catch {}
    setWorkspaceMode(mode); setProject(target.name); setScript(target.script || "");
    setScenes(target.scenes || initialScenes); setVideoSetup(target.videoSetup || DEFAULT_VIDEO_SETUP);
    setTheme(target.theme || "midnight"); setCaptions(target.captions ?? true); setQuality(target.quality || "1080p");
    setSelected(1); setAudioClips([]); setSelectedAudioClip(""); setVoiceUrl(""); setVideoUrl(""); setExportedVideoUrl("");
    setActive("studio"); setWorkspaceOpen(false); setStatus(mode === "exam" ? "Exam Preparation Studio opened" : "General Video Studio opened");
  }

  function createVideo() {
    const title = videoSetup.title.trim() || videoSetup.topic.trim() || "New OfficerLab Video";
    const topic = videoSetup.topic.trim() || "Your selected topic";
    const base = workspaceMode === "exam" ? [
      ["Opening Hook","Title card", "આજનો મહત્વપૂર્ણ વિષય\n"+topic,"gold"],
      ["Learning Objectives","Objectives","આજે આપણે શું શીખીશું?\nમુખ્ય મુદ્દાઓ અને પરીક્ષા ઉપયોગિતા","blue"],
      ["Concept Foundation","Explainer",topic+"\nમૂળભૂત પરિચય અને વ્યાખ્યા","purple"],
      ["Detailed Explanation","Deep dive","મુખ્ય જોગવાઈઓ અને મહત્વપૂર્ણ મુદ્દાઓ\nઉદાહરણ સાથે સમજૂતી","blue"],
      ["Exam Focus","Exam analysis","GPSC / GSSSB માટે અગત્યના મુદ્દા\nતથ્ય, કલમો અને સંભવિત પ્રશ્નો","gold"],
      ["Quick Revision","Recap","ઝડપી પુનરાવર્તન\nમુખ્ય મુદ્દાઓ યાદ રાખો","purple"],
      ["Practice MCQs","Quiz","તમારી સમજ ચકાસો\nMCQ અને સમજૂતી","blue"],
      ["Final Takeaway","Outro","આજના પાઠનો સાર\nOfficerLab સાથે તૈયારી ચાલુ રાખો","gold"]
    ] : [
      ["Opening Hook","Title card","આ વાર્તા / વિચાર તમને શું શીખવશે?\n"+topic,"gold"],
      ["Context","Introduction","વિષયનો પરિચય અને પૃષ્ઠભૂમિ","blue"],
      ["Main Story","Story / Explainer","મુખ્ય ઘટના, વિચાર અથવા સંકલ્પના","purple"],
      ["Visual Sequence","Cinematic sequence","મુખ્ય દૃશ્યો, ઉદાહરણો અને visual moments","blue"],
      ["Key Message","Takeaway","દર્શકો માટે યાદગાર સંદેશ","gold"],
      ["Call to Action","Outro","Like, share, subscribe અથવા આગળનું પગલું","purple"]
    ];
    const chosen = workspaceMode === "general"
      ? (videoSetup.template === "Shorts / Reels" ? [base[0],base[2],base[4],base[5]] : base)
      : (videoSetup.template === "Shorts / Reels" ? [base[0],base[2],base[4],base[7]] : videoSetup.template === "MCQ Practice" ? [base[0],base[4],base[6],base[7]] : videoSetup.template === "Concept Explainer" ? [base[0],base[2],base[3],base[5],base[7]] : base);
    const total = Math.max(1, Number(videoSetup.duration)||10) * 60;
    const each = Math.max(5, Math.floor(total/chosen.length));
    const nextScenes = chosen.map((s,i)=>({id:i+1,title:s[0],kind:s[1],duration:String(Math.floor(each/60)).padStart(2,"0")+":"+String(each%60).padStart(2,"0"),text:s[2],accent:s[3]}));
    const intro = workspaceMode === "exam" ? "નમસ્કાર મિત્રો! OfficerLab માં આપનું સ્વાગત છે.\\nઆજે આપણે "+topic+" વિષયને સરળ ગુજરાતી અને જરૂરી English technical terms સાથે સમજવાના છીએ.\\nઆ પાઠમાં મૂળભૂત સંકલ્પનાઓ, અગત્યના મુદ્દાઓ, પરીક્ષાલક્ષી વિશ્લેષણ અને MCQ દ્વારા પુનરાવર્તન કરીશું." : "Welcome to OfficerLab.\\nઆ વિડિયોમાં આપણે "+topic+" ને storytelling, cinematic visuals અને narration દ્વારા રજૂ કરીશું.\\nચાલો શરૂઆત કરીએ.";
    setProject(title); setScript(intro); setScenes(nextScenes); setSelected(1); setIsPlaying(false); setActive("studio"); setShowCreate(false); setStatus(workspaceMode === "exam" ? "Exam lesson workspace created" : "General video workspace created");
  }
  function addScene() {
    const id = Math.max(0, ...scenes.map(s => s.id)) + 1;
    const scene = { id, title: `Scene ${id}`, kind: "Explainer", duration: "00:10", text: "નવી દૃશ્ય રચના\nAdd your key message", accent: "blue" };
    setScenes(currentScenes => [...currentScenes, scene]); setSelected(id); setStatus(`Added ${scene.title}`);
  }
  function updateScene(field, value) {
    setScenes(currentScenes => currentScenes.map(s => s.id === selected ? { ...s, [field]: value } : s));
  }
  function deleteScene(id) {
    if (scenes.length <= 1) { setStatus("A project must contain at least one scene"); return; }
    const next = scenes.filter(scene => scene.id !== id);
    setScenes(next); setSelected(next[0].id); setStatus("Scene deleted");
  }
  function duplicateScene(id) {
    const source = scenes.find(scene => scene.id === id); if (!source) return;
    const copy = { ...source, id: Math.max(0,...scenes.map(scene=>Number(scene.id)||0))+1, title: source.title + " (Copy)" };
    setScenes(old => [...old, copy]); setSelected(copy.id); setStatus("Scene duplicated");
  }
  function deleteProject(id) {
    if (workspaceState.projects.length <= 1) { setStatus("Keep at least one project in your workspace"); return; }
    const target = workspaceState.projects.find(item=>item.id===id); if(!target)return;
    if (!window.confirm(`Permanently delete project \"${target.name}\" from this browser? Export a backup first if needed.`)) return;
    const remaining = workspaceState.projects.filter(item=>item.id!==id);
    const nextActive = id===workspaceState.activeId ? remaining[0] : remaining.find(item=>item.id===workspaceState.activeId);
    const next = {activeId:nextActive.id,projects:remaining};
    setWorkspaceState(next); localStorage.setItem("officerlab-workspaces-v1",JSON.stringify(next));
    if(id===workspaceState.activeId){setProject(nextActive.name);setWorkspaceMode(nextActive.mode||"exam");setScript(nextActive.script||"");setScenes(nextActive.scenes||initialScenes);setVideoSetup(nextActive.videoSetup||DEFAULT_VIDEO_SETUP);setTheme(nextActive.theme||"midnight");setCaptions(nextActive.captions??true);setQuality(nextActive.quality||"1080p");setSelected((nextActive.scenes||initialScenes)[0].id);setActive("studio");}
    setStatus("Project deleted from this browser");
  }
  function renameProject(id) {
    const target=workspaceState.projects.find(item=>item.id===id);if(!target)return;
    const name=window.prompt("Project name",target.name);if(!name?.trim())return;
    const projects=workspaceState.projects.map(item=>item.id===id?{...item,name:name.trim()}:item);
    const next={...workspaceState,projects};setWorkspaceState(next);localStorage.setItem("officerlab-workspaces-v1",JSON.stringify(next));
    if(id===workspaceState.activeId)setProject(name.trim());setStatus("Project renamed");
  }
  function exportWorkspaceBackup(){
    const data={format:"officerlab-workspace-backup-v1",exportedAt:new Date().toISOString(),workspaceState:{...workspaceState,projects:workspaceState.projects.map(item=>item.id===workspaceState.activeId?{...item,name:project,script,scenes,videoSetup,theme,captions,quality}:item)}};
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),"officerlab-workspace-backup.json");setStatus("Workspace backup downloaded");
  }
  function importWorkspaceBackup(event){
    const file=event.target.files?.[0];if(!file)return;
    const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result));const state=parsed.workspaceState||parsed;if(!Array.isArray(state.projects)||!state.projects.length)throw new Error("Invalid backup");const clean=state.projects.map(item=>({...item,id:item.id||`project-${Date.now()}-${Math.random()}`,mode:item.mode||"general",scenes:Array.isArray(item.scenes)&&item.scenes.length?item.scenes:initialScenes}));const activeId=clean.some(item=>item.id===state.activeId)?state.activeId:clean[0].id;const next={activeId,projects:clean};setWorkspaceState(next);localStorage.setItem("officerlab-workspaces-v1",JSON.stringify(next));const current=clean.find(item=>item.id===activeId);setProject(current.name);setWorkspaceMode(current.mode);setScript(current.script||"");setScenes(current.scenes);setVideoSetup(current.videoSetup||DEFAULT_VIDEO_SETUP);setTheme(current.theme||"midnight");setCaptions(current.captions??true);setQuality(current.quality||"1080p");setSelected(current.scenes[0].id);setActive("studio");setStatus("Backup imported successfully");}catch(error){setStatus("Backup import failed: "+error.message);}};reader.readAsText(file);event.target.value="";
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
  function sceneDurationSeconds(scene){
    const parts=String(scene?.duration||"00:10").split(":").map(Number);
    return Math.max(1,(parts[0]||0)*60+(parts[1]||10));
  }
  function sceneStartSeconds(sceneId){
    let cursor=0;
    for(const scene of scenes){if(scene.id===sceneId)return cursor;cursor+=sceneDurationSeconds(scene);}
    return 0;
  }
  function addAudioClip(track,file,urlOverride){
    const url=urlOverride||URL.createObjectURL(file);
    const audio=new Audio(url);
    const id=String(Date.now())+"-"+Math.random().toString(36).slice(2,7);
    const name=file?.name||(track==="voice"?"Narration":track==="music"?"Background music":"Sound effect");
    const add=duration=>{
      const d=Number.isFinite(duration)&&duration>0?duration:0;
      setAudioClips(old=>[...old,{id,track,name,url,start:0,sourceStart:0,sourceEnd:d,duration:d,volume:track==="voice"?1:track==="music"?.25:.7,sceneId:""}]);
      setSelectedAudioClip(id);setStatus(name+" added to "+track.toUpperCase()+" lane");
    };
    audio.addEventListener("loadedmetadata",()=>add(audio.duration),{once:true});
    audio.addEventListener("error",()=>add(0),{once:true});audio.load();
  }
  function uploadTimelineAudio(track,event){
    Array.from(event.target.files||[]).forEach(file=>file.type.startsWith("audio/")?addAudioClip(track,file):setStatus("Please choose an audio file"));
    event.target.value="";
  }
  function updateAudioClip(id,patch){setAudioClips(old=>old.map(c=>c.id===id?{...c,...patch}:c));}
  function removeAudioClip(id){
    setAudioClips(old=>{const target=old.find(c=>c.id===id),next=old.filter(c=>c.id!==id);if(target&&!next.some(c=>c.url===target.url))URL.revokeObjectURL(target.url);return next;});
    setSelectedAudioClip(old=>old===id?"":old);
  }
  function splitAudioClip(id){
    const clip=audioClips.find(c=>c.id===id);if(!clip)return;
    const mid=(clip.sourceStart+clip.sourceEnd)/2;
    if(mid-clip.sourceStart<.15||clip.sourceEnd-mid<.15){setStatus("Clip is too short to split");return;}
    const second={...clip,id:String(Date.now())+"-split",start:clip.start+mid-clip.sourceStart,sourceStart:mid};
    updateAudioClip(id,{sourceEnd:mid});setAudioClips(old=>[...old,second]);setSelectedAudioClip(second.id);
    setStatus("Audio clip split into two editable segments");
  }
  function mergeAdjacentAudioClips(){
    const clip=audioClips.find(c=>c.id===selectedAudioClip);if(!clip){setStatus("Select an audio clip first");return;}
    const same=audioClips.filter(c=>c.track===clip.track&&c.url===clip.url).sort((a,b)=>a.start-b.start);
    const index=same.findIndex(c=>c.id===clip.id),next=same[index+1];
    if(!next||Math.abs(clip.start+clip.sourceEnd-clip.sourceStart-next.start)>.25||Math.abs(clip.sourceEnd-next.sourceStart)>.25){
      setStatus("Merge requires adjacent split segments from the same source");return;
    }
    setAudioClips(old=>old.filter(c=>c.id!==next.id).map(c=>c.id===clip.id?{...c,sourceEnd:next.sourceEnd}:c));setStatus("Adjacent audio segments merged");
  }
  function attachAudioClipToScene(id,sceneId){
    updateAudioClip(id,{sceneId:sceneId||"",start:sceneId?sceneStartSeconds(Number(sceneId)):0});
    setStatus(sceneId?"Audio synced to scene start":"Manual audio timing enabled");
  }
  async function playAudioTimeline(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC||!audioClips.length){setStatus("Add audio clips to preview the mix");return;}
      const ctx=new AC();audioContextRef.current=ctx;await ctx.resume();
      const decoded=new Map();
      await Promise.all([...new Set(audioClips.map(c=>c.url))].map(async url=>{
        const response=await fetch(url);decoded.set(url,await ctx.decodeAudioData(await response.arrayBuffer()));
      }));
      const now=ctx.currentTime+.08;let end=0;
      audioClips.forEach(clip=>{
        const buffer=decoded.get(clip.url);if(!buffer)return;
        const from=Math.max(0,clip.sourceStart||0),to=Math.min(buffer.duration,clip.sourceEnd||buffer.duration),len=to-from;
        if(len<=0)return;
        const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
        gain.gain.value=Math.max(0,Math.min(2,Number(clip.volume??1)));
        source.connect(gain).connect(ctx.destination);source.start(now+Math.max(0,clip.start||0),from,len);
        audioSourcesRef.current.push(source);end=Math.max(end,(clip.start||0)+len);
      });
      setAudioPlaying(true);audioStopTimerRef.current=window.setTimeout(stopAudioTimeline,end*1000+250);
      setStatus("Playing synchronized voice, music and SFX mix");
    }catch(e){stopAudioTimeline();setStatus("Audio preview failed: "+e.message);}
  }
  function stopAudioTimeline(){
    if(audioStopTimerRef.current)window.clearTimeout(audioStopTimerRef.current);audioStopTimerRef.current=null;
    audioSourcesRef.current.forEach(source=>{try{source.stop();}catch{}});audioSourcesRef.current=[];
    if(audioContextRef.current){audioContextRef.current.close().catch(()=>{});audioContextRef.current=null;}
    setAudioPlaying(false);
  }
  async function checkRenderWorker() {
    const endpoint = import.meta.env.VITE_RENDER_API_URL;
    if (!endpoint) { setStatus("Worker URL is missing from the Vercel deployment."); return; }
    setBusy(true);
    setStatus("Checking Render worker health…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75000);
    try {
      const response = await fetch(endpoint.replace(/\/$/, "") + "/health", { signal: controller.signal });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const health = await response.json();
      if (!health.ok || !health.ffmpeg) throw new Error("Worker responded, but FFmpeg is unavailable.");
      setStatus("Worker connected successfully • FFmpeg ready");
    } catch (error) {
      const detail = error.name === "AbortError" ? "Health check timed out. The Render free service may be waking up." : error.message;
      setStatus("Worker connection failed: " + detail + ". Check Render CORS_ORIGINS and service logs.");
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  async function exportFinalMp4(){
    const endpoint=import.meta.env.VITE_RENDER_API_URL;
    if(!endpoint){setStatus("MP4 worker is not connected. Deploy render-worker and configure VITE_RENDER_API_URL.");return;}
    setBusy(true);setStatus("Uploading assets and rendering final MP4…");
    try{
      const form=new FormData(),uploads=[];
      for(let i=0;i<audioClips.length;i++){
        const clip=audioClips[i],assetId="audio_"+i,blob=await fetch(clip.url).then(r=>r.blob());
        const mimeExtension={"audio/webm":"webm","video/webm":"webm","audio/mp4":"m4a","video/mp4":"mp4","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav","audio/ogg":"ogg","audio/aac":"aac","audio/flac":"flac"}[blob.type]||clip.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"")||"webm";
        form.append("files",blob,assetId+"."+mimeExtension);
        uploads.push({...clip,assetId});
      }
      let presenterAssetId="";
      if(videoUrl){presenterAssetId="presenter_video";const blob=await fetch(videoUrl).then(r=>r.blob());form.append("files",blob,"presenter.webm");}
      form.append("manifest",JSON.stringify({project,script,scenes,aspect:videoSetup.aspect,quality,theme,captions,audioClips:uploads,presenterAssetId}));
      const token=import.meta.env.VITE_RENDER_API_TOKEN;
      const response=await fetch(endpoint.replace(/\/$/,"")+"/render",{method:"POST",headers:token?{Authorization:"Bearer "+token}:{},body:form});
      if(!response.ok)throw new Error((await response.text()).slice(0,400)||"Render service error");
      const blob=await response.blob();if(!blob.size)throw new Error("Empty MP4 response");
      downloadBlob(blob,(project.replace(/[^\w-]+/g,"-")||"officerlab-video")+".mp4");setStatus("Final MP4 rendered and downloaded");
    }catch(e){setStatus("MP4 render failed: "+e.message);}finally{setBusy(false);}
  }

  async function makeWaveform(url) {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const context = new AudioCtx();
      const decoded = await context.decodeAudioData(buffer);
      const channel = decoded.getChannelData(0);
      const bars = 120, block = Math.max(1, Math.floor(channel.length / bars));
      const peaks = Array.from({length:bars},(_,i)=>{
        let peak=0; for(let j=i*block;j<Math.min(channel.length,(i+1)*block);j+=8) peak=Math.max(peak,Math.abs(channel[j]));
        return Math.max(.06,peak);
      });
      setVoicePeaks(peaks);
      setVoiceDuration(decoded.duration);
      await context.close();
    } catch { setVoicePeaks([]); }
  }
  function uploadExtraAudio(kind,e) {
    const file=e.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith("audio/")) {setStatus("Choose a valid audio file");return;}
    const url=URL.createObjectURL(file);
    if(kind==="music"){if(musicUrl)URL.revokeObjectURL(musicUrl);setMusicUrl(url);setStatus("Background music added");}
    else {if(sfxUrl)URL.revokeObjectURL(sfxUrl);setSfxUrl(url);setStatus("Sound effect added");}
    e.target.value="";
  }
  function uploadVoiceTrack(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setStatus("Please choose an audio file"); return; }
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    const url=URL.createObjectURL(file); setVoiceUrl(url); makeWaveform(url); addAudioClip("voice",file,url);
    setVoiceDuration(0); setVoiceTrimStart(0); setVoiceTrimEnd(0); setVoiceOffset(0); setVoiceVolume(100);
    setStatus("Voice track added to timeline: " + file.name);
    e.target.value = "";
  }
  function removeVoiceTrack() {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceUrl(""); setVoicePeaks([]); setVoiceDuration(0); setVoiceTrimStart(0); setVoiceTrimEnd(0); setVoiceOffset(0); setVoiceVolume(100);
    setStatus("Voice track removed from timeline");
  }
  function uploadMedia(e) {
    const f = e.target.files?.[0]; if (!f) return;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(URL.createObjectURL(f)); setMediaName(f.name); setStatus(`Imported ${f.name}`);
  }
  function saveProject() {
    const data = { project, script, scenes, videoSetup, voiceEditing: { trimStart: voiceTrimStart, trimEnd: voiceTrimEnd || voiceDuration, offset: voiceOffset, volume: voiceVolume }, audioTracks: audioClips.map(({id,track,name,start,sourceStart,sourceEnd,volume,sceneId})=>({id,track,name,start,sourceStart,sourceEnd,volume,sceneId})), theme, captions, quality, createdAt: new Date().toISOString() };
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), "officerlab-project.json");
    setStatus("Project file saved");
  }

  const nav = [
    ["home","Home",Home], ["create",workspaceMode === "exam" ? "New Lesson" : "New Video",Plus], ["studio",workspaceMode === "exam" ? "Lesson Studio" : "Video Studio",LayoutDashboard], ["script",workspaceMode === "exam" ? "Lesson Script" : "Script & Story",FileText],
    ["voice","Voice Studio",Mic], ["presenter","Presenter",Webcam],
    ["assets","Media Library",FolderOpen], ["export","Export",Film]
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Aperture size={21}/></div><div><b>OFFICERLAB</b><small>CREATOR PLATFORM</small></div></div>
      <div className="workspace-label">{workspaceMode === "exam" ? "EXAM PROJECTS" : "VIDEO PROJECTS"}</div>
      <button className="project-pill" onClick={() => setWorkspaceOpen(value => !value)} aria-expanded={workspaceOpen}>
        <span className="live-dot"/><span>{project}</span><ChevronDown size={14}/>
      </button>
      {workspaceOpen && <div className="workspace-list">
        <div className="workspace-list-head"><span>{workspaceState.projects.filter(item => (item.mode || "exam") === workspaceMode).length} PROJECT{workspaceState.projects.filter(item => (item.mode || "exam") === workspaceMode).length === 1 ? "" : "S"}</span><button onClick={createWorkspace}><Plus size={12}/> New</button></div>
        {workspaceState.projects.filter(item => (item.mode || "exam") === workspaceMode).map(item => <button key={item.id} className={"workspace-item " + (item.id === workspaceState.activeId ? "active" : "")} onClick={() => activateWorkspace(item)}>
          <span className="workspace-item-dot"/><span>{item.name}</span>{item.id === workspaceState.activeId && <Check size={13}/>}
        </button>)}
      </div>}
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
        <div className="top-actions"><button className="btn primary" onClick={()=>setActive("create")}><Plus size={15}/> {workspaceMode === "exam" ? "New lesson" : "New video"}</button><span className="autosave"><Check size={14}/> Saved locally</span><button className="btn subtle" onClick={saveProject}><Download size={15}/> Save project</button><button className="btn primary" onClick={()=>setActive("export")}><Film size={15}/> Export video</button></div>
      </header>

      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">{workspaceMode === "exam" ? "EXAM PREPARATION WORKSPACE" : "GENERAL VIDEO CREATION WORKSPACE"}</div><h1>{nav.find(n=>n[0]===active)?.[1] || "Studio"}</h1><p>{workspaceMode === "exam" ? "Create syllabus-focused lessons, revision videos and MCQ explainers." : "Create cinematic stories, explainers, documentaries and social videos."}</p></div><div className="heading-right"><span className="status-chip"><span className="live-dot"/> {status}</span></div></div>

        {active==="home" && <section className="platform-home"><div className="platform-hero"><span className="eyebrow">OFFICERLAB CREATOR PLATFORM</span><h2>One platform. <em>Two creative studios.</em></h2><p>Choose your production workflow. General video creation and competitive-exam education stay in separate workspaces.</p></div><div className="platform-cards"><article className="platform-card general"><div className="platform-card-icon"><Clapperboard size={25}/></div><span className="eyebrow">STUDIO 01</span><h3>General Video Creation</h3><p>For YouTube videos, cinematic explainers, documentaries, storytelling, promos, interviews and Shorts.</p><ul><li>Cinematic scenes and motion graphics</li><li>Script, voice, presenter and media tools</li><li>Landscape, portrait and social formats</li></ul><button className="btn primary" onClick={()=>enterMode("general")}>Open Video Studio <ChevronDown size={15}/></button></article><article className="platform-card exam"><div className="platform-card-icon"><GraduationCap size={27}/></div><span className="eyebrow">STUDIO 02</span><h3>Competitive Exam Preparation</h3><p>For GPSC, GSSSB, UPSC and other competitive-exam courses, lessons and revision content.</p><ul><li>Syllabus and topic-wise lesson planning</li><li>Exam-focused notes, MCQs and revision</li><li>Gujarati + English technical terminology</li></ul><button className="btn primary" onClick={()=>enterMode("exam")}>Open Exam Studio <ChevronDown size={15}/></button></article></div><div className="platform-footnote"><Check size={15}/> Separate project lists and saved workspaces for each studio.</div><section className="panel pad-panel project-library"><div className="panel-head"><div><span className="eyebrow">PROJECT LIBRARY</span><h3>Saved projects</h3></div><div className="library-actions"><button className="mini-action" onClick={exportWorkspaceBackup}>Export backup</button><button className="mini-action" onClick={()=>importProjectRef.current?.click()}>Import backup</button></div></div><input ref={importProjectRef} type="file" accept="application/json" hidden onChange={importWorkspaceBackup}/><div className="library-filters"><input placeholder="Search projects, subjects, topics…" value={projectSearch} onChange={e=>setProjectSearch(e.target.value)}/><select value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="all">All categories</option><option value="general">General videos</option><option value="exam">Exam preparation</option></select></div><div className="project-library-list">{workspaceState.projects.filter(item=>(projectFilter==="all"||(item.mode||"exam")===(projectFilter))).filter(item=>(item.name+" "+(item.videoSetup?.topic||"")+" "+(item.videoSetup?.category||"")+" "+(item.videoSetup?.exam||"")).toLowerCase().includes(projectSearch.toLowerCase())).map(item=><div className="project-library-item" key={item.id}><div><b>{item.name}</b><small>{item.mode==="exam"?"Exam Preparation":"General Video"} · {item.videoSetup?.exam||item.videoSetup?.category||"Unclassified"} · {(item.scenes||[]).length} scenes</small></div><button className="mini-action" onClick={()=>activateWorkspace(item)}>Open</button><button className="mini-action" onClick={()=>renameProject(item.id)}>Rename</button><button className="mini-action danger" onClick={()=>deleteProject(item.id)}>Delete</button></div>)}</div><p className="muted">Current storage: this browser only. Use Export backup to keep a portable copy. Cloud sync across devices requires a database and account service and is not enabled in this build.</p></section></section>}
        {active==="create" && <div className="create-layout">
          <section className="panel pad-panel create-main">
            <div className="eyebrow">{workspaceMode === "exam" ? "NEW EXAM LESSON" : "NEW GENERAL VIDEO"}</div><h3>{workspaceMode === "exam" ? "Build a syllabus-focused lesson" : "Create a cinematic video project"}</h3>
            <p className="muted">Choose your content format and production settings. OfficerLab will create an editable starter storyboard; refine the script and scenes before recording or exporting.</p>
            <div className="create-grid">
              <label className="field-label">Video / project title<input value={videoSetup.title} onChange={e=>setVideoSetup(v=>({...v,title:e.target.value}))} placeholder="e.g. Food Safety Act 2006"/></label>
              <label className="field-label">Topic / chapter<input value={videoSetup.topic} onChange={e=>setVideoSetup(v=>({...v,topic:e.target.value}))} placeholder="Enter the subject or chapter"/></label>
              {workspaceMode === "exam" && <label className="field-label">Exam / audience<select value={videoSetup.exam} onChange={e=>setVideoSetup(v=>({...v,exam:e.target.value}))}><option>GPSC Class 1-2</option><option>GSSSB Class 3</option><option>Food Safety Officer</option><option>Talati / Junior Clerk</option><option>UPSC / State PSC</option></select></label>}
              <label className="field-label">{workspaceMode === "exam" ? "Subject / syllabus area" : "Video category"}<select value={videoSetup.category} onChange={e=>setVideoSetup(v=>({...v,category:e.target.value}))}>{workspaceMode === "exam" && <option>GPSC / GSSSB</option>}<option>Indian Polity & Constitution</option><option>History & Culture</option><option>Geography</option><option>Economy</option><option>Science & Technology</option><option>Agriculture</option><option>Food Science & Food Laws</option><option>Reasoning & Quantitative Aptitude</option><option>Current Affairs</option><option>Government Rules & Administration</option><option>Other educational content</option>{workspaceMode === "general" && <><option>Documentary & storytelling</option><option>Brand / promotional</option><option>Interview / podcast</option><option>Travel / lifestyle</option></>}</select></label>
              <label className="field-label">Language<select value={videoSetup.language} onChange={e=>setVideoSetup(v=>({...v,language:e.target.value}))}><option>Gujarati + English</option><option>Gujarati</option><option>Hindi + English</option><option>Hindi</option><option>English</option></select></label>
              <label className="field-label">Target duration<select value={videoSetup.duration} onChange={e=>setVideoSetup(v=>({...v,duration:e.target.value}))}><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label>
              <label className="field-label">Video format<select value={videoSetup.aspect} onChange={e=>setVideoSetup(v=>({...v,aspect:e.target.value}))}><option>16:9 YouTube</option><option>9:16 Shorts / Reels</option><option>1:1 Square</option><option>4:5 Social feed</option></select></label>
              <label className="field-label">Visual style<select value={videoSetup.style} onChange={e=>setVideoSetup(v=>({...v,style:e.target.value}))}><option>Cinematic explainer</option><option>Classroom lecture</option><option>News bulletin</option><option>Documentary</option><option>Whiteboard teaching</option><option>Minimal presentation</option><option>Motion graphics</option></select></label>
              <label className="field-label">Presenter layout<select value={videoSetup.presenter} onChange={e=>setVideoSetup(v=>({...v,presenter:e.target.value}))}><option>Graphics + face camera</option><option>Face camera full screen</option><option>Graphics only / faceless</option><option>Slides + presenter picture-in-picture</option></select></label>
              <label className="field-label">Voiceover plan<select value={videoSetup.voice} onChange={e=>setVideoSetup(v=>({...v,voice:e.target.value}))}><option>Record my own voice</option><option>Presenter camera + mic together</option><option>Import recorded narration</option><option>AI text-to-speech (backend required)</option><option>No narration / music-led</option></select></label>
              <label className="field-label">Captions<select value={videoSetup.captions} onChange={e=>setVideoSetup(v=>({...v,captions:e.target.value}))}><option>Gujarati + English</option><option>Gujarati</option><option>Hindi</option><option>English</option><option>No captions</option></select></label>
              <label className="field-label">Storyboard template<select value={videoSetup.template} onChange={e=>setVideoSetup(v=>({...v,template:e.target.value}))}>{workspaceMode === "exam" ? <><option>Complete lesson</option><option>Concept Explainer</option><option>Shorts / Reels</option><option>MCQ Practice</option></> : <><option>Cinematic story</option><option>Documentary</option><option>Explainer</option><option>Shorts / Reels</option><option>Promo / trailer</option></>}</select></label>
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
              <div className="canvas-wrap"><canvas ref={canvasRef} width="1280" height="720"/><div className="canvas-overlay"><span><Radio size={12}/> PREVIEW</span><span>00:00 / 00:38</span></div>
                {(cameraOn || videoUrl) && <div className="studio-presenter-pip">
                  <span><i/> {cameraOn ? "LIVE PRESENTER" : "RECORDED PRESENTER"}</span>
                  <video ref={studioPresenterVideoRef} muted playsInline autoPlay controls={!cameraOn && !!videoUrl} src={!cameraOn && videoUrl ? videoUrl : undefined}/>
                </div>}
              </div>
              <div className="transport"><button className="play-btn" title={isPlaying ? "Pause scene preview" : "Play scene preview"} onClick={() => { setIsPlaying(value => !value); setStatus(isPlaying ? "Preview paused" : "Playing scene preview"); }}>{isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button><div className="transport-line"><div/></div><span className="timecode">00:00:00</span><button className="icon-btn" onClick={()=>setCaptions(!captions)}><Captions size={17}/></button></div>
            </section>
            <section className="panel scene-panel">
              <div className="panel-head"><div><span className="eyebrow">SEQUENCE</span><h3>Scenes <span className="count">{scenes.length}</span></h3></div><button className="icon-btn gold" onClick={addScene}><Plus size={17}/></button></div>
              <div className="scene-list">{scenes.map((s,i)=><div key={s.id} className={`scene-row-wrap ${selected===s.id?"selected":""}`}><button className="scene-row" onClick={()=>setSelected(s.id)}><span className={`scene-thumb ${s.accent}`}>{String(i+1).padStart(2,"0")}</span><span className="scene-info"><b>{s.title}</b><small>{s.kind}</small></span><span className="scene-time">{s.duration}</span></button><button className="scene-mini-action" title="Duplicate scene" onClick={()=>duplicateScene(s.id)}>⧉</button><button className="scene-mini-action danger" title="Delete scene" onClick={()=>deleteScene(s.id)}>×</button></div>)}</div>
              <button className="add-scene" onClick={addScene}><Plus size={15}/> Add scene</button>
              <div className="scene-editor"><div className="eyebrow">SELECTED SCENE</div><label>Scene title<input value={selectedScene?.title||""} onChange={e=>updateScene("title",e.target.value)}/></label><label>Scene duration (MM:SS)<input value={selectedScene?.duration||"00:10"} onChange={e=>updateScene("duration",e.target.value)} placeholder="00:10"/></label><label>On-screen text<textarea rows="2" value={selectedScene?.text||""} onChange={e=>updateScene("text",e.target.value)}/></label><button className="mini-action danger" onClick={()=>deleteScene(selectedScene.id)}>Delete selected scene</button></div>
            </section>
          </div>
          <div className="lower-grid">
            <section className="panel timeline-panel"><div className="panel-head"><div><span className="eyebrow">MULTITRACK EDITOR</span><h3>Timeline</h3></div><div className="head-actions"><button className="mini-action" onClick={audioPlaying?stopAudioTimeline:playAudioTimeline}>{audioPlaying?"Stop mix preview":"Play audio mix"}</button><span className="format-tag">{scenes.reduce((n,x)=>n+sceneDurationSeconds(x),0).toFixed(0)} sec</span></div></div><div className="timeline-ruler">{Array.from({length:5},(_,i)=>{const total=scenes.reduce((n,x)=>n+sceneDurationSeconds(x),0),seconds=Math.round(total*i/4);return <span key={i}>{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</span>})}</div><div className="track"><span className="track-label">VIDEO</span><div className="track-items">{scenes.map((s,i)=><div key={s.id} draggable onDragStart={()=>{dragSceneId.current=s.id;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorderScene(dragSceneId.current,s.id);dragSceneId.current=null;}} onDragEnd={()=>{dragSceneId.current=null;}} onClick={()=>setSelected(s.id)} title="Drag to reorder; click to select" className={`clip clip-${i%3} ${selected===s.id?"clip-selected":""}`} style={{width:(sceneDurationSeconds(s)/Math.max(1,scenes.reduce((n,x)=>n+sceneDurationSeconds(x),0))*100)+"%"}}>{s.title} · {s.duration}</div>)}</div></div>{["voice","music","sfx"].map(track=>{const clips=audioClips.filter(c=>c.track===track);return <div className="track audio-track-row" key={track}><span className="track-label">{track.toUpperCase()}</span><div className="audio-lane" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=audioDragRef.current;if(!id)return;const rect=e.currentTarget.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),total=Math.max(1,scenes.reduce((n,x)=>n+sceneDurationSeconds(x),0));updateAudioClip(id,{track,start:Math.round(ratio*total*10)/10,sceneId:""});audioDragRef.current=null;setStatus("Audio clip repositioned");}}>{clips.map(clip=>{const total=Math.max(1,scenes.reduce((n,x)=>n+sceneDurationSeconds(x),0)),len=Math.max(.5,(clip.sourceEnd||clip.duration)-(clip.sourceStart||0));return <div key={clip.id} draggable onDragStart={()=>{audioDragRef.current=clip.id;setSelectedAudioClip(clip.id);}} onClick={()=>setSelectedAudioClip(clip.id)} className={"audio-timeline-clip "+(selectedAudioClip===clip.id?"clip-selected":"")} style={{left:(clip.start/total*100)+"%",width:Math.max(4,Math.min(100-clip.start/total*100,len/total*100))+"%"}} title="Drag to reposition or move to another track"><b>{clip.name}</b><small>{clip.start.toFixed(1)}s · {len.toFixed(1)}s</small></div>})}</div><button className="mini-action lane-add" onClick={()=>({voice:audioVoiceInputRef,music:audioMusicInputRef,sfx:audioSfxInputRef}[track]).current?.click()}><Plus size={12}/> Add</button></div>})}
            <div className="audio-editor-panel">{(()=>{const clip=audioClips.find(c=>c.id===selectedAudioClip);if(!clip)return <span className="empty-track">Select a clip to trim, sync, split or merge it. Drag clips horizontally to reposition.</span>;const total=Math.max(1,scenes.reduce((n,x)=>n+sceneDurationSeconds(x),0));return <><div className="audio-editor-title"><b>{clip.name}</b><button className="mini-action" onClick={()=>removeAudioClip(clip.id)}>Remove clip</button></div><div className="audio-editor-grid"><label>Position: {clip.start.toFixed(1)} sec<input type="range" min="0" max={total} step=".1" value={Math.min(total,clip.start)} onChange={e=>updateAudioClip(clip.id,{start:Number(e.target.value),sceneId:""})}/></label><label>Trim in: {clip.sourceStart.toFixed(1)} sec<input type="range" min="0" max={Math.max(.1,clip.duration)} step=".1" value={Math.min(clip.sourceStart,clip.duration||0)} onChange={e=>updateAudioClip(clip.id,{sourceStart:Math.min(Number(e.target.value),clip.sourceEnd-.1)})}/></label><label>Trim out: {clip.sourceEnd.toFixed(1)} sec<input type="range" min="0" max={Math.max(.1,clip.duration)} step=".1" value={Math.min(clip.sourceEnd,clip.duration||0)} onChange={e=>updateAudioClip(clip.id,{sourceEnd:Math.max(Number(e.target.value),clip.sourceStart+.1)})}/></label><label>Volume: {Math.round(clip.volume*100)}%<input type="range" min="0" max="150" step="1" value={Math.round(clip.volume*100)} onChange={e=>updateAudioClip(clip.id,{volume:Number(e.target.value)/100})}/></label><label>Sync to scene<select value={clip.sceneId||""} onChange={e=>attachAudioClipToScene(clip.id,e.target.value)}><option value="">Manual position</option>{scenes.map(scene=><option key={scene.id} value={scene.id}>{scene.title}</option>)}</select></label></div><div className="audio-editor-actions"><button className="mini-action" onClick={()=>splitAudioClip(clip.id)}>Split at midpoint</button><button className="mini-action" onClick={mergeAdjacentAudioClips}>Merge adjacent split clips</button><button className="mini-action" onClick={()=>removeAudioClip(clip.id)}>Cut / delete segment</button></div></>})()}</div>
            <div className="track"><span className="track-label">CAPTIONS</span><div className="caption-clip">Gujarati / English subtitles</div></div></section>
            <section className="panel quick-panel"><div className="panel-head"><div><span className="eyebrow">QUICK ACTIONS</span><h3>Production tools</h3></div><Sparkles size={18} className="gold-text"/></div><button className="action-row" onClick={()=>setActive("script")}><FileText/><span><b>Write your script</b><small>Prepare narration and scene beats</small></span><ChevronDown size={15}/></button><button className="action-row" onClick={()=>setActive("voice")}><Mic/><span><b>Record voiceover</b><small>Capture clean narration</small></span><ChevronDown size={15}/></button><button className="action-row" onClick={()=>setActive("presenter")}><Webcam/><span><b>Record presenter</b><small>Camera and microphone capture</small></span><ChevronDown size={15}/></button></section>
          </div>
        </>}

        {active==="script" && <div className="two-col"><section className="panel pad-panel"><div className="panel-head"><div><span className="eyebrow">SCRIPT EDITOR</span><h3>Gujarati narration</h3></div><span className="format-tag">{wordCount} words</span></div><label className="field-label">Project title<input value={project} onChange={e=>setProject(e.target.value)}/></label><textarea className="script-area" value={script} onChange={e=>setScript(e.target.value)} placeholder="Write your Gujarati narration here…"/><div className="editor-foot"><span>Gujarati + English technical terms supported</span><button className="btn primary" onClick={()=>setStatus("Script saved to project")}>Save script</button></div></section><section className="panel pad-panel"><div className="eyebrow">SCRIPT ASSISTANT</div><h3>AI script studio</h3>
          <div className="ai-assistant-box">
            <label className="field-label">AI provider<select value={aiProvider} onChange={e=>setAiProvider(e.target.value)}><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select></label>
            <div className="ai-provider-state"><span>{aiProvider === "openai" ? "OpenAI" : "Gemini"} · {aiProviders[aiProvider]?.model || "Model configured on Render"}</span><b className={aiProviders[aiProvider]?.configured ? "good" : "pending"}>{aiProviders[aiProvider]?.configured ? "Configured" : "Not configured"}</b></div>
            <button className="btn subtle full" disabled={aiBusy} onClick={testAiProvider}>Test API connection</button>
            <button className="btn primary full" disabled={aiBusy} onClick={generateAiScript}><Sparkles size={15}/>{aiBusy ? "Please wait…" : "Generate full lecture script"}</button>
            {aiNotice && <p className="ai-api-notice" role="status">{aiNotice}</p>}
            <p className="muted">Uses the project topic and current script as source context. Generated text replaces the narration editor; verify factual, legal and exam details against official sources before publishing.</p>
          </div>
          <h3>Production checklist</h3><div className="checklist"><p><Check/> One clear learning objective per scene</p><p><Check/> Explain technical terms in context</p><p><Check/> Keep on-screen text concise</p><p><Check/> Verify facts against official sources</p></div><div className="note-box"><Sparkles size={18}/><div><b>AI integration ready</b><p>Connect your preferred LLM API to generate scripts, scene beats and visual prompts. API keys should be stored server-side, never in browser code.</p></div></div><button className="btn subtle full" onClick={()=>setActive("studio")}>Back to studio</button></section></div>}

        {active==="voice" && <div className="two-col"><section className="panel pad-panel"><div className="eyebrow">VOICE RECORDING / TIMELINE TRACK</div><h3>Record and attach narration</h3><p className="muted">Record narration separately here, or use Presenter → Record video + mic to capture presenter video and microphone voice-over simultaneously in one synchronized clip.</p><div className="record-orb"><div className={audioRecording?"pulse":""}><Mic size={30}/></div></div><div className="center">{audioRecording?<button className="btn danger" onClick={stopAudioRecording}><Square size={15}/> Stop recording</button>:<button className="btn primary" onClick={startAudioRecording}><Mic size={15}/> Start recording</button>}</div>{voiceUrl&&<><div className="recorded"><Check size={16}/> Voice recording ready<a href={voiceUrl} download="officerlab-voice.webm">Download audio</a></div><audio ref={voicePlayerRef} className="voice-player" controls src={voiceUrl} onLoadedMetadata={e=>{const d=Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0;setVoiceDuration(d);setVoiceTrimEnd(prev=>prev>0?Math.min(prev,d):d);e.currentTarget.volume=voiceVolume/100;}}/><div className="voice-edit-controls"><b>Timeline audio editing</b><label>Trim start: {voiceTrimStart.toFixed(1)} sec<input type="range" min="0" max={Math.max(1,voiceDuration)} step="0.1" value={Math.min(voiceTrimStart,voiceDuration||0)} onChange={e=>{const v=Math.min(Number(e.target.value),Math.max(0,voiceTrimEnd-0.1));setVoiceTrimStart(v);setAudioClips(old=>old.map(c=>c.track==="voice"&&c.url===voiceUrl?{...c,sourceStart:v}:c));}}/></label><label>Trim end: {(voiceTrimEnd||voiceDuration).toFixed(1)} sec<input type="range" min="0" max={Math.max(1,voiceDuration)} step="0.1" value={Math.min(voiceTrimEnd||voiceDuration,voiceDuration||0)} onChange={e=>{const v=Math.max(Number(e.target.value),voiceTrimStart+0.1);setVoiceTrimEnd(v);setAudioClips(old=>old.map(c=>c.track==="voice"&&c.url===voiceUrl?{...c,sourceEnd:v}:c));}}/></label><label>Timeline offset: {voiceOffset.toFixed(1)} sec<input type="range" min="0" max="120" step="0.5" value={voiceOffset} onChange={e=>{const v=Number(e.target.value);setVoiceOffset(v);setAudioClips(old=>old.map(c=>c.track==="voice"&&c.url===voiceUrl?{...c,start:v,sceneId:""}:c));}}/></label><label>Volume: {voiceVolume}%<input type="range" min="0" max="150" step="1" value={voiceVolume} onChange={e=>{const v=Number(e.target.value);setVoiceVolume(v);setAudioClips(old=>old.map(c=>c.track==="voice"&&c.url===voiceUrl?{...c,volume:v/100}:c));if(voicePlayerRef.current)voicePlayerRef.current.volume=Math.min(1,v/100);}}/></label><button className="mini-action" onClick={()=>{if(voicePlayerRef.current){voicePlayerRef.current.currentTime=voiceTrimStart;voicePlayerRef.current.play();}setStatus("Playing narration from trim start");}}>Play from trim start</button></div><button className="btn primary full" onClick={()=>{setActive("studio");setStatus("Narration and edit settings attached to timeline");}}>Attach / view in timeline</button></>}</section><section className="panel pad-panel"><div className="eyebrow">VOICE WORKFLOW</div><h3>Voiceover options</h3><div className="option-card"><Mic/><div><b>Own voice recording</b><small>Available now in this browser</small></div><span className="tag-ready">Ready</span></div><div className="option-card"><Volume2/><div><b>AI text-to-speech</b><small>Connect a TTS provider through a secure backend</small></div><span className="tag-planned">Integration</span></div><div className="option-card"><AudioLines/><div><b>Voice timing and sync</b><small>Precise word-level timing is part of the rendering-worker integration</small></div><span className="tag-planned">Next phase</span></div></section></div>}

        {active==="presenter" && <div className="two-col"><section className="panel pad-panel"><div className="panel-head"><div><div className="eyebrow">PRESENTER CAMERA</div><h3>Face-camera recording</h3></div><span className={cameraOn?"tag-ready":"tag-planned"}>{cameraOn?"Connected":"Not connected"}</span></div><div className="camera-box">{cameraOn || videoUrl ? <video ref={videoRef} muted playsInline autoPlay controls={!cameraOn && !!videoUrl} src={!cameraOn && videoUrl ? videoUrl : undefined}/> : <div className="camera-placeholder"><Webcam size={40}/><b>Camera preview</b><small>Connect your camera to begin</small></div>}{recording&&<span className="recording-label"><i/> REC</span>}</div><div className="camera-actions">{!cameraOn?<button className="btn primary" onClick={startCamera}><Webcam size={15}/> Connect camera</button>:<button className="btn subtle" onClick={stopCamera}>Disconnect</button>}{cameraOn&&!recording?<button className="btn danger" onClick={startVideoRecording}><Radio size={15}/> Record video + mic</button>:cameraOn&&<button className="btn danger" onClick={stopVideoRecording}><Square size={15}/> Stop</button>}</div>{videoUrl&&<div className="recorded"><Check size={16}/> Presenter video + microphone audio ready<a href={videoUrl} download="officerlab-presenter-with-audio.webm">Download synced clip</a></div>}</section><section className="panel pad-panel"><div className="eyebrow">COMPOSITION</div><h3>Presenter + graphics</h3><p className="muted">The planned composite workflow places your presenter footage alongside the animated explainer canvas.</p><div className="composition-preview"><div className="comp-slide">GRAPHICS<br/><small>Explainer visual</small></div><div className="comp-presenter"><Webcam size={25}/><small>Presenter</small></div></div><div className="note-box"><AudioLines size={18}/><div><b>Presenter + voice-over together</b><p>When you start presenter recording, the camera stream records its microphone audio and video in the same WebM file. Use headphones to prevent speaker echo. Separate voice-track mixing and final MP4 compositing still require the render worker.</p></div></div></section></div>}

        {active==="assets" && <section className="panel pad-panel"><div className="panel-head"><div><div className="eyebrow">MEDIA LIBRARY</div><h3>Project assets</h3></div><button className="btn primary" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import media</button></div><input ref={fileRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={uploadMedia}/>{mediaUrl?<div className="asset-card"><div className="asset-icon"><FolderOpen/></div><div><b>{mediaName}</b><small>Imported project asset</small></div><button className="icon-btn" onClick={()=>{URL.revokeObjectURL(mediaUrl);setMediaUrl("");setMediaName("");}}><X size={16}/></button></div>:<div className="dropzone" onClick={()=>fileRef.current?.click()}><Upload size={27}/><b>Drop your media here</b><span>or click to browse • Images, video and audio</span></div>}<div className="note-box"><FileText size={18}/><div><b>Rights and credits</b><p>Track the source and licence of every third-party photo, map and music asset before publishing. The Cinematic Skill's Wikimedia Commons workflow can be integrated for credited public-domain and openly licensed images.</p></div></div></section>}

        {active==="export" && <div className="two-col"><section className="panel pad-panel"><div className="eyebrow">DELIVERY</div><h3>Export your video</h3><p className="muted">Export a short animated canvas preview now, or save the project for the full rendering pipeline.</p><label className="field-label">Resolution<select value={quality} onChange={e=>setQuality(e.target.value)}><option>1080p</option><option>720p</option><option>4K</option></select></label><div className="toggle-row"><div><b>Gujarati captions</b><small>Include captions in preview and export SRT separately</small></div><input type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/></div><button className="btn subtle full" disabled={busy} onClick={checkRenderWorker}><Radio size={15}/> Test worker connection</button><button className="btn primary full" disabled={busy} onClick={exportFinalMp4}><Film size={16}/>{busy?"Rendering…":"Render final MP4 (worker)"}</button><button className="btn subtle full" disabled={busy} onClick={exportPreview}><Download size={16}/> Export 8-second preview (WebM)</button>{exportedVideoUrl&&<div className="recorded"><Check size={16}/> Video file ready <a href={exportedVideoUrl} download="officerlab-preview.webm">Download generated video</a></div>}<button className="btn subtle full" onClick={downloadPreviewFrame}><Download size={16}/> Download current preview frame (PNG)</button><button className="btn subtle full" onClick={exportCaptions}><Captions size={16}/> Download subtitle file (.srt)</button><button className="btn subtle full" onClick={saveProject}><FileText size={16}/> Download editable project (.json)</button></section><section className="panel pad-panel"><div className="eyebrow">EXPORT STATUS</div><h3>Production readiness</h3><div className="readiness"><div><span>Script</span><b className="good">Ready</b></div><div><span>Scene graphics preview</span><b className="good">Ready</b></div><div><span>Voice capture</span><b className={voiceUrl?"good":"pending"}>{voiceUrl?"Recorded":"Optional"}</b></div><div><span>Presenter capture</span><b className={videoUrl?"good":"pending"}>{videoUrl?"Recorded":"Optional"}</b></div><div><span>Multitrack audio editing</span><b className={audioClips.length?"good":"pending"}>{audioClips.length?"Ready":"Add audio"}</b></div><div><span>Final MP4 + audio mix</span><b className="pending">{import.meta.env.VITE_RENDER_API_URL?"Worker configured":"Worker URL required"}</b></div></div><div className="note-box"><Film size={18}/><div><b>About this build</b><p>The browser creates a WebM preview. Full MP4 rendering uses the separately deployed FFmpeg worker; configure VITE_RENDER_API_URL and optional VITE_RENDER_API_TOKEN.</p></div></div></section></div>}
      </div>
    </main>
    {showSettings&&<div className="modal-backdrop" onClick={()=>setShowSettings(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="panel-head"><h3>Studio settings</h3><button className="icon-btn" onClick={()=>setShowSettings(false)}><X/></button></div><label className="field-label">Visual theme<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="midnight">Midnight cinematic</option><option value="paper">Warm paper</option></select></label><p className="muted">Your project and recordings remain in this browser unless you download or export them.</p><button className="btn primary full" onClick={()=>setShowSettings(false)}>Done</button></div></div>}
    <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" hidden onChange={uploadMedia}/>
    <input ref={audioVoiceInputRef} type="file" accept="audio/*" multiple hidden onChange={e=>uploadTimelineAudio("voice",e)}/>
    <input ref={audioMusicInputRef} type="file" accept="audio/*" multiple hidden onChange={e=>uploadTimelineAudio("music",e)}/>
    <input ref={audioSfxInputRef} type="file" accept="audio/*" multiple hidden onChange={e=>uploadTimelineAudio("sfx",e)}/>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
