import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Bot, 
  ArrowRight, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Coins, 
  Search, 
  Settings,
  ChevronRight
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function LandingPage({
  setActiveMainView,
  setIsRegistryOpen,
  onOpenSettings,
  apiConfig
}) {
  return (
    <div className="landing-page-container minimal-aesthetic">
      {/* 1. Hero Section */}
      <section className="landing-hero-section minimal-hero">
        {/* Subtle Ambient Background Light */}
        <div className="hero-glow-blob center-glow"></div>

        {/* Minimal Pill Badge */}
        <div className="hero-badge-row">
          <span className="hero-pill-badge minimal-pill">
            <span className="pill-dot"></span>
            Agentic Recruitment & Multi-Modal Intelligence
          </span>
        </div>

        {/* Brand Logo */}
        <div className="hero-logo-wrapper">
          <img 
            src={logoImg} 
            alt="Candidate_screener.ai" 
            className="hero-main-logo minimal-logo" 
          />
        </div>

        {/* Main Headline */}
        <h1 className="hero-headline minimal-headline">
          Evidence-Grounded Candidate Screening <br />
          <span className="gradient-text">& Multi-Modal RAG</span>
        </h1>

        {/* Crisp Subtitle */}
        <p className="hero-subtitle minimal-subtitle">
          Automate multi-axis competency evaluations with zero-token caching, 
          upgrade candidate resumes with AI gap bridging, and query talent artifacts with Google ADK RAG.
        </p>

        {/* Primary Action Buttons */}
        <div className="hero-cta-group minimal-cta-group">
          <button 
            className="minimal-primary-btn"
            onClick={() => setActiveMainView('chat')}
          >
            <Sparkles size={16} />
            <span>Launch Screener</span>
            <ArrowRight size={14} className="btn-arrow" />
          </button>

          <button 
            className="minimal-outline-btn"
            onClick={() => setActiveMainView('screener')}
          >
            <Layers size={16} />
            <span>Modular Pipeline</span>
          </button>

          <button 
            className="minimal-outline-btn"
            onClick={() => setActiveMainView('rag')}
          >
            <Bot size={16} />
            <span>RAG Workbench</span>
          </button>
        </div>

        {/* Subtle Engine Indicator */}
        <div className="minimal-engine-indicator">
          <span className="engine-status-dot"></span>
          <span className="engine-text">Engine: {apiConfig?.model || 'gemini-2.5-flash'}</span>
          <span className="engine-divider">•</span>
          <button className="engine-config-btn" onClick={onOpenSettings}>
            <Settings size={12} />
            <span>API Settings</span>
          </button>
        </div>
      </section>

      {/* 2. Key Metrics Minimal Strip */}
      <section className="landing-metrics-strip minimal-metrics">
        <div className="metric-item">
          <div className="metric-val">0-Token</div>
          <div className="metric-lbl">Pipeline Caching</div>
        </div>
        <div className="metric-separator">/</div>
        <div className="metric-item">
          <div className="metric-val">100%</div>
          <div className="metric-lbl">Evidence Grounded</div>
        </div>
        <div className="metric-separator">/</div>
        <div className="metric-item">
          <div className="metric-val">4 Engines</div>
          <div className="metric-lbl">HNSW, IVFFlat, BM25, GraphQA</div>
        </div>
        <div className="metric-separator">/</div>
        <div className="metric-item">
          <div className="metric-val">Live USD</div>
          <div className="metric-lbl">Gemini 2.5 Pricing Telemetry</div>
        </div>
      </section>

      {/* 3. Three Focused Core Workspaces */}
      <section className="landing-features-section minimal-section">
        <div className="section-header-centered">
          <h2 className="section-title minimal-title">Three Dedicated Workspaces</h2>
          <p className="section-desc minimal-desc">
            Engineered for speed, precision, and deep conversational insights.
          </p>
        </div>

        <div className="features-grid minimal-grid">
          {/* Card 1: Autonomous Screener */}
          <div 
            className="minimal-card clickable"
            onClick={() => setActiveMainView('chat')}
          >
            <div className="card-top">
              <div className="minimal-icon-wrap cyan">
                <Sparkles size={20} />
              </div>
              <span className="card-action-hint">Launch <ChevronRight size={14} /></span>
            </div>
            <h3 className="card-heading">Autonomous Screener</h3>
            <p className="card-body">
              1-Click automated screening with live SSE streaming progress, zero-token pipeline caching, and an interactive context-aware talent copilot.
            </p>
            <div className="card-tags">
              <span className="tag">Live Streaming</span>
              <span className="tag">FIT / MISS Verdict</span>
              <span className="tag">Copilot Chat</span>
            </div>
          </div>

          {/* Card 2: 6-Step Modular Workbench */}
          <div 
            className="minimal-card clickable"
            onClick={() => setActiveMainView('screener')}
          >
            <div className="card-top">
              <div className="minimal-icon-wrap purple">
                <Layers size={20} />
              </div>
              <span className="card-action-hint">Open <ChevronRight size={14} /></span>
            </div>
            <h3 className="card-heading">Modular Workbench</h3>
            <p className="card-body">
              Deep-dive granular controls: JD modularization, calibrated weighting, PDF/DOCX quote mapping, batch agent scoring, and AI resume optimization.
            </p>
            <div className="card-tags">
              <span className="tag">Rubric Compiler</span>
              <span className="tag">Quote Mapping</span>
              <span className="tag">Resume Optimizer</span>
            </div>
          </div>

          {/* Card 3: Google ADK Multi-Modal RAG */}
          <div 
            className="minimal-card clickable"
            onClick={() => setActiveMainView('rag')}
          >
            <div className="card-top">
              <div className="minimal-icon-wrap green">
                <Bot size={20} />
              </div>
              <span className="card-action-hint">Explore <ChevronRight size={14} /></span>
            </div>
            <h3 className="card-heading">Multi-Modal ADK RAG</h3>
            <p className="card-body">
              Multi-turn conversational RAG powered by Google ADK with 4 hybrid search strategies, rolling memory compression, and RAGAS evaluations.
            </p>
            <div className="card-tags">
              <span className="tag">Hybrid Retrieval</span>
              <span className="tag">Rolling Memory</span>
              <span className="tag">RAGAS Evals</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Minimal Workflow Stepper */}
      <section className="landing-workflow-section minimal-flow">
        <div className="flow-container">
          <div className="flow-step">
            <span className="flow-num">01</span>
            <div className="flow-meta">
              <span className="flow-title">Ingest</span>
              <span className="flow-sub">JD Specs & Resumes</span>
            </div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <span className="flow-num">02</span>
            <div className="flow-meta">
              <span className="flow-title">Calibrate</span>
              <span className="flow-sub">0–10 Scoring Rubric</span>
            </div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <span className="flow-num">03</span>
            <div className="flow-meta">
              <span className="flow-title">Evaluate</span>
              <span className="flow-sub">Parallel Batch Agents</span>
            </div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <span className="flow-num">04</span>
            <div className="flow-meta">
              <span className="flow-title">Resolve</span>
              <span className="flow-sub">Verdict & Resume Upgrade</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Minimal Footer */}
      <footer className="minimal-footer">
        <div className="footer-brand-text">
          <span>Candidate_screener.ai</span>
          <span className="dot-sep">•</span>
          <span>Google Gemini 2.5 & Google ADK RAG Platform</span>
        </div>
        <div className="footer-links">
          <button onClick={() => setActiveMainView('chat')}>Screener</button>
          <button onClick={() => setActiveMainView('screener')}>Pipeline</button>
          <button onClick={() => setActiveMainView('rag')}>RAG</button>
          <button onClick={() => setIsRegistryOpen(true)}>Leaderboard</button>
          <button onClick={onOpenSettings}>Settings</button>
        </div>
      </footer>
    </div>
  );
}
