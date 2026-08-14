import React from 'react';
import { 
  Award, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  ChevronLeft, 
  Lock, 
  Edit3, 
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ScorecardStack({
  isExpanded,
  onToggleExpand,
  isCompleted,
  isLocked,
  evaluations = [],
  verticals = [],
  expandedTabs = {},
  toggleTab,
  handleSynthesizeVerdict,
  isSynthesizing = false,
  onBack
}) {
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];
  
  const avgScore = safeEvaluations.length > 0
    ? (safeEvaluations.reduce((acc, curr) => acc + (curr.score || 0), 0) / safeEvaluations.length).toFixed(1)
    : '0.0';

  const scoreNum = parseFloat(avgScore);
  const scoreColor = scoreNum >= 7 ? 'var(--text-green)' : scoreNum >= 5 ? 'var(--text-cyan)' : 'var(--text-red)';

  return (
    <div className={`stacked-step-card ${isExpanded ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}>
      {/* Header Bar */}
      <div className="card-header-bar" onClick={!isLocked ? onToggleExpand : undefined}>
        <div className="step-badge-group">
          <div className={`step-number-bubble ${isCompleted ? 'done' : isExpanded ? 'current' : 'pending'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : '05'}
          </div>
          <div className="step-title-group">
            <h3 className="step-title">Multi-Axis Scorecard & Bento Breakdown</h3>
            <p className="step-desc">Dimensional ratings, strengths & miss points</p>
          </div>
        </div>

        {/* Peek View */}
        {!isExpanded && isCompleted && (
          <div className="card-summary-chip">
            <span className="summary-title">Score:</span>
            <span className="summary-score">{avgScore}/10</span>
          </div>
        )}

        <div className="card-header-actions">
          {isLocked && <Lock size={15} className="locked-icon" />}
          {!isExpanded && !isLocked && (
            <button className="expand-pill-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Edit3 size={13} />
              <span>Scorecard</span>
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && !isLocked && (
        <div className="card-body-content large">
          {/* Aggregate Score Gauge */}
          <div className="scorecard-overview-banner large">
            <div className="score-hero-gauge">
              <span className="score-hero-label">AGGREGATE SCORE</span>
              <div className="score-hero-number large" style={{ color: scoreColor }}>
                {avgScore}
                <span className="score-hero-max">/10</span>
              </div>
            </div>
            <div className="score-hero-text">
              <h4 className="overview-title">Candidate Alignment Synthesis</h4>
              <p className="overview-desc">
                Derived across {safeEvaluations.length} evaluation verticals. Review detailed rationale, strengths, and miss points below before synthesizing final verdict.
              </p>
            </div>
          </div>

          {/* Bento Scorecards Deck */}
          <div className="scorecard-cards-deck">
            {safeEvaluations.map((ev, idx) => {
              const isTabOpen = expandedTabs[ev.vertical_name] !== false;
              const evScore = ev.score || 0;
              const evScoreColor = evScore >= 7 ? 'var(--text-green)' : evScore >= 5 ? 'var(--text-cyan)' : 'var(--text-red)';

              return (
                <div key={idx} className="bento-scorecard-card large">
                  {/* Card Header */}
                  <div className="bento-card-header large" onClick={() => toggleTab(ev.vertical_name)}>
                    <div className="bento-title-group">
                      {isTabOpen ? <ChevronDown size={18} className="neon-cyan" /> : <ChevronRight size={18} />}
                      <span className="bento-title">{ev.vertical_name}</span>
                      <span className="badge-pill cyan">{ev.weight || 'High'}</span>
                    </div>

                    <div className="bento-score-pill" style={{ color: evScoreColor }}>
                      <span>{evScore}</span>
                      <span className="bento-score-denom">/10</span>
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isTabOpen && (
                    <div className="bento-card-body large">
                      <p className="rationale-box">{ev.rationale || 'No rationale generated.'}</p>

                      <div className="strengths-gaps-grid">
                        {/* Green Strengths */}
                        <div className="insight-column">
                          <div className="insight-col-header green">
                            <CheckCircle2 size={15} />
                            <span>Demonstrated Strengths</span>
                          </div>
                          <ul className="insight-list">
                            {(ev.green_points || []).length > 0 ? (
                              ev.green_points.map((pt, pIdx) => (
                                <li key={pIdx} className="insight-item green">✓ {pt}</li>
                              ))
                            ) : (
                              <li className="insight-empty">No distinct strengths identified</li>
                            )}
                          </ul>
                        </div>

                        {/* Red Miss Points */}
                        <div className="insight-column">
                          <div className="insight-col-header red">
                            <span className="cross-icon">✗</span>
                            <span>Identified Gaps / Misses</span>
                          </div>
                          <ul className="insight-list">
                            {(ev.miss_points || []).length > 0 ? (
                              ev.miss_points.map((pt, pIdx) => (
                                <li key={pIdx} className="insight-item red">✗ {pt}</li>
                              ))
                            ) : (
                              <li className="insight-empty">No critical gaps recorded</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="card-footer-toolbar">
            <button onClick={onBack} className="modern-btn secondary">
              <ChevronLeft size={16} />
              <span>Back to Evaluation</span>
            </button>

            <button
              onClick={handleSynthesizeVerdict}
              className="modern-btn primary"
              disabled={isSynthesizing || safeEvaluations.length === 0}
            >
              {isSynthesizing ? (
                <>
                  <span className="spin-icon">✦</span>
                  <span>Synthesizing Resolution...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Synthesize Final Verdict</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
