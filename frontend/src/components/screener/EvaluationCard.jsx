import React from 'react';
import { 
  Zap, 
  CheckCircle2, 
  ChevronLeft, 
  Lock, 
  Edit3, 
  Terminal, 
  Play,
  ArrowRight,
  Cpu
} from 'lucide-react';

export default function EvaluationCard({
  isExpanded,
  onToggleExpand,
  isCompleted,
  isLocked,
  isEvaluating = false,
  evaluationLogs = [],
  evaluations = [],
  activeEvalVertical = '',
  handleRunEvaluation,
  onNext,
  onBack
}) {
  const safeLogs = Array.isArray(evaluationLogs) ? evaluationLogs : [];
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];

  return (
    <div className={`stacked-step-card ${isExpanded ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}>
      {/* Header Bar */}
      <div className="card-header-bar" onClick={!isLocked ? onToggleExpand : undefined}>
        <div className="step-badge-group">
          <div className={`step-number-bubble ${isCompleted ? 'done' : isExpanded ? 'current' : 'pending'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : '04'}
          </div>
          <div className="step-title-group">
            <h3 className="step-title">Batch Agent Evaluation</h3>
            <p className="step-desc">Forced tool-calling & grading execution</p>
          </div>
        </div>

        {/* Peek View */}
        {!isExpanded && isCompleted && (
          <div className="card-summary-chip">
            <span className="summary-title">{safeEvaluations.length} Dimensions Evaluated</span>
          </div>
        )}

        <div className="card-header-actions">
          {isLocked && <Lock size={15} className="locked-icon" />}
          {!isExpanded && !isLocked && (
            <button className="expand-pill-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Edit3 size={13} />
              <span>Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && !isLocked && (
        <div className="card-body-content large">
          {/* Agent Execution Terminal */}
          <div className="agent-terminal-box large">
            <div className="terminal-topbar">
              <div className="terminal-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="terminal-title">
                <Terminal size={14} />
                <span>EVALUATION_AGENT_RUNNER</span>
              </div>
              <div className="terminal-status-chip">
                {isEvaluating ? 'RUNNING' : safeEvaluations.length > 0 ? 'COMPLETE' : 'STANDBY'}
              </div>
            </div>

            <div className="terminal-scroll-area large">
              {safeLogs.length === 0 && !isEvaluating ? (
                <div className="terminal-idle-msg">
                  <Cpu size={18} />
                  <span>Agent runner ready. Click 'Run Evaluation Agents' below to evaluate candidate evidence.</span>
                </div>
              ) : (
                safeLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`terminal-log-line ${
                      log.includes('COMPLETE') || log.includes('SUCCESS') ? 'success' :
                      log.includes('FAIL') || log.includes('ERROR') ? 'error' : 'info'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
              {isEvaluating && (
                <div className="terminal-active-line">
                  <span className="spin-icon">✦</span>
                  <span>Evaluating candidate evidence against grading rubric...</span>
                  <span className="cursor-blink">_</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="card-footer-toolbar">
            <button onClick={onBack} className="modern-btn secondary">
              <ChevronLeft size={16} />
              <span>Back to Resume</span>
            </button>

            <div className="footer-right-group">
              <button
                onClick={handleRunEvaluation}
                className="modern-btn primary"
                disabled={isEvaluating}
              >
                {isEvaluating ? (
                  <>
                    <span className="spin-icon">✦</span>
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    <span>Run Evaluation Agents</span>
                  </>
                )}
              </button>

              {safeEvaluations.length > 0 && (
                <button onClick={onNext} className="modern-btn secondary">
                  <span>View Scorecard</span>
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
