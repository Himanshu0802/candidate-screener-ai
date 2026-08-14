import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  ChevronLeft, 
  Lock, 
  Edit3, 
  Trash2,
  Upload,
  User,
  ArrowRight,
  Layers
} from 'lucide-react';

export default function ResumeIngestCard({
  isExpanded,
  onToggleExpand,
  isCompleted,
  isLocked,
  savedResumes = [],
  selectedResumeName = '',
  handleSelectSavedResume,
  candidateName = '',
  setCandidateName,
  uploadedFileName = '',
  resumeText = '',
  setResumeText,
  handleResumeUpload,
  isParsingFile = false,
  mappings = [],
  handleContextMapping,
  isMappingChunks = false,
  handleNextToStep5,
  handleClearResumes,
  onBack
}) {
  const safeResumeText = resumeText || '';
  const safeCandidateName = candidateName || '';
  const safeMappings = Array.isArray(mappings) ? mappings : [];
  const safeSavedResumes = Array.isArray(savedResumes) ? savedResumes : [];

  return (
    <div className={`stacked-step-card ${isExpanded ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}>
      {/* Header Bar */}
      <div className="card-header-bar" onClick={!isLocked ? onToggleExpand : undefined}>
        <div className="step-badge-group">
          <div className={`step-number-bubble ${isCompleted ? 'done' : isExpanded ? 'current' : 'pending'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : '03'}
          </div>
          <div className="step-title-group">
            <h3 className="step-title">Candidate Resume & Semantic Mapping</h3>
            <p className="step-desc">Resume parsing & evidence extraction</p>
          </div>
        </div>

        {/* Peek View */}
        {!isExpanded && isCompleted && (
          <div className="card-summary-chip">
            <span className="summary-title">{safeCandidateName || 'Candidate Profile'}</span>
            <span className="summary-tag">{safeMappings.length} Chunks Mapped</span>
          </div>
        )}

        <div className="card-header-actions">
          {isLocked && <Lock size={15} className="locked-icon" />}
          {!isExpanded && !isLocked && (
            <button className="expand-pill-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && !isLocked && (
        <div className="card-body-content large">
          {/* Cached Selector & Upload Row */}
          <div className="action-subgrid">
            <div className="form-group flex-1">
              <label className="form-label">
                <span className="label-with-icon">
                  <User size={14} className="neon-cyan" />
                  <span>Cached Candidates</span>
                </span>
                {safeSavedResumes.length > 0 && (
                  <span className="meta-text">{safeSavedResumes.length} profiles</span>
                )}
              </label>
              <select
                className="modern-select large"
                value={selectedResumeName}
                onChange={(e) => handleSelectSavedResume(e.target.value)}
              >
                <option value="">-- Or select cached candidate --</option>
                {safeSavedResumes.map((cand, idx) => {
                  const name = typeof cand === 'string' ? cand : cand?.candidate_name || `Candidate ${idx + 1}`;
                  const file = typeof cand === 'object' && cand?.filename ? ` (${cand.filename})` : '';
                  return (
                    <option key={name + idx} value={name}>
                      {name}{file}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-with-icon">
                  <Upload size={14} />
                  <span>Upload File</span>
                </span>
              </label>
              <label className="file-drop-box large">
                <FileText size={16} />
                <span>{isParsingFile ? "Parsing File..." : uploadedFileName || "Upload PDF / DOCX"}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleResumeUpload}
                  style={{ display: 'none' }}
                  disabled={isParsingFile}
                />
              </label>
            </div>
          </div>

          {/* Candidate Full Name */}
          <div className="form-group">
            <label className="form-label">
              <span>Candidate Full Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              className="modern-input large"
              value={safeCandidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>

          {/* Resume Text Area */}
          <div className="form-group">
            <label className="form-label">
              <span>Candidate Resume Text</span>
              <span className="meta-text">{safeResumeText.length} chars</span>
            </label>
            <textarea
              rows={6}
              placeholder="Paste raw resume or upload file above..."
              className="modern-textarea large"
              value={safeResumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          {/* Semantic Mapped Evidence Tags */}
          {safeMappings.length > 0 && (
            <div className="mappings-preview-panel">
              <div className="mappings-header">
                <div className="mappings-title">
                  <CheckCircle2 size={15} />
                  <span>Mapped Evidence Chunks ({safeMappings.length})</span>
                </div>
              </div>
              <div className="mappings-tags-grid">
                {safeMappings.map((m, idx) => (
                  <div key={idx} className="mapping-item-tag large">
                    <span className="tag-category">{m.vertical_name}</span>
                    <span className="tag-snippet">
                      {m.chunk_text?.length > 120 
                        ? `${m.chunk_text.slice(0, 120)}...` 
                        : (m.chunk_text || 'No direct evidence')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="card-footer-toolbar">
            <button onClick={onBack} className="modern-btn secondary">
              <ChevronLeft size={16} />
              <span>Back to Rubric</span>
            </button>

            <div className="footer-right-group">
              <button
                onClick={handleContextMapping}
                className="modern-btn amber"
                disabled={isMappingChunks || !safeResumeText.trim()}
              >
                {isMappingChunks ? (
                  <>
                    <span className="spin-icon">✦</span>
                    <span>Mapping Chunks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Map Chunks</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNextToStep5}
                className="modern-btn primary"
                disabled={!safeCandidateName.trim() || !safeResumeText.trim()}
              >
                <span>Proceed to Evaluation</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
