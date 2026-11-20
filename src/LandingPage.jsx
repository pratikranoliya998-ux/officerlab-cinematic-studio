import React, { useState } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, Camera, CheckCircle2, Clapperboard,
  FileVideo2, GraduationCap, Menu, MonitorPlay, Play, Presentation,
  ShieldCheck, Sparkles, X, Mic2, Languages
} from "lucide-react";
import "./landing.css";

const studioUrl = "/?app=studio";
const recorderUrl = "/gpsc-guidance-recorder.html";

const tools = [
  {
    icon: Clapperboard,
    eyebrow: "CREATE",
    title: "Cinematic Creator Studio",
    copy: "Plan a lesson, arrange scenes, refine on-screen text and preview a complete visual story in one focused workspace.",
    points: ["Script and scene workspace", "Motion-graphics preview", "Audio and media timeline"],
    href: studioUrl,
    action: "Explore Creator Studio",
    tone: "gold"
  },
  {
    icon: Presentation,
    eyebrow: "PRESENT",
    title: "GPSC Guidance Recorder",
    copy: "Turn your presentation into a clear recorded lesson with slides, camera, microphone and teaching tools together.",
    points: ["PDF, PPT and PPTX support", "Camera and microphone recording", "Slide navigation and annotations"],
    href: recorderUrl,
    action: "Open Lecture Recorder",
    tone: "blue"
  },
  {
    icon: GraduationCap,
    eyebrow: "LEARN",
    title: "Exam Preparation",
    copy: "Build understanding through structured topics, Gujarati explanations and the English technical terminology used in exams.",
    points: ["GPSC and government exams", "Food Safety Officer topics", "Concept-first study approach"],
    href: "#learning",
    action: "Explore Learning",
    tone: "violet"
  }
];

const steps = [
  { number: "01", title: "Plan the lesson", copy: "Organise the topic, key points and learning sequence before you start recording." },
  { number: "02", title: "Present with clarity", copy: "Use slides, camera, voice and teaching annotations to make ideas easier to follow." },
  { number: "03", title: "Review and publish", copy: "Review your recording or visual preview, then prepare it for your learning audience." }
];

function Brand({ compact = false }) {
  return (
    <a className={"ol-brand" + (compact ? " ol-brand-compact" : "")} href="/" aria-label="OfficerLab home">
      <span className="ol-brand-mark"><span>O</span><i /></span>
      <span className="ol-brand-copy"><b>OFFICERLAB</b><small>LEARN · CREATE · LEAD</small></span>
    </a>
  );
}

function SectionLabel({ children, light = false }) {
  return <div className={"ol-section-label" + (light ? " is-light" : "")}><span />{children}</div>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const links = [
    ["Platform", "#platform"],
    ["Learning", "#learning"],
    ["How it works", "#workflow"],
    ["About", "#about"]
  ];
  return (
    <header className="ol-header">
      <div className="ol-container ol-nav-wrap">
        <Brand />
        <button className="ol-menu-toggle" type="button" onClick={() => setOpen(v => !v)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={"ol-nav" + (open ? " is-open" : "")} aria-label="Main navigation">
          {links.map(([label, href]) => <a key={href} href={href} onClick={close}>{label}</a>)}
          <a className="ol-nav-cta" href={studioUrl} onClick={close}>Open Studio <ArrowUpRight size={15} /></a>
        </nav>
      </div>
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="ol-hero-visual" aria-label="Illustration of the OfficerLab creator workspace">
      <div className="ol-visual-orbit ol-orbit-one" />
      <div className="ol-visual-orbit ol-orbit-two" />
      <div className="ol-float-chip ol-float-top"><span className="ol-live-dot" /> CREATOR WORKSPACE</div>
      <div className="ol-editor-window">
        <div className="ol-window-top"><div className="ol-window-dots"><i /><i /><i /></div><span>OFFICERLAB STUDIO</span><span className="ol-window-status">READY TO CREATE</span></div>
        <div className="ol-window-body">
          <div className="ol-window-side">
            <div className="ol-side-logo"><Clapperboard size={15} /></div>
            <i /><i /><i /><i />
            <span />
          </div>
          <div className="ol-window-main">
            <div className="ol-preview-label">LESSON PREVIEW <span>16:9</span></div>
            <div className="ol-preview-screen">
              <div className="ol-preview-glow" />
              <div className="ol-preview-kicker">OFFICERLAB · LEARNING SERIES</div>
              <div className="ol-preview-title">Ideas into<br /><em>understanding.</em></div>
              <div className="ol-preview-rule" />
              <div className="ol-preview-sub">Gujarati clarity. Professional delivery.</div>
              <div className="ol-preview-person"><span /></div>
            </div>
            <div className="ol-timeline-label"><span>SCENE TIMELINE</span><span>00:42 / 04:18</span></div>
            <div className="ol-timeline"><i /><i /><i /><i /></div>
          </div>
          <div className="ol-window-inspector"><span>PROJECT</span><b>New lesson</b><small>Scene 01</small><div className="ol-inspector-bar" /><small>Voice track</small><div className="ol-audio-bars">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ height: (7 + (i * 13) % 19) + "px" }} />)}</div><div className="ol-inspector-pill"><CheckCircle2 size={12} /> Autosaved locally</div></div>
        </div>
      </div>
      <div className="ol-float-chip ol-float-bottom"><span className="ol-float-icon"><Mic2 size={15} /></span><span><b>VOICE + VISUALS</b><small>One connected lesson workflow</small></span></div>
    </div>
  );
}

function Hero() {
  return (
    <section className="ol-hero" id="home">
      <div className="ol-hero-grid" />
      <div className="ol-container ol-hero-layout">
        <div className="ol-hero-copy">
          <div className="ol-hero-tag"><Sparkles size={14} /> A learning and creation platform</div>
          <h1>Learn with clarity.<br /><span>Create with confidence.</span></h1>
          <p className="ol-hero-gu">વિદ્યાર્થીઓ માટે સમજણ, શિક્ષકો માટે સર્જન — એક જ પ્લેટફોર્મ પર.</p>
          <p className="ol-hero-desc">OfficerLab brings educational content creation and exam-focused learning together. Build better lessons, present with confidence and make complex topics easier to understand.</p>
          <div className="ol-hero-actions">
            <a className="ol-button ol-button-primary" href={studioUrl}>Explore Creator Studio <ArrowRight size={17} /></a>
            <a className="ol-button ol-button-outline" href={recorderUrl}><Play size={15} fill="currentColor" /> Open Lecture Recorder</a>
          </div>
          <div className="ol-hero-meta"><span><CheckCircle2 size={15} /> Gujarati-first learning</span><span><CheckCircle2 size={15} /> Practical creator tools</span></div>
        </div>
        <HeroVisual />
      </div>
      <div className="ol-container ol-scroll-cue"><span /> BUILT FOR CLEARER LEARNING</div>
    </section>
  );
}

function Platform() {
  return (
    <section className="ol-section ol-platform" id="platform">
      <div className="ol-container">
        <div className="ol-section-heading">
          <SectionLabel>THE OFFICERLAB PLATFORM</SectionLabel>
          <div className="ol-heading-row"><h2>Everything you need to<br /><span>teach, create and learn.</span></h2><p>Move from an idea to a structured lesson with tools designed around the way educational content is actually made and shared.</p></div>
        </div>
        <div className="ol-tool-grid">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return <article className={"ol-tool-card tone-" + tool.tone} key={tool.title}>
              <div className="ol-tool-card-top"><span className="ol-tool-icon"><Icon size={21} /></span><span className="ol-tool-number">0{index + 1}</span></div>
              <div className="ol-tool-eyebrow">{tool.eyebrow}</div>
              <h3>{tool.title}</h3>
              <p>{tool.copy}</p>
              <ul>{tool.points.map(point => <li key={point}><CheckCircle2 size={14} />{point}</li>)}</ul>
              <a href={tool.href} className="ol-text-link">{tool.action} <ArrowUpRight size={16} /></a>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}

function Learning() {
  return (
    <section className="ol-section ol-learning" id="learning">
      <div className="ol-container ol-learning-grid">
        <div className="ol-learning-copy">
          <SectionLabel light>LEARNING THAT CONNECTS</SectionLabel>
          <h2>Strong concepts.<br /><span>Clear explanations.</span></h2>
          <p>Exam preparation becomes more manageable when concepts are organised, technical terms are explained and important facts are easy to revise.</p>
          <a className="ol-button ol-button-light" href={studioUrl}>Create a learning project <ArrowRight size={16} /></a>
        </div>
        <div className="ol-learning-cards">
          <article className="ol-learning-card">
            <span className="ol-learning-icon"><GraduationCap size={20} /></span>
            <div><small>01 · COMPETITIVE EXAMS</small><h3>GPSC & Government Exams</h3><p>Structured topics, concept clarity and exam-oriented revision.</p></div>
            <ArrowUpRight size={18} />
          </article>
          <article className="ol-learning-card">
            <span className="ol-learning-icon blue"><ShieldCheck size={20} /></span>
            <div><small>02 · SPECIALISED PREPARATION</small><h3>Food Safety Officer</h3><p>Food laws, microbiology, processing and related technical subjects.</p></div>
            <ArrowUpRight size={18} />
          </article>
          <article className="ol-learning-card">
            <span className="ol-learning-icon violet"><Languages size={20} /></span>
            <div><small>03 · BILINGUAL APPROACH</small><h3>Gujarati + English Terms</h3><p>Understand the topic in Gujarati while retaining essential English terminology.</p></div>
            <ArrowUpRight size={18} />
          </article>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section className="ol-section ol-workflow" id="workflow">
      <div className="ol-container">
        <div className="ol-section-heading centered">
          <SectionLabel>YOUR WORKFLOW</SectionLabel>
          <h2>From first idea to<br /><span>lesson-ready content.</span></h2>
          <p>A simple, repeatable process helps keep every lesson focused and professional.</p>
        </div>
        <div className="ol-steps">
          {steps.map((step, index) => <article className="ol-step" key={step.number}>
            <div className="ol-step-head"><span>{step.number}</span>{index < 2 && <i />}</div>
            <h3>{step.title}</h3><p>{step.copy}</p>
          </article>)}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="ol-section ol-about" id="about">
      <div className="ol-container ol-about-layout">
        <div><SectionLabel>WHY OFFICERLAB</SectionLabel><h2>Technology should make<br /><span>teaching feel simpler.</span></h2></div>
        <div className="ol-about-copy">
          <p>OfficerLab is built around a practical idea: good educational content should be clear, structured and engaging. The platform combines a creator workspace with presentation recording tools and exam-focused learning pathways.</p>
          <div className="ol-about-points"><span><MonitorPlay size={18} /> Visual lesson creation</span><span><Camera size={18} /> Presenter-friendly recording</span><span><BookOpen size={18} /> Concept-led learning</span><span><Languages size={18} /> Gujarati + English support</span></div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    ["What can I do in Creator Studio?", "Use the studio workspace to organise scripts and scenes, work with visual previews and manage lesson media and audio."],
    ["Can I record a presentation with my camera?", "Yes. Open the GPSC Guidance Recorder to combine presentation slides with camera and microphone recording. Your browser will ask for the required permissions."],
    ["Which presentation files are supported?", "The recorder supports PDF, PPT and PPTX uploads. PowerPoint conversion and some export functions require the configured rendering service."],
    ["Is OfficerLab designed for mobile?", "The recorder includes responsive layouts for mobile and desktop. Camera, file access and recording behaviour can vary by browser and device."]
  ];
  const [active, setActive] = useState(0);
  return <section className="ol-section ol-faq" id="faq"><div className="ol-container ol-faq-layout">
    <div><SectionLabel>HELP & SUPPORT</SectionLabel><h2>Questions,<br /><span>answered clearly.</span></h2><p>Quick guidance about the platform and its current tools.</p></div>
    <div className="ol-faq-list">{items.map(([q, a], i) => <article className={"ol-faq-item" + (active === i ? " active" : "")} key={q}>
      <button type="button" onClick={() => setActive(active === i ? -1 : i)} aria-expanded={active === i}><span>{q}</span><i>{active === i ? "−" : "+"}</i></button>
      {active === i && <p>{a}</p>}
    </article>)}</div>
  </div></section>;
}

function Footer() {
  return <footer className="ol-footer"><div className="ol-container">
    <div className="ol-footer-main"><div><Brand /><p>Learn with clarity. Create with confidence.</p></div><div className="ol-footer-links"><a href="#platform">Platform</a><a href="#learning">Learning</a><a href="#workflow">How it works</a><a href={recorderUrl}>Lecture Recorder</a><a href={studioUrl}>Creator Studio</a></div></div>
    <div className="ol-footer-bottom"><span>© {new Date().getFullYear()} OfficerLab. Built for learning and creation.</span><a href="#home">Back to top ↑</a></div>
  </div></footer>;
}

export default function LandingPage() {
  return <div className="ol-site"><Header /><main><Hero /><Platform /><Learning /><Workflow /><About /><FAQ /></main><Footer /></div>;
}
