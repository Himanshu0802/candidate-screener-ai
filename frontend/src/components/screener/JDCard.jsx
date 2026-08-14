import React from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  Trash2, 
  Layers, 
  FileText, 
  FolderPlus, 
  Edit3,
  ArrowRight,
  Upload
} from 'lucide-react';

export default function JDCard({
  isExpanded,
  onToggleExpand,
  isCompleted,
  savedJds = [],
  selectedJdId = '',
  handleSelectSavedJd,
  jdTitle = '',
  setJdTitle,
  jdText = '',
  setJdText,
  verticals = [],
  handleSaveJd,
  handleDeleteJd,
  handleClearJds,
  handleNextFromStep1,
  isModularizing = false,
  API_BASE_URL
}) {
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const baseName = file.name.split('.')[0];
    const cleanName = baseName.replace(/_|-/g, ' ').replace(/\d+/g, '').trim();
    if (!jdTitle) setJdTitle(cleanName || baseName);

    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/resume/parse`, {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) throw new Error("Failed to parse file.");
      const data = await resp.json();
      setJdText(data.raw_text);
    } catch (err) {
      alert(err.message);
    }
  };

  const safeJdText = jdText || '';
  const safeTitle = jdTitle || '';

  return (
    <div className={`stacked-step-card ${isExpanded ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
      {/* Header Bar */}
      <div className="card-header-bar" onClick={onToggleExpand}>
        <div className="step-badge-group">
          <div className={`step-number-bubble ${isCompleted ? 'done' : isExpanded ? 'current' : 'pending'}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : '01'}
          </div>
          <div className="step-title-group">
            <h3 className="step-title">Role & Job Description</h3>
            <p className="step-desc">Target criteria & competency extraction</p>
          </div>
        </div>

        {/* Peek View */}
        {!isExpanded && isCompleted && (
          <div className="card-summary-chip">
            <span className="summary-title">{safeTitle || 'Configured Role'}</span>
            <span className="summary-tag">{verticals?.length || 0} Dimensions</span>
          </div>
        )}

        <div className="card-header-actions">
          {!isExpanded && (
            <button className="expand-pill-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="card-body-content large">
          {/* Saved JDs & Upload Row */}
          <div className="action-subgrid">
            <div className="form-group flex-1">
              <label className="form-label">
                <span className="label-with-icon">
                  <Briefcase size={14} className="neon-cyan" />
                  <span>JD Library</span>
                </span>
                {savedJds.length > 0 && (
                  <span className="meta-text">{savedJds.length} saved</span>
                )}
              </label>
              <select
                className="modern-select large"
                value={selectedJdId}
                onChange={(e) => handleSelectSavedJd(e.target.value)}
              >
                <option value="">-- Or select from saved JD library --</option>
                {savedJds.map(jd => (
                  <option key={jd.id} value={jd.id}>
                    {jd.title} ({jd.verticals?.length || 0} dims)
                  </option>
                ))}
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
                <span>Upload PDF / DOCX</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Role Title */}
          <div className="form-group">
            <label className="form-label">
              <span>Position Title</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Fullstack / AI Systems Engineer"
              className="modern-input large"
              value={safeTitle}
              onChange={(e) => setJdTitle(e.target.value)}
            />
          </div>

          {/* Text Area */}
          <div className="form-group">
            <label className="form-label">
              <span>Job Description Text</span>
              <span className="meta-text">{safeJdText.length} chars</span>
            </label>
            <textarea
              rows={6}
              placeholder="Paste job description requirements, responsibilities, and qualifications..."
              className="modern-textarea large"
              value={safeJdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="card-footer-toolbar">
            <div className="footer-left-actions">
              <button
                onClick={handleSaveJd}
                className="modern-btn secondary"
                disabled={!safeJdText.trim()}
              >
                <Save size={15} />
                <span>Save to Library</span>
              </button>

              {selectedJdId && (
                <button
                  onClick={handleDeleteJd}
                  className="modern-btn danger"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <button
              onClick={handleNextFromStep1}
              className="modern-btn primary"
              disabled={isModularizing || !safeJdText.trim()}
            >
              {isModularizing ? (
                <>
                  <span className="spin-icon">✦</span>
                  <span>Modularizing Dimensions...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Modularize & Next</span>
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
