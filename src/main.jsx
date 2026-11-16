import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Camera, CameraOff, Circle, Download, Mic, Play, RotateCcw, Square, Video, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import "./style.css";

const WORKER = (import.meta.env.VITE_RENDER_API_URL || "").replace(/\/+$/, "");
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; resolve(window.pdfjsLib); };
    script.onerror = () => reject(new Error("PDF viewer load ન થયું. Internet connection તપાસો."));
    document.head.appendChild(script);
  });
}
function PresentationStudio() {
  const cameraRef=useRef(null), slideCanvasRef=useRef(null), outputCanvasRef=useRef(null), playbackRef=useRef(null), streamRef=useRef(null), recorderRef=useRef(null), chunksRef=useRef([]), timerRef=useRef(null), rafRef=useRef(null), pdfRef=useRef(null), pageRef=useRef(1), micRef=useRef(null);
  const [file,setFile]=useState(null), [pdfReady,setPdfReady]=useState(false), [page,setPage]=useState(1), [pages,setPages]=useState(0), [streamReady,setStreamReady]=useState(false), [recording,setRecording]=useState(false), [seconds,setSeconds]=useState(0), [videoUrl,setVideoUrl]=useState(""), [mp4Url,setMp4Url]=useState(""), [converting,setConverting]=useState(false), [loading,setLoading]=useState(false), [error,setError]=useState(""), [cameraFacing,setCameraFacing]=useState("user"), [pip,setPip]=useState("bottom-right");
  useEffect(()=>{pageRef.current=page; if(pdfRef.current) drawSlide();},[page,pdfReady]);
  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current); if(rafRef.current)cancelAnimationFrame(rafRef.current); if(recorderRef.current?.state==="recording")recorderRef.current.stop(); streamRef.current?.getTracks().forEach(t=>t.stop()); if(videoUrl)URL.revokeObjectURL(videoUrl); if(mp4Url)URL.revokeObjectURL(mp4Url);},[]);
  async function loadFile(selected){
    if(!selected)return; setError(""); setLoading(true); setPdfReady(false); setFile(selected); setVideoUrl(""); setMp4Url("");
    try{
      let pdfBlob=selected;
      if(/\.pptx?$/i.test(selected.name)){
        if(!WORKER)throw new Error("PPT/PPTX માટે Render worker URL configure હોવું જરૂરી છે.");
        const form=new FormData(); form.append("file",selected,selected.name);
        const response=await fetch(WORKER+"/presentation-to-pdf",{method:"POST",body:form});
        if(!response.ok){let d={};try{d=await response.json()}catch{} throw new Error(d.detail||"PowerPoint conversion failed (HTTP "+response.status+").");}
        pdfBlob=await response.blob();
      } else if(!/\.pdf$/i.test(selected.name)) throw new Error("PDF, PPT અથવા PPTX ફાઇલ પસંદ કરો.");
      const lib=await loadPdfJs(); const bytes=await pdfBlob.arrayBuffer(); const doc=await lib.getDocument({data:bytes}).promise;
      pdfRef.current=doc; setPages(doc.numPages); setPage(1); setPdfReady(true);
    }catch(e){setError(e.message||"Presentation ખોલી શકાતી નથી.");}finally{setLoading(false);}
  }
  async function drawSlide(){
    const canvas=slideCanvasRef.current, doc=pdfRef.current; if(!canvas||!doc)return;
    try{const p=await doc.getPage(pageRef.current); const viewport=p.getViewport({scale:1.5}); canvas.width=viewport.width; canvas.height=viewport.height; await p.render({canvasContext:canvas.getContext("2d"),viewport}).promise;}catch(e){setError("Slide render error: "+e.message);}
  }
  async function startCamera(facing=cameraFacing){
    setError(""); try{
      streamRef.current?.getTracks().forEach(t=>t.stop());
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      streamRef.current=s; micRef.current=s.getAudioTracks()[0];
      if(cameraRef.current){cameraRef.current.srcObject=s;await cameraRef.current.play().catch(()=>{});}
      setStreamReady(true);setCameraFacing(facing);
    }catch(e){setError(e.name==="NotAllowedError"?"Camera અને microphone permission allow કરો. HTTPS જરૂરી છે.":e.message);}
  }
  function stopCamera(){if(recording)stopRecording();streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setStreamReady(false);}
  function drawComposite(){
    const canvas=outputCanvasRef.current, video=cameraRef.current, ctx=canvas?.getContext("2d");
    if(!canvas||!ctx)return;
    const w=1280,h=720; if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.fillStyle="#101827";ctx.fillRect(0,0,w,h);
    const source=slideCanvasRef.current;
    if(source?.width){const scale=Math.min(w/source.width,h/source.height);const sw=source.width*scale,sh=source.height*scale;ctx.drawImage(source,(w-sw)/2,(h-sh)/2,sw,sh);} 
    if(video&&video.readyState>=2){
      const pw=Math.round(w*faceSize/100);
      const ratios={rounded:9/16,rectangle:9/16,square:1,portrait:3/4,circle:1};
      const ph=Math.round(pw/(ratios[faceShape]||9/16));
      const margin=24, x=pip==="bottom-left"?margin:w-pw-margin, y=h-ph-margin;
      ctx.save();
      ctx.shadowColor="#000";ctx.shadowBlur=18;
      ctx.beginPath();
      if(faceShape==="circle"){ctx.ellipse(x+pw/2,y+ph/2,pw/2,ph/2,0,0,Math.PI*2);}
      else if(faceShape==="rounded"){ctx.roundRect(x,y,pw,ph,Math.min(24,pw*.09));}
      else{ctx.rect(x,y,pw,ph);}
      ctx.clip();
      ctx.translate(x+pw,y);ctx.scale(-1,1);
      if(faceShape==="portrait"){const scale=Math.max(pw/video.videoWidth,ph/video.videoHeight);const sw=video.videoWidth*scale,sh=video.videoHeight*scale;ctx.drawImage(video,(pw-sw)/2,(ph-sh)/2,sw,sh);}
      else{const scale=Math.max(pw/video.videoWidth,ph/video.videoHeight);const sw=video.videoWidth*scale,sh=video.videoHeight*scale;ctx.drawImage(video,(pw-sw)/2,(ph-sh)/2,sw,sh);}
      ctx.restore();
      ctx.save();ctx.strokeStyle="#d8ad66";ctx.lineWidth=5;ctx.beginPath();
      if(faceShape==="circle")ctx.ellipse(x+pw/2,y+ph/2,pw/2-2,ph/2-2,0,0,Math.PI*2);
      else if(faceShape==="rounded")ctx.roundRect(x+2,y+2,pw-4,ph-4,Math.min(24,pw*.09));
      else ctx.rect(x+2,y+2,pw-4,ph-4);
      ctx.stroke();ctx.restore();
    }
    if(recording){ctx.fillStyle="#d93040";ctx.beginPath();ctx.arc(34,34,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 18px sans-serif";ctx.fillText("REC",52,40);}
    rafRef.current=requestAnimationFrame(drawComposite);
  }
  async function startRecording(){
    if(!pdfReady||!streamReady){setError("Presentation load કરો અને camera + microphone connect કરો.");return;}
    const canvas=outputCanvasRef.current; const videoStream=canvas.captureStream(30); const audioTracks=streamRef.current?.getAudioTracks()||[];
    const combined=new MediaStream([...videoStream.getVideoTracks(),...audioTracks]);
    chunksRef.current=[];const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t));
    try{const rec=new MediaRecorder(combined,mime?{mimeType:mime,videoBitsPerSecond:6000000}:undefined);recorderRef.current=rec;
      rec.ondataavailable=e=>{if(e.data?.size)chunksRef.current.push(e.data)};
      rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:rec.mimeType||"video/webm"});if(blob.size){setVideoUrl(URL.createObjectURL(blob));setMp4Url("");}};
      drawComposite();rec.start(1000);setSeconds(0);setRecording(true);timerRef.current=setInterval(()=>setSeconds(v=>v+1),1000);
    }catch(e){setError("Recording શરૂ થઈ શક્યું નથી: "+e.message);}
  }
  function stopRecording(){if(timerRef.current)clearInterval(timerRef.current);timerRef.current=null;setRecording(false);if(recorderRef.current?.state==="recording")recorderRef.current.stop();if(rafRef.current)cancelAnimationFrame(rafRef.current);}
  async function convertMp4(){
    if(!WORKER){setError("MP4 માટે VITE_RENDER_API_URL configure કરો.");return;}setConverting(true);setError("");
    try{const blob=await(await fetch(videoUrl)).blob();const form=new FormData();form.append("file",blob,"presentation-presenter.webm");const res=await fetch(WORKER+"/convert-presenter",{method:"POST",body:form});if(!res.ok){let d={};try{d=await res.json()}catch{}throw new Error(d.detail||"MP4 conversion failed.");}const out=await res.blob();setMp4Url(URL.createObjectURL(out));}
    catch(e){setError(e.message);}finally{setConverting(false);}
  }
  function retake(){if(videoUrl)URL.revokeObjectURL(videoUrl);if(mp4Url)URL.revokeObjectURL(mp4Url);setVideoUrl("");setMp4Url("");setError("");}
  const time=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
  return <div className="presenter-app">
    <header className="presenter-header"><div className="presenter-brand"><span className="presenter-mark"><Video size={21}/></span><div><b>OfficerLab</b><small>PRESENTATION STUDIO</small></div></div><span className="presenter-private">Your slides · Your face · Your voice</span></header>
    <main className="presenter-main"><div className="presenter-intro"><span className="presenter-kicker">PRESENTATION + CAMERA RECORDING</span><h1>Slides સાથે તમારું lecture record કરો</h1><p>PDF અથવા PowerPoint upload કરો. તમારો ચહેરો slideના ખૂણામાં દેખાશે અને તમારો અવાજ સાથે record થશે.</p></div>
      <section className="presenter-stage">
        <div className="presenter-stage-top"><span><i className={recording?"live-dot active":"live-dot"}/>{recording?"RECORDING":pdfReady?"PRESENTATION READY":"UPLOAD PRESENTATION"}</span><span className="presenter-time">{time}</span></div>
        <div className="presentation-preview">
          <canvas ref={slideCanvasRef} className="presentation-canvas"/><canvas ref={outputCanvasRef} width="1280" height="720" className="recording-canvas"/>
          {!pdfReady&&!videoUrl&&<div className="presenter-placeholder"><Upload size={40}/><b>તમારી PPT અથવા PDF અહીં upload કરો</b><small>PDF, PPT અને PPTX supported</small></div>}
          {pdfReady&&!videoUrl&&<video ref={cameraRef} autoPlay muted playsInline className={`camera-pip-preview shape-${faceShape}`} style={{width:`${faceSize}%`,aspectRatio:faceShape==="portrait"?"3 / 4":faceShape==="square"||faceShape==="circle"?"1 / 1":"16 / 9"}}/>}
          {videoUrl&&<video ref={playbackRef} src={videoUrl} controls playsInline className="presenter-video"/>}
        </div>
        <div className="presentation-upload"><label className="presenter-btn secondary"><Upload size={16}/>{file?file.name:"Choose PPT / PDF"}<input type="file" accept=".pdf,.ppt,.pptx" onChange={e=>loadFile(e.target.files?.[0])} hidden/></label>{loading&&<span className="upload-state">Presentation તૈયાર થઈ રહી છે…</span>}
          {pdfReady&&<div className="slide-navigation"><button className="presenter-btn secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/> Previous</button><span>Slide {page} / {pages}</span><button className="presenter-btn secondary" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next <ChevronRight size={16}/></button></div>}
        </div>
        {pdfReady&&streamReady&&!videoUrl&&<div className="face-layout-controls">
          <div className="face-control-heading"><b>Presenter camera layout</b><small>Face size, shape અને position બદલો — recordingમાં પણ live update થશે.</small></div>
          <label className="face-size-control"><span>Face size <b>{faceSize}%</b></span><input type="range" min="12" max="45" step="1" value={faceSize} onChange={e=>setFaceSize(Number(e.target.value))}/></label>
          <label className="face-select-control"><span>Camera shape</span><select value={faceShape} onChange={e=>setFaceShape(e.target.value)}><option value="rounded">Rounded rectangle</option><option value="rectangle">Rectangle</option><option value="square">Square</option><option value="portrait">Portrait (3:4)</option><option value="circle">Circle</option></select></label>
          <label className="face-select-control"><span>Position</span><select value={pip} onChange={e=>setPip(e.target.value)}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option></select></label>
        </div>}
        <div className="presenter-controls">
          {!streamReady&&!videoUrl&&<button className="presenter-btn primary" onClick={()=>startCamera()}><Camera size={17}/> Connect camera + mic</button>}
          {streamReady&&!recording&&!videoUrl&&<><button className="presenter-btn secondary" onClick={()=>startCamera(cameraFacing==="user"?"environment":"user")}>Switch camera</button><button className="presenter-btn secondary" onClick={stopCamera}><CameraOff size={16}/> Disconnect</button><button className="presenter-btn primary record" onClick={startRecording} disabled={!pdfReady}><Circle size={16} fill="currentColor"/> Start recording</button></>}
          {recording&&<button className="presenter-btn stop" onClick={stopRecording}><Square size={16} fill="currentColor"/> Stop recording</button>}
          {videoUrl&&<><button className="presenter-btn primary" onClick={convertMp4} disabled={converting||!!mp4Url}>{converting?"Converting…":mp4Url?"MP4 ready":"Convert to MP4"}</button>{mp4Url&&<a className="presenter-btn primary download" href={mp4Url} download="officerlab-presentation.mp4"><Download size={16}/> Download MP4</a>}<a className="presenter-btn secondary download" href={videoUrl} download="officerlab-presentation.webm"><Download size={16}/> WebM backup</a><button className="presenter-btn secondary" onClick={retake}><RotateCcw size={16}/> Record again</button></>}
        </div>
        {error&&<p className="presenter-error">{error}</p>}
      </section>
      <section className="presenter-tips"><div><Camera size={18}/><span><b>Camera</b><small>Face slideના ખૂણામાં દેખાશે.</small></span></div><div><Mic size={18}/><span><b>Audio</b><small>તમારો microphone audio સાથે record થશે.</small></span></div><div><Play size={18}/><span><b>Slides</b><small>Recording દરમિયાન Next/Previousથી slide બદલો.</small></span></div></section>
      <footer className="presenter-footer">Recording તમારા browserમાં બને છે. PPT/PPTXને PDFમાં બદલવા અને MP4 export માટે configured Render worker તથા internet જરૂરી છે. Camera permission જરૂરી છે.</footer>
    </main>
  </div>;
}
const root=createRoot(document.getElementById("root"));root.render(<PresentationStudio/>);
