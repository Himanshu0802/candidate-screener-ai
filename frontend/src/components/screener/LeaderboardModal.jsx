import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Trash2, 
  Filter, 
  Award, 
  CheckCircle2, 
  AlertOctagon, 
  ChevronRight, 
  Calendar,
  Briefcase,
  User,
  Search
} from 'lucide-react';

export default function LeaderboardModal({
  isOpen,
  onClose,
  candidateRegistry,
  savedJds,
  handleDeleteCandidate,
  fetchCandidateRegistry
}) {
  const [filterJd, setFilterJd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  if (!isOpen) return null;

  const filteredCandidates = candidateRegistry.filter((cand) => {
    const matchesJd = !filterJd || cand.jd_id === filterJd;
    const matchesSearch = !searchTerm || cand.name.toLowerCase().includes(searchTerm.toLowerCase()) || cand.jd_title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesJd && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container-large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-glass">
          <div className="modal-header-left">
            <div className="modal-icon-badge">
              <Award size={20} className="neon-cyan" />
            </div>
            <div>
              <h2 className="modal-title">Candidate Assessment Leaderboard</h2>
              <p className="modal-sub">
                Historical candidate evaluations, dimensional breakdowns, and screening verdicts
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Leaderboard">
            <X size={18} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="modal-filter-toolbar">
          <div className="search-box-group">
            <Search size={15} className="input-icon" />
            <input
              type="text"
              placeholder="Search candidates or roles..."
              className="modern-input sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <Filter size={14} className="input-icon" />
            <select
              value={filterJd}
              onChange={(e) => setFilterJd(e.target.value)}
              className="modern-select sm"
            >
              <option value="">All Job Positions ({candidateRegistry.length})</option>
              {savedJds.map((jd) => (
                <option key={jd.id} value={jd.id}>
                  {jd.title.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterJd('');
              setSearchTerm('');
              fetchCandidateRegistry();
            }}
            className="modern-btn secondary sm"
          >
            Reset Filters
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body-scroll">
          {filteredCandidates.length === 0 ? (
            <div className="empty-state-box">
              <FileText size={36} className="empty-icon" />
              <div className="empty-title">No Candidate Records Found</div>
              <p className="empty-desc">
                {candidateRegistry.length === 0
                  ? "Screen your first candidate through the pipeline to populate the registry."
                  : "No candidates match the current position or search filter criteria."}
              </p>
            </div>
          ) : (
            <div className="leaderboard-table-wrapper">
              <table className="modern-data-table">
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Target Position</th>
                    <th>Date Screened</th>
                    <th>Verdict</th>
                    <th className="text-right">Score</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((cand) => {
                    const isFit = cand.verdict?.toLowerCase() === 'fit';
                    return (
                      <tr
                        key={cand.id}
                        className="table-row-interactive"
                        onClick={() => setSelectedCandidate(cand)}
                      >
                        <td className="cand-name-cell">
                          <div className="cand-name-text">{cand.name}</div>
                        </td>
                        <td className="cand-role-cell">
                          <span className="role-badge">{cand.jd_title}</span>
                        </td>
                        <td className="cand-date-cell">
                          {cand.date ? new Date(cand.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <span className={`verdict-pill-tag sm ${isFit ? 'fit' : 'miss'}`}>
                            {cand.verdict?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right">
                          <span className={`cand-score-val ${cand.score >= 7 ? 'neon-green' : 'neon-amber'}`}>
                            {cand.score?.toFixed(1)} / 10
                          </span>
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions-group">
                            <button
                              onClick={() => setSelectedCandidate(cand)}
                              className="modern-btn secondary xs"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(cand.id)}
                              className="modern-btn danger xs"
                              title="Delete candidate"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drill-down Candidate Details Modal */}
        {selectedCandidate && (
          <div className="detail-drawer-overlay" onClick={() => setSelectedCandidate(null)}>
            <div className="detail-drawer-panel" onClick={(e) => e.stopPropagation()}>
              <div className="detail-header">
                <div className="detail-title-block">
                  <h3 className="detail-cand-name">{selectedCandidate.name}</h3>
                  <div className="detail-cand-meta">
                    <span className="meta-pill">{selectedCandidate.jd_title}</span>
                    <span className="meta-date">
                      Screened {selectedCandidate.date ? new Date(selectedCandidate.date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="detail-header-scores">
                  <div className={`verdict-pill-tag ${selectedCandidate.verdict?.toLowerCase() === 'fit' ? 'fit' : 'miss'}`}>
                    {selectedCandidate.verdict?.toUpperCase()}
                  </div>
                  <div className="detail-score-box">
                    <span className="score-num">{selectedCandidate.score?.toFixed(1)}</span>
                    <span className="score-denom">/10</span>
                  </div>
                  <button className="detail-close-btn" onClick={() => setSelectedCandidate(null)}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="detail-body-scroll">
                {/* Executive Summary */}
                <div className="detail-section">
                  <div className="section-subhead">Executive Assessment Summary</div>
                  <p className="detail-summary-text">{selectedCandidate.summary}</p>
                </div>

                {/* Sectional Breakdown */}
                {selectedCandidate.evaluations && selectedCandidate.evaluations.length > 0 && (
                  <div className="detail-section">
                    <div className="section-subhead">Competency Dimensions Breakdown</div>
                    <div className="detail-eval-deck">
                      {selectedCandidate.evaluations.map((ev, i) => (
                        <div key={i} className="detail-eval-card">
                          <div className="detail-eval-header">
                            <span className="eval-name">{ev.vertical_name}</span>
                            <span className="eval-score">{ev.score}/10</span>
                          </div>
                          <p className="eval-rationale">{ev.rationale}</p>
                          
                          <div className="strengths-gaps-grid compact">
                            {ev.green_points && ev.green_points.length > 0 && (
                              <div className="insight-column strengths">
                                <span className="col-tag green">Strengths</span>
                                <ul className="insight-list">
                                  {ev.green_points.map((pt, j) => (
                                    <li key={j} className="insight-item green">{pt}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {ev.miss_points && ev.miss_points.length > 0 && (
                              <div className="insight-column gaps">
                                <span className="col-tag red">Gaps</span>
                                <ul className="insight-list">
                                  {ev.miss_points.map((pt, j) => (
                                    <li key={j} className="insight-item red">{pt}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
