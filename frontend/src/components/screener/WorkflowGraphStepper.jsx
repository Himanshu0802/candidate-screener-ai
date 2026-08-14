import React from 'react';
import { 
  CheckCircle2, 
  Layers, 
  SidebarOpen,
  Briefcase,
  Sliders,
  FileText,
  Zap,
  Award,
  ShieldCheck
} from 'lucide-react';

export default function WorkflowGraphStepper({
  activeStep,
  setOnlyCardExpanded,
  viewMode,
  setViewMode,
  verticals = [],
  compiledRubric = '',
  mappings = [],
  evaluations = [],
  verdict = ''
}) {
  const steps = [
    { id: 1, label: 'Role & JD', icon: Briefcase, isPassed: verticals.length > 0 },
    { id: 2, label: 'Rubric', icon: Sliders, isPassed: compiledRubric.length > 0 },
    { id: 3, label: 'Resume', icon: FileText, isPassed: mappings.length > 0 },
    { id: 4, label: 'Evaluation', icon: Zap, isPassed: evaluations.length > 0 },
    { id: 5, label: 'Scorecard', icon: Award, isPassed: verdict.length > 0 },
    { id: 6, label: 'Verdict', icon: ShieldCheck, isPassed: verdict.length > 0 }
  ];

  const completedCount = steps.filter(s => s.isPassed).length;

  return (
    <div className="workflow-graph-card">
      {/* Top Toolbar */}
      <div className="graph-top-toolbar">
        <div className="graph-meta-info">
          <div className="graph-title-pill">
            <span className="node-live-dot"></span>
            <span>PIPELINE</span>
          </div>
          <div className="graph-progress-tag">
            <span>{completedCount}/6 Done</span>
            <div className="mini-progress-bar">
              <div className="mini-progress-fill" style={{ width: `${(completedCount / 6) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="view-mode-segmented">
          <button
            className={`mode-btn ${viewMode === 'stack' ? 'active' : ''}`}
            onClick={() => setViewMode('stack')}
            title="Stacked Deck View"
          >
            <Layers size={14} />
            <span>Deck</span>
          </button>
          <button
            className={`mode-btn ${viewMode === 'drawer' ? 'active' : ''}`}
            onClick={() => setViewMode('drawer')}
            title="Focused Stage View"
          >
            <SidebarOpen size={14} />
            <span>Stage</span>
          </button>
        </div>
      </div>

      {/* Nodes */}
      <div className="graph-nodes-track">
        {steps.map((st, idx) => {
          const isCurrent = activeStep === st.id;
          const isPassed = st.isPassed;
          const isAccessible = isPassed || isCurrent || st.id <= activeStep;
          const IconComp = st.icon;

          return (
            <React.Fragment key={st.id}>
              <div
                className={`graph-node-box ${isCurrent ? 'current' : isPassed ? 'passed' : 'locked'}`}
                onClick={() => isAccessible && setOnlyCardExpanded(st.id)}
                title={`Stage 0${st.id}: ${st.label}`}
              >
                <div className="node-icon-bubble">
                  {isPassed ? (
                    <CheckCircle2 size={16} className="pass-icon" />
                  ) : (
                    <IconComp size={16} />
                  )}
                </div>

                <div className="node-text-block">
                  <div className="node-step-tag">0{st.id}</div>
                  <div className="node-main-label">{st.label}</div>
                </div>

                {isCurrent && <div className="node-glow-indicator"></div>}
              </div>

              {idx < steps.length - 1 && (
                <div className={`graph-connector-line ${isPassed ? 'active-flow' : ''}`}>
                  <div className="connector-flow-pulse"></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
