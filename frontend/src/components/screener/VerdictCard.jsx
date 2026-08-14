import React from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertOctagon, 
  Sparkles, 
  Save, 
  RotateCcw, 
  User, 
  ChevronLeft, 
  Edit3
} from 'lucide-react';

export default function VerdictCard({
  isExpanded,
  onToggleExpand,
  isCompleted,
  isLocked,
  verdict = '',
  verdictSummary = '',
  candidateName = '',
  setCandidateName,
  handleSaveCandidate,
  handleOptimizeResume,
  isOptimizingResume = false,
  resumeText = '',
  evaluations = [],
  onScreenNewCandidate,
  onStartOver,
  onBack
}) {
  const isFit = verdict?.toLowerCase() === 'fit';

  return (
    <div className={`stacked-step-card ${isExpanded ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}>
      {/* Header Bar */}
      <div className="card-header-bar" onClick={!isLocked ? onToggleExpand : undefined}>
        <div className="step-badge-group">
          <div className={`step-number-bubble ${isCompleted ? 'done' : isExpanded ? 'current' : 'pending'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : '06'}
          </div>
          <div className="step-title-group">
            <h3 className="step-title">Executive Verdict & Talent Resolution</h3>
            <p className="step-desc">Final recommendation & AI resume alignment</p>
          </div>
        </div>

        {/* Peek View */}
        {!isExpanded && isCompleted && (
          <div className="card-summary-chip">
            <span className={`verdict-pill-tag ${isFit ? 'fit' : 'miss'}`}>
              {verdict.toUpperCase()}
            </span>
            <span className="summary-title">{candidateName || 'Candidate Profile'}</span>
          </div>
        )}

        <div className="card-header-actions">
          {!isExpanded && !isLocked && (
            <button className="expand-pill-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Edit3 size={13} />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && !isLocked && (
        <div className="card-body-content large">
          {/* Hero Verdict Banner */}
          <div className={`hero-verdict-banner large ${isFit ? 'fit' : 'miss'}`}>
            <div className="verdict-status-title">HIRING RESOLUTION</div>
            <div className="verdict-hero-badge large">
              {isFit ? <CheckCircle2 size={36} /> : <AlertOctagon size={36} />}
              <span>{verdict.toUpperCase()}</span>
            </div>
            <div className="verdict-status-sub large">
              {isFit 
                ? "Candidate strongly meets core competency requirements" 
                : "Candidate possesses critical gaps against criteria"}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="executive-summary-card large">
            <div className="summary-card-header">
              <Award size={16} className="neon-cyan" />
              <span>Executive Synthesis</span>
            </div>
            <p className="summary-card-text large">{verdictSummary}</p>
          </div>

          {/* AI Resume Optimization */}
          <div className="optimization-cta-card large">
            <div className="cta-left">
              <div className="cta-title">
                <Sparkles size={18} className="neon-amber" />
                <span>AI Candidate Alignment</span>
              </div>
              <p className="cta-desc">
                Generate an upgraded version of this resume tailored to bridge identified miss points.
              </p>
            </div>
            <button
              onClick={handleOptimizeResume}
              className="modern-btn amber"
              disabled={isOptimizingResume || !resumeText}
            >
              {isOptimizingResume ? (
                <>
                  <span className="spin-icon">✦</span>
                  <span>Generating Aligned Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Generate Aligned Resume</span>
                </>
              )}
            </button>
          </div>

          {/* Save to Leaderboard */}
          <div className="save-registry-card large">
            <div className="save-registry-inputs">
              <div className="form-group flex-1">
                <label className="form-label">
                  <span className="label-with-icon">
                    <User size={14} className="neon-cyan" />
                    <span>Candidate Name</span>
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Confirm candidate name..."
                  className="modern-input large"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveCandidate}
                className="modern-btn secondary"
                disabled={!candidateName?.trim()}
              >
                <Save size={15} />
                <span>Save to Leaderboard</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="card-footer-toolbar">
            <button onClick={onBack} className="modern-btn secondary">
              <ChevronLeft size={16} />
              <span>Back to Scorecard</span>
            </button>

            <div className="footer-right-group">
              <button
                onClick={onStartOver}
                className="modern-btn ghost"
                title="Reset all pipeline state"
              >
                <RotateCcw size={14} />
                <span>Start Over</span>
              </button>

              <button
                onClick={onScreenNewCandidate}
                className="modern-btn primary"
              >
                <User size={15} />
                <span>Screen Next Candidate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
