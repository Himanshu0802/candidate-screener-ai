import React, { useState } from 'react';
import { 
  Cpu, 
  Settings, 
  FileText, 
  Layers, 
  Bot, 
  Sparkles, 
  Coins, 
  ChevronDown,
  RotateCcw,
  Home
} from 'lucide-react';

export default function HeaderNav({
  activeMainView,
  setActiveMainView,
  isRegistryOpen,
  setIsRegistryOpen,
  isRetroTheme,
  setIsRetroTheme,
  onOpenSettings,
  sessionTelemetry,
  apiConfig,
  onReset
}) {
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  const calculateCost = () => {
    const isPro = apiConfig.model?.includes('pro');
    const inputRate = isPro ? 1.25 : 0.075;
    const outputRate = isPro ? 5.00 : 0.30;
    const inputCost = (sessionTelemetry.input_tokens / 1000000) * inputRate;
    const outputCost = (sessionTelemetry.output_tokens / 1000000) * outputRate;
    return (inputCost + outputCost).toFixed(4);
  };

  const totalTokens = sessionTelemetry.input_tokens + sessionTelemetry.output_tokens;

  return (
    <header className="modern-header-glass">
      {/* Brand Icon */}
      <div className="header-left">
        <div 
          className="brand-pill"
          onClick={() => {
            setIsRegistryOpen(false);
            setActiveMainView('landing');
          }}
          title="Candidate Screener AI - Home"
        >
          <div className="brand-logo-glow">
            <Cpu size={18} className="brand-icon" />
          </div>
          <div className="brand-info">
            <div className="brand-title">
              screener<span className="brand-highlight">.ai</span>
            </div>
          </div>
        </div>

        <div className="engine-status-tag" title="Active LLM Model">
          <span className="status-dot"></span>
          <span className="engine-name">{apiConfig.model || 'gemini-2.5-flash'}</span>
        </div>
      </div>

      {/* Center Icon Navigation */}
      <div className="view-switcher-pill">
        <button
          className={`view-tab-btn ${activeMainView === 'landing' && !isRegistryOpen ? 'active' : ''}`}
          onClick={() => {
            setIsRegistryOpen(false);
            setActiveMainView('landing');
          }}
          title="Overview & Key Features"
        >
          <Home size={16} />
          <span>Home</span>
        </button>

        <button
          className={`view-tab-btn ${activeMainView === 'chat' && !isRegistryOpen ? 'active' : ''}`}
          onClick={() => {
            setIsRegistryOpen(false);
            setActiveMainView('chat');
          }}
          title="Autonomous Agent Chat Screener"
        >
          <Sparkles size={16} className="neon-cyan" />
          <span>Agent Chat</span>
        </button>

        <button
          className={`view-tab-btn ${activeMainView === 'screener' && !isRegistryOpen ? 'active' : ''}`}
          onClick={() => {
            setIsRegistryOpen(false);
            setActiveMainView('screener');
          }}
          title="Interactive Pipeline Cards"
        >
          <Layers size={16} />
          <span>Pipeline</span>
        </button>

        <button
          className={`view-tab-btn ${activeMainView === 'rag' && !isRegistryOpen ? 'active' : ''}`}
          onClick={() => {
            setIsRegistryOpen(false);
            setActiveMainView('rag');
          }}
          title="ADK RAG Multi-Modal Workbench"
        >
          <Bot size={16} />
          <span>RAG</span>
        </button>

        <button
          className={`view-tab-btn ${isRegistryOpen ? 'active' : ''}`}
          onClick={() => setIsRegistryOpen(!isRegistryOpen)}
          title="Candidate Leaderboard"
        >
          <FileText size={16} />
          <span>Leaderboard</span>
        </button>
      </div>

      {/* Right Toolbar Controls */}
      {/* Right Telemetry Meter */}
      <div className="header-right">
        {/* Token / Cost Telemetry Pill */}
        <div className="telemetry-pill-container">
          <button 
            className="telemetry-pill-btn"
            onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
            title="Token & Cost Metrics"
          >
            <Coins size={14} className="telemetry-icon neon-cyan" />
            <span className="telemetry-tokens">{totalTokens.toLocaleString()} tok</span>
            <span className="telemetry-cost">${calculateCost()}</span>
            <ChevronDown size={12} className={`telemetry-caret ${showTelemetryDetails ? 'open' : ''}`} />
          </button>

          {showTelemetryDetails && (
            <div className="telemetry-popover">
              <div className="telemetry-popover-title">Telemetry & Cost</div>
              <div className="telemetry-stat-row">
                <span>Input:</span>
                <span className="val-cyan">{sessionTelemetry.input_tokens.toLocaleString()}</span>
              </div>
              <div className="telemetry-stat-row">
                <span>Output:</span>
                <span className="val-green">{sessionTelemetry.output_tokens.toLocaleString()}</span>
              </div>
              <div className="telemetry-stat-row total-cost">
                <span>Est. USD:</span>
                <span className="val-amber">${calculateCost()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
