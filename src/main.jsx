import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Camera, CameraOff, Circle, Download, Mic, Play, RotateCcw, Square, Video } from "lucide-react";
import "./style.css";

function PresenterStudio() {
  const liveRef = useRef(null);
  const playbackRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [streamReady, setStreamReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [mp4Url, setMp4Url] = useState("");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [script, setScript] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");

  useEffect(() => {
    if (liveRef.current && streamRef.current && !videoUrl) liveRef.current.srcObject = streamRef.current;
  }, [streamReady, videoUrl]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (mp4Url) URL.revokeObjectURL(mp4Url);
  }, []);

  async function startCamera(facing = cameraFacing) {
    setError("");
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }
      setStreamReady(true);
      setCameraFacing(facing);
    } catch (e) {
      setError(e.name === "NotAllowedError"
        ? "Camera અને microphone permission allow કરો. Browserમાં આ page HTTPS પર હોવું જરૂરી છે."
        : e.name === "NotFoundError"
          ? "Camera અથવા microphone મળ્યા નથી. Device જોડાયેલ છે કે નહીં તપાસો."
          : "Camera શરૂ થઈ શક્યો નથી: " + e.message);
    }
  }

  function stopCamera() {
    if (recording) stopRecording();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStreamReady(false);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || !stream.getVideoTracks().length || !stream.getAudioTracks().length) {
      setError("Recording પહેલાં camera અને microphone બંને connect કરો.");
      return;
    }
    setError("");
    chunksRef.current = [];
    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ].find(type => MediaRecorder.isTypeSupported(type));
    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5000000 } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (blob.size) {
          setVideoUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
          setMp4Url(old => { if (old) URL.revokeObjectURL(old); return ""; });
          setError("");
        } else setError("Recordingમાં data મળ્યો નથી. ફરી પ્રયાસ કરો.");
      };
      recorder.start(1000);
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds(value => value + 1), 1000);
    } catch (e) {
      setError("Recording શરૂ થઈ શક્યું નથી: " + e.message);
    }
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function convertToMp4() {
    const worker = (import.meta.env.VITE_RENDER_API_URL || "").replace(/\\/+$/, "");
    if (!worker) { setError("MP4 export માટે VITE_RENDER_API_URL configure કરેલું હોવું જોઈએ."); return; }
    if (!videoUrl) return;
    setConverting(true); setError("");
    try {
      const response = await fetch(videoUrl);
      const webmBlob = await response.blob();
      const form = new FormData();
      form.append("file", webmBlob, "presenter.webm");
      const headers = {};
      const token = import.meta.env.VITE_RENDER_API_TOKEN || "";
      if (token) headers.Authorization = "Bearer " + token;
      const converted = await fetch(worker + "/convert-presenter", { method: "POST", headers, body: form });
      if (!converted.ok) {
        let message = "MP4 conversion failed (HTTP " + converted.status + ").";
        try { const data = await converted.json(); message = data.detail || message; } catch {}
        throw new Error(message);
      }
      const mp4 = await converted.blob();
      if (!mp4.size || !mp4.type.includes("video")) throw new Error("Workerએ valid MP4 file પરત આપી નથી.");
      setMp4Url(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(mp4); });
    } catch (e) { setError("MP4 export: " + e.message); }
    finally { setConverting(false); }
  }

  function retake() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (mp4Url) URL.revokeObjectURL(mp4Url);
    setMp4Url("");
    setVideoUrl("");
    setError("");
    if (streamReady && liveRef.current && streamRef.current) liveRef.current.srcObject = streamRef.current;
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <div className="presenter-app">
    <header className="presenter-header">
      <div className="presenter-brand"><span className="presenter-mark"><Video size={21}/></span><div><b>OfficerLab</b><small>PRESENTER STUDIO</small></div></div>
      <span className="presenter-private">Your face · Your voice</span>
    </header>
    <main className="presenter-main">
      <div className="presenter-intro"><span className="presenter-kicker">REALISTIC STUDIO RECORDING</span><h1>તમારો video. તમારો અવાજ.</h1><p>કેમેરા સામે બેસો, microphone દ્વારા બોલો અને તમારું presenter lecture એક જ synchronized videoમાં record કરો.</p></div>
      <section className="presenter-stage">
        <div className="presenter-stage-top"><span><i className={recording ? "live-dot active" : "live-dot"}/>{recording ? "RECORDING" : videoUrl ? "RECORDING READY" : streamReady ? "CAMERA READY" : "CAMERA PREVIEW"}</span><span className="presenter-time">{time}</span></div>
        <div className="presenter-screen">
          {videoUrl ? <video ref={playbackRef} src={videoUrl} controls playsInline className="presenter-video"/> :
            <video ref={liveRef} autoPlay muted playsInline className="presenter-video presenter-live"/>}
          {!streamReady && !videoUrl && <div className="presenter-placeholder"><Camera size={42}/><b>તમારો camera preview અહીં દેખાશે</b><small>Camera અને microphone connect કરીને શરૂઆત કરો</small></div>}
          {recording && <div className="presenter-rec"><i/> REC</div>}
        </div>
        <div className="presenter-controls">
          {!streamReady && !videoUrl && <button className="presenter-btn primary" onClick={() => startCamera()}><Camera size={17}/> Connect camera + mic</button>}
          {streamReady && !videoUrl && !recording && <><button className="presenter-btn primary record" onClick={startRecording}><Circle size={16} fill="currentColor"/> Start recording</button><button className="presenter-btn secondary" onClick={() => startCamera(cameraFacing === "user" ? "environment" : "user")}>Switch camera</button><button className="presenter-btn secondary" onClick={stopCamera}><CameraOff size={16}/> Disconnect</button></>}
          {recording && <button className="presenter-btn stop" onClick={stopRecording}><Square size={16} fill="currentColor"/> Stop recording</button>}
          {videoUrl && <><button className="presenter-btn primary" onClick={convertToMp4} disabled={converting || !!mp4Url}>{converting ? "Converting to MP4…" : mp4Url ? "MP4 ready" : "Convert to MP4"}</button>{mp4Url && <a className="presenter-btn primary download" href={mp4Url} download="officerlab-presenter.mp4"><Download size={17}/> Download MP4</a>}<a className="presenter-btn secondary download" href={videoUrl} download="officerlab-presenter-backup.webm"><Download size={15}/> WebM backup</a><button className="presenter-btn secondary" onClick={retake}><RotateCcw size={16}/> Record again</button></>}
        </div>
        {error && <p className="presenter-error" role="alert">{error}</p>}
        {videoUrl && <p className="presenter-success">તમારું presenter video અને microphone audio એક સાથે record થયું છે.</p>}
      </section>
      <section className="presenter-tips">
        <div><Camera size={18}/><span><b>Camera</b><small>Lens આંખના level પર રાખો અને સામે જુઓ.</small></span></div>
        <div><Mic size={18}/><span><b>Voice</b><small>શાંત રૂમમાં બોલો; microphone નજીક રાખો.</small></span></div>
        <div><Play size={18}/><span><b>Lighting</b><small>ચહેરા સામે soft light રાખો; પાછળથી તેજ પ્રકાશ ટાળો.</small></span></div>
      </section>
      <section className="presenter-script">
        <button className="presenter-script-toggle" onClick={() => setShowScript(value => !value)}>{showScript ? "−" : "+"} Optional teleprompter</button>
        {showScript && <><p>તમારી lecture script અહીં paste કરો. આ લખાણ recordમાં ઉમેરાતું નથી; ફક્ત વાંચવા માટે છે.</p><textarea value={script} onChange={e => setScript(e.target.value)} placeholder="નમસ્કાર મિત્રો, OfficerLab માં આપનું સ્વાગત છે..." /><div className="presenter-script-preview">{script || "તમારી script અહીં દેખાશે."}</div></>}
      </section>
      <footer className="presenter-footer">Recording તમારા browserમાં local રહે છે. MP4 export માટે internet connection અને configured render worker જરૂરી છે. Camera/microphone permission જરૂરી છે.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById("root")).render(<PresenterStudio/>);
