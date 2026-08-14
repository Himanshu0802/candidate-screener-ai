import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Copy, 
  Download, 
  RefreshCw, 
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function AlignedResumeModal({
  isOpen,
  onClose,
  candidateName,
  alignedResumeText,
  alignedHighlights,
  handleCopyAlignedResume,
  handleDownloadAlignedResume,
  handleReScreenAlignedResume,
  copySuccess
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container-large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-glass">
          <div className="modal-header-left">
            <div className="modal-icon-badge amber">
              <Sparkles size={20} className="neon-amber" />
            </div>
            <div>
              <h2 className="modal-title">
                AI Aligned Resume & Optimization // {(candidateName || "Candidate").toUpperCase()}
              </h2>
              <p className="modal-sub">
                Target-optimized candidate profile tailored to Job Description competencies
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* Highlights Box */}
          {alignedHighlights && alignedHighlights.length > 0 && (
            <div className="optimization-highlights-card">
              <div className="highlights-header">
                <CheckCircle2 size={16} className="neon-green" />
                <span>Target Enhancements & Gaps Addressed:</span>
              </div>
              <ul className="highlights-list">
                {alignedHighlights.map((hl, idx) => (
                  <li key={idx} className="highlight-item">{hl}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Text View */}
          <div className="code-display-box">
            <div className="code-display-header">
              <span>Optimized Markdown Resume</span>
              <span className="code-meta">{alignedResumeText?.length || 0} characters</span>
            </div>
            <pre className="code-pre-content">{alignedResumeText}</pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer-toolbar">
          <div className="footer-left-group">
            <button
              onClick={handleCopyAlignedResume}
              className="modern-btn secondary sm"
            >
              <Copy size={14} />
              <span>{copySuccess ? "Copied to Clipboard!" : "Copy Markdown"}</span>
            </button>
            <button
              onClick={() => handleDownloadAlignedResume('md')}
              className="modern-btn secondary sm"
            >
              <Download size={14} />
              <span>Download .MD</span>
            </button>
            <button
              onClick={() => handleDownloadAlignedResume('txt')}
              className="modern-btn secondary sm"
            >
              <Download size={14} />
              <span>Download .TXT</span>
            </button>
          </div>

          <button
            onClick={handleReScreenAlignedResume}
            className="modern-btn amber sm"
          >
            <RefreshCw size={14} />
            <span>Re-Screen with This Resume (Step 3)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
