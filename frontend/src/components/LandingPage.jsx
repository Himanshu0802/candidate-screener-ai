import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Bot, 
  FileText, 
  ArrowRight, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Settings, 
  FileCode2, 
  Terminal, 
  Coins, 
  Search, 
  GitBranch, 
  CheckCircle2 
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function LandingPage({
  setActiveMainView,
  setIsRegistryOpen,
  onOpenSettings,
  apiConfig,
  sessionTelemetry
}) {
  return (
    <div className="landing-page-container">
      {/* 1. Hero Section */}
      <section className="landing-hero-section">
        {/* Subtle Ambient Glow */}
        <div className="hero-glow-blob top-left"></div>
        <div className="hero-glow-blob bottom-right"></div>

        {/* Top Badges */}
        <div className="hero-badge-row">
          <span className="hero-pill-badge neon">
            <Sparkles size={13} className="hero-badge-icon" />
            Candidate_screener.ai ver. 1.2.0
          </span>
          <span className="hero-pill-badge neutral">
            <Cpu size={13} className="hero-badge-icon text-cyan" />
            Powered by Google Gemini 2.5 & Google ADK
          </span>
        </div>

        {/* Logo Visual */}
        <div className="hero-logo-wrapper">
          <img 
            src={logoImg} 
            alt="Candidate_screener.ai" 
            className="hero-main-logo" 
          />
        </div>

        {/* Main Headline */}
        <h1 className="hero-headline">
          Agentic Candidate Assessment & <br />
          <span className="gradient-text">Multi-Modal RAG Workbench</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Next-generation recruitment intelligence platform. Execute high-speed 
          multi-axis competency evaluations, optimize resumes with AI gap bridging, 
          and conduct conversational multi-modal RAG with real-time Gemini pricing telemetry.
        </p>

        {/* Main Action CTAs */}
        <div className="hero-cta-group">
          <button 
            className="hero-primary-btn"
            onClick={() => setActiveMainView('chat')}
          >
            <Sparkles size={18} />
            <span>Launch Autonomous Screener</span>
            <ArrowRight size={16} className="btn-arrow" />
          </button>

          <button 
            className="hero-secondary-btn"
            onClick={() => setActiveMainView('screener')}
          >
            <Layers size={18} />
            <span>6-Step Modular Pipeline</span>
          </button>

          <button 
            className="hero-tertiary-btn"
            onClick={() => setActiveMainView('rag')}
          >
            <Bot size={18} />
            <span>ADK RAG Workbench</span>
          </button>
        </div>

        {/* Model Status & Settings Prompt */}
        <div className="hero-engine-bar">
          <div className="engine-status-indicator">
            <span className="pulse-dot"></span>
            <span className="engine-label">Active Engine:</span>
            <span className="engine-val">{apiConfig?.model || 'gemini-2.5-flash'}</span>
          </div>
          <button 
            className="engine-settings-link"
            onClick={onOpenSettings}
          >
            <Settings size={13} />
            <span>Configure API Key</span>
          </button>
        </div>
      </section>

      {/* 2. Key Metrics & Impact Strip */}
      <section className="landing-metrics-strip">
        <div className="metric-box">
          <div className="metric-icon-wrap cyan">
            <Zap size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-value">0-Token Cache</div>
            <div className="metric-desc">Sub-second repeat evaluations</div>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap green">
            <ShieldCheck size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-value">100% Evidence Grounded</div>
            <div className="metric-desc">Strict quote extraction & 0-10 rubrics</div>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap amber">
            <Search size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-value">4 Search Backends</div>
            <div className="metric-desc">HNSW, IVFFlat, BM25 & GraphQA</div>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap magenta">
            <Coins size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-value">Real-Time Telemetry</div>
            <div className="metric-desc">Official Google Gemini USD rates</div>
          </div>
        </div>
      </section>

      {/* 3. Core Workspaces & Capabilities Showcase */}
      <section className="landing-features-section">
        <div className="section-header-centered">
          <span className="section-eyebrow">CAPABILITY SUITE</span>
          <h2 className="section-title">Built for Modern Talent Acquisition & RAG Engineering</h2>
          <p className="section-desc">
            Choose between frictionless 1-click autonomous assessments, deep-dive granular workbench controls, or multi-modal conversational document intelligence.
          </p>
        </div>

        <div className="features-grid">
          {/* Card 1: Autonomous Chat Screener */}
          <div className="feature-card highlighted">
            <div className="card-badge">POPULAR</div>
            <div className="feature-card-header">
              <div className="feature-icon-box cyan">
                <Sparkles size={22} />
              </div>
              <div className="feature-title-block">
                <h3 className="feature-title">Autonomous Screener Copilot</h3>
                <span className="feature-subtitle">1-Click Automated Screening with Live SSE Streaming</span>
              </div>
            </div>
            <p className="feature-description">
              Upload resumes and select Job Descriptions to trigger a live 5-stage automated screening pipeline with real-time progress logs, zero-token pipeline caching, and contextual talent advisor chat.
            </p>
            <ul className="feature-bullet-list">
              <li><CheckCircle2 size={14} className="bullet-icon" /> Live SSE streaming agent telemetry</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Zero-token caching for repeat evaluations</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Contextual talent copilot with resume memory</li>
            </ul>
            <div className="feature-card-footer">
              <button 
                className="card-launch-btn primary"
                onClick={() => setActiveMainView('chat')}
              >
                <span>Launch Screener</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 2: 6-Step Modular Assessment Workbench */}
          <div className="feature-card">
            <div className="feature-card-header">
              <div className="feature-icon-box purple">
                <Layers size={22} />
              </div>
              <div className="feature-title-block">
                <h3 className="feature-title">6-Step Modular Workbench</h3>
                <span className="feature-subtitle">Granular Human-in-the-Loop Pipeline Control</span>
              </div>
            </div>
            <p className="feature-description">
              Deep-dive into each screening phase: modularize JDs, customize competency priority weights, map verbatim quotes, execute batch dimension evaluations, and inspect scorecards.
            </p>
            <ul className="feature-bullet-list">
              <li><CheckCircle2 size={14} className="bullet-icon" /> Calibrated 0–10 evidence-based grading</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Multi-format PDF / DOCX parsing & quote mapping</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Expandable dimensional scorecard stacks</li>
            </ul>
            <div className="feature-card-footer">
              <button 
                className="card-launch-btn secondary"
                onClick={() => setActiveMainView('screener')}
              >
                <span>Open Workbench</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 3: Google ADK Multi-Modal RAG */}
          <div className="feature-card">
            <div className="feature-card-header">
              <div className="feature-icon-box green">
                <Bot size={22} />
              </div>
              <div className="feature-title-block">
                <h3 className="feature-title">Google ADK Multi-Modal RAG</h3>
                <span className="feature-subtitle">Conversational Document Intelligence & Tool Agent</span>
              </div>
            </div>
            <p className="feature-description">
              Ingest multi-modal PDFs, diagrams, and tables. Query documents using 4 hybrid retrieval engines, rolling memory compression, artifact scope filtering, and RAGAS evaluations.
            </p>
            <ul className="feature-bullet-list">
              <li><CheckCircle2 size={14} className="bullet-icon" /> HNSW, IVFFlat, BM25 & Knowledge Graph</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Rolling context memory compression</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> RAGAS faithfulness & relevance benchmarks</li>
            </ul>
            <div className="feature-card-footer">
              <button 
                className="card-launch-btn secondary"
                onClick={() => setActiveMainView('rag')}
              >
                <span>Explore RAG</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 4: AI Resume Optimizer */}
          <div className="feature-card">
            <div className="feature-card-header">
              <div className="feature-icon-box amber">
                <FileCode2 size={22} />
              </div>
              <div className="feature-title-block">
                <h3 className="feature-title">AI Resume Optimizer</h3>
                <span className="feature-subtitle">Bridge Evaluation Gaps & Tailor Profiles</span>
              </div>
            </div>
            <p className="feature-description">
              Automatically generate upgraded, high-impact Markdown resumes that directly address discovered competency gaps while strictly preserving authentic career history and achievements.
            </p>
            <ul className="feature-bullet-list">
              <li><CheckCircle2 size={14} className="bullet-icon" /> 1-Click Markdown resume synthesis</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Actionable gap-bridging highlights</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Re-screen upgraded resume instantly</li>
            </ul>
            <div className="feature-card-footer">
              <button 
                className="card-launch-btn secondary"
                onClick={() => setActiveMainView('screener')}
              >
                <span>View Optimizer</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 5: Leaderboard & Registry */}
          <div className="feature-card">
            <div className="feature-card-header">
              <div className="feature-icon-box blue">
                <FileText size={22} />
              </div>
              <div className="feature-title-block">
                <h3 className="feature-title">Leaderboard & JD Library</h3>
                <span className="feature-subtitle">Redis-Backed Persistence with JSON Fallback</span>
              </div>
            </div>
            <p className="feature-description">
              Track candidate scorecards on a ranked leaderboard with JD filtering, detailed evaluation modals, and reusable Job Description libraries stored in Redis or local storage.
            </p>
            <ul className="feature-bullet-list">
              <li><CheckCircle2 size={14} className="bullet-icon" /> Ranked candidate scoring registry</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Reusable Job Description repository</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Zero-dependency local file fallbacks</li>
            </ul>
            <div className="feature-card-footer">
              <button 
                className="card-launch-btn secondary"
                onClick={() => setIsRegistryOpen(true)}
              >
                <span>Open Registry</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Card 6: Pricing & Token Telemetry */}
          <div className="feature-card">
            <div className="feature-card-header">
              <div className="feature-icon-box magenta">
                <Coins size={22} />
              </div>
              <div className="feature-title-block">
                <h3 className="feature-title">Telemetry & Cost Intelligence</h3>
                <span className="feature-subtitle">Transparent Model Pricing & Diagnostics</span>
              </div>
            </div>
            <p className="feature-description">
              Monitor exact token expenditures per query, phase, and cumulative session with automatic USD calculations based on official Google Gemini 2.5 rates.
            </p>
            <ul className="feature-bullet-list">
              <li><CheckCircle2 size={14} className="bullet-icon" /> Input & output token counters</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Live USD cost calculation</li>
              <li><CheckCircle2 size={14} className="bullet-icon" /> Dynamic model discovery for API keys</li>
            </ul>
            <div className="feature-card-footer">
              <button 
                className="card-launch-btn secondary"
                onClick={onOpenSettings}
              >
                <span>Configure Settings</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Pipeline Architecture Showcase */}
      <section className="landing-workflow-section">
        <div className="section-header-centered">
          <span className="section-eyebrow">AGENTIC PIPELINE ARCHITECTURE</span>
          <h2 className="section-title">How Candidate_screener.ai Works</h2>
          <p className="section-desc">
            A deterministic, multi-agent evaluation pipeline that guarantees evidence-based objectivity.
          </p>
        </div>

        <div className="pipeline-steps-container">
          <div className="pipeline-step-item">
            <div className="step-number">01</div>
            <div className="step-content">
              <h4 className="step-title">JD Modularization</h4>
              <p className="step-text">Deconstructs job specs into 3–6 critical competency verticals.</p>
            </div>
          </div>

          <div className="pipeline-connector-line"></div>

          <div className="pipeline-step-item">
            <div className="step-number">02</div>
            <div className="step-content">
              <h4 className="step-title">Calibrated Rubric</h4>
              <p className="step-text">Synthesizes rigorous 0–10 evidence-based scoring criteria.</p>
            </div>
          </div>

          <div className="pipeline-connector-line"></div>

          <div className="pipeline-step-item">
            <div className="step-number">03</div>
            <div className="step-content">
              <h4 className="step-title">Quote Mapping</h4>
              <p className="step-text">Extracts verbatim resume statements directly mapped to verticals.</p>
            </div>
          </div>

          <div className="pipeline-connector-line"></div>

          <div className="pipeline-step-item">
            <div className="step-number">04</div>
            <div className="step-content">
              <h4 className="step-title">Batch Agent Scoring</h4>
              <p className="step-text">Computes multi-axis scores, rationales, strengths, and miss points.</p>
            </div>
          </div>

          <div className="pipeline-connector-line"></div>

          <div className="pipeline-step-item">
            <div className="step-number">05</div>
            <div className="step-content">
              <h4 className="step-title">Resolution & Optimize</h4>
              <p className="step-text">Delivers definitive FIT/MISS verdict and synthesized resume upgrade.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Quick-Start CTA Banner */}
      <section className="landing-bottom-cta">
        <div className="bottom-cta-card">
          <div className="cta-left">
            <h3 className="cta-headline">Ready to evaluate your candidates?</h3>
            <p className="cta-sub">
              Experience ultra-fast, evidence-grounded screening and multi-modal RAG in seconds.
            </p>
          </div>
          <div className="cta-actions">
            <button 
              className="hero-primary-btn"
              onClick={() => setActiveMainView('chat')}
            >
              <Sparkles size={16} />
              <span>Start Autonomous Screening</span>
            </button>
            <button 
              className="hero-secondary-btn"
              onClick={() => setActiveMainView('rag')}
            >
              <Bot size={16} />
              <span>Launch RAG Workbench</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. Minimal Footer */}
      <footer className="landing-footer">
        <div className="footer-left">
          <span className="footer-brand">Candidate_screener.ai</span>
          <span className="footer-separator">•</span>
          <span className="footer-meta">Agentic Assessment & Multi-Modal ADK RAG Platform</span>
        </div>
        <div className="footer-right">
          <button 
            className="footer-nav-link"
            onClick={() => setActiveMainView('chat')}
          >
            Agent Chat
          </button>
          <button 
            className="footer-nav-link"
            onClick={() => setActiveMainView('screener')}
          >
            Pipeline
          </button>
          <button 
            className="footer-nav-link"
            onClick={() => setActiveMainView('rag')}
          >
            RAG Workbench
          </button>
          <button 
            className="footer-nav-link"
            onClick={() => setIsRegistryOpen(true)}
          >
            Leaderboard
          </button>
          <button 
            className="footer-nav-link"
            onClick={onOpenSettings}
          >
            Settings
          </button>
        </div>
      </footer>
    </div>
  );
}
