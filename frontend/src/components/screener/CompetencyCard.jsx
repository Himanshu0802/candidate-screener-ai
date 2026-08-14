import React, { useState } from 'react';
import { 
  Sliders, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Lock, 
  Edit3,
  Layers,
  ArrowRight,
  Code
} from 'lucide-react';

export default function CompetencyCard({
  isExpanded,
  onToggleExpand,
  isCompleted,
  isLocked,
  verticals = [],
  setVerticals,
  compiledRubric = '',
  setCompiledRubric,
  handleCompileRubric,
  isCompilingRubric = false,
  onBack
}) {
  const [newDimName, setNewDimName] = useState('');
  const [newDimDesc, setNewDimDesc] = useState('');
  const [showRubricDrawer, setShowRubricDrawer] = useState(false);

  const safeVerticals = Array.isArray(verticals) ? verticals : [];

  const handleSetWeight = (idx, weight) => {
    const updated = [...safeVerticals];
    updated[idx] = { ...updated[idx], weight };
    setVerticals(updated);
  };

  const handleDeleteDimension = (idx) => {
    const updated = safeVerticals.filter((_, i) => i !== idx);
    setVerticals(updated);
  };

  const handleAddDimension = () => {
    if (!newDimName.trim()) return;
    setVerticals([
      ...safeVerticals,
      {
        name: newDimName.trim(),
        description: newDimDesc.trim() || 'Custom evaluation criterion',
        weight: 'High'
      }
    ]);
    setNewDimName('');
    setNewDimDesc('');
  };

  return (
    <div className={`stacked-step-card ${isExpanded ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}>
      {/* Header Bar */}
      <div className="card-header-bar" onClick={!isLocked ? onToggleExpand : undefined}>
        <div className="step-badge-group">
          <div className={`step-number-bubble ${isCompleted ? 'done' : isExpanded ? 'current' : 'pending'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : '02'}
          </div>
          <div className="step-title-group">
            <h3 className="step-title">Competency Calibration & Rubric</h3>
            <p className="step-desc">Dimension weighting & grading rubric</p>
          </div>
        </div>

        {/* Peek View */}
        {!isExpanded && isCompleted && (
          <div className="card-summary-chip">
            <span className="summary-title">{safeVerticals.length} Dimensions Calibrated</span>
          </div>
        )}

        <div className="card-header-actions">
          {isLocked && <Lock size={15} className="locked-icon" />}
          {!isExpanded && !isLocked && (
            <button className="expand-pill-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Edit3 size={13} />
              <span>Calibrate</span>
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && !isLocked && (
        <div className="card-body-content large">
          {/* Dimensions Grid */}
          <div className="competency-cards-grid large">
            {safeVerticals.map((v, idx) => (
              <div key={idx} className="dimension-item-card large">
                <div className="dimension-header">
                  <div>
                    <h4 className="dimension-title">{v.name}</h4>
                    <p className="dimension-desc">{v.description}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDimension(idx)}
                    className="delete-dim-btn"
                    title="Remove dimension"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Priority Weight Segmented Control */}
                <div className="weight-segmented-control large">
                  <span className="weight-label">Weight:</span>
                  {['High', 'Medium', 'Low', 'Ignore'].map((w) => {
                    const isSelected = (v.weight || 'High').toLowerCase() === w.toLowerCase();
                    return (
                      <button
                        key={w}
                        type="button"
                        className={`weight-choice-btn ${isSelected ? `active ${w.toLowerCase()}` : ''}`}
                        onClick={() => handleSetWeight(idx, w)}
                      >
                        {w === 'Medium' ? 'Med' : w === 'Ignore' ? 'Off' : w}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Dimension */}
          <div className="add-dimension-box">
            <div className="add-dim-title">
              <Plus size={15} className="neon-cyan" />
              <span>Add Custom Competency Dimension</span>
            </div>
            <div className="add-dim-inputs">
              <input
                type="text"
                placeholder="Dimension Name (e.g. Distributed Systems Architecture)..."
                className="modern-input large flex-1"
                value={newDimName}
                onChange={(e) => setNewDimName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Criteria details..."
                className="modern-input large flex-1"
                value={newDimDesc}
                onChange={(e) => setNewDimDesc(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddDimension}
                className="modern-btn secondary"
                disabled={!newDimName.trim()}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Collapsible Compiled Rubric Drawer */}
          {compiledRubric && (
            <div className="rubric-prompt-drawer">
              <button
                type="button"
                className="rubric-toggle-btn"
                onClick={() => setShowRubricDrawer(!showRubricDrawer)}
              >
                <Code size={13} />
                <span>{showRubricDrawer ? 'Hide Compiled Rubric Prompt' : 'View Compiled Rubric Prompt'}</span>
              </button>
              {showRubricDrawer && (
                <div className="compiled-rubric-view">
                  <pre className="rubric-pre-text">{compiledRubric}</pre>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="card-footer-toolbar">
            <button onClick={onBack} className="modern-btn secondary">
              <ChevronLeft size={16} />
              <span>Back to Role</span>
            </button>

            <button
              onClick={handleCompileRubric}
              className="modern-btn primary"
              disabled={isCompilingRubric || safeVerticals.length === 0}
            >
              {isCompilingRubric ? (
                <>
                  <span className="spin-icon">✦</span>
                  <span>Compiling Rubric...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Compile Rubric & Next</span>
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
