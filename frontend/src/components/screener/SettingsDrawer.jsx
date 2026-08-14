import React from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Globe, 
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function SettingsDrawer({
  isOpen,
  onClose,
  apiConfig,
  setApiConfig,
  availableModels,
  handleTestConfig,
  isTestingConfig,
  configSuccess,
  configMessage
}) {
  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-icon-box">
              <Key size={18} className="neon-cyan" />
            </div>
            <div>
              <h3 className="drawer-title">API & Model Configuration</h3>
              <p className="drawer-sub">Google Gemini & GCP Vertex AI parameters</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close Configuration">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* API Key Section */}
          <div className="form-group">
            <label className="form-label">
              <span>Google Gemini API Key</span>
              <span className="badge-pill required">REQUIRED</span>
            </label>
            <div className="input-with-icon">
              <Key size={16} className="input-icon" />
              <input
                type="password"
                placeholder="AIzaSy..."
                className="modern-input"
                value={apiConfig.api_key}
                onChange={(e) => setApiConfig({ ...apiConfig, api_key: e.target.value })}
              />
            </div>
            <span className="field-hint">
              Get an API Key from Google AI Studio. Stored in memory for this active session.
            </span>
          </div>

          {/* Model Selection */}
          <div className="form-group">
            <label className="form-label">
              <span>Selected Foundation Model</span>
              <span className="badge-pill cyan">
                {availableModels.length > 0 ? `${availableModels.length} DISCOVERED` : 'DEFAULT'}
              </span>
            </label>
            <div className="select-wrapper">
              <Cpu size={16} className="input-icon" />
              <select
                value={apiConfig.model}
                onChange={(e) => setApiConfig({ ...apiConfig, model: e.target.value })}
                className="modern-select"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.display_name} ({m.name})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Token Efficient)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Advanced Reasoning)</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Vertex AI Mode Toggle */}
          <div className="toggle-card">
            <div className="toggle-info">
              <div className="toggle-title">
                <Server size={16} className="neon-cyan" />
                <span>Use GCP Vertex AI Mode</span>
              </div>
              <p className="toggle-desc">
                Route agent reasoning requests through Google Cloud Vertex AI enterprise endpoints.
              </p>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                checked={apiConfig.use_vertex}
                onChange={(e) => setApiConfig({ ...apiConfig, use_vertex: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Vertex AI Credentials */}
          {apiConfig.use_vertex && (
            <div className="vertex-details-box">
              <div className="form-group">
                <label className="form-label">GCP Project ID</label>
                <input
                  type="text"
                  placeholder="e.g. my-cloud-project-123"
                  className="modern-input"
                  value={apiConfig.project_id || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, project_id: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GCP Region / Location</label>
                <input
                  type="text"
                  placeholder="e.g. us-central1"
                  className="modern-input"
                  value={apiConfig.location || ''}
                  onChange={(e) => setApiConfig({ ...apiConfig, location: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Connection Status Feedback */}
          {configMessage && (
            <div className={`status-feedback-banner ${configSuccess ? 'success' : configSuccess === false ? 'error' : 'info'}`}>
              {configSuccess ? (
                <CheckCircle2 size={16} className="feedback-icon" />
              ) : (
                <AlertCircle size={16} className="feedback-icon" />
              )}
              <span className="feedback-text">{configMessage}</span>
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <button
            onClick={handleTestConfig}
            className="modern-btn primary full-width"
            disabled={isTestingConfig}
          >
            {isTestingConfig ? (
              <>
                <RefreshCw size={16} className="spin-icon" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Test & Discover Models</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
