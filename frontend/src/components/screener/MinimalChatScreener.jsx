import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertOctagon, 
  FileText, 
  Briefcase, 
  Layers, 
  Coins, 
  Zap, 
  Clock, 
  Save, 
  Award,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileCheck,
  Paperclip,
  Settings,
  Sun,
  Moon,
  RotateCcw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const MODEL_COSTS = {
  'gemini-2.5-flash': { in: 0.000075 / 1000, out: 0.0003 / 1000 },
  'gemini-2.0-flash': { in: 0.0001 / 1000, out: 0.0004 / 1000 },
  'gemini-1.5-pro': { in: 0.00125 / 1000, out: 0.005 / 1000 },
  'gemini-1.5-flash': { in: 0.000075 / 1000, out: 0.0003 / 1000 },
  'default': { in: 0.0001 / 1000, out: 0.0004 / 1000 }
};

export default function MinimalChatScreener({
  apiConfig,
  savedJds = [],
  savedResumes = [],
  onOpenAlignedModal,
  fetchCandidateRegistry,
  onOpenSettings,
  onReset
}) {
  const [sessions, setSessions] = useState(() => {
    try {
      const stored = localStorage.getItem('screener_chat_sessions_v2');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id || 'default');

  // Input & Attachment States
  const [inputVal, setInputVal] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [jdText, setJdText] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  
  // Unified 2-Step Attachment Modal (1: Role & JD, 2: Candidate Resume)
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachModalStep, setAttachModalStep] = useState(1);
  const [isParsingResume, setIsParsingResume] = useState(false);

  // Autonomous Execution State
  const [isScreening, setIsScreening] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [screeningLogs, setScreeningLogs] = useState([]);
  const [showExecutionLogs, setShowExecutionLogs] = useState(false);

  // Sidebar Shelf
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedScorecards, setExpandedScorecards] = useState({});

  const toggleScorecards = (msgIdx) => {
    setExpandedScorecards(prev => ({
      ...prev,
      [msgIdx]: !prev[msgIdx]
    }));
  };

  const messagesEndRef = useRef(null);

  function createNewSession() {
    return {
      id: 'sess_' + Date.now(),
      title: 'New Screening Session',
      createdAt: new Date().toISOString(),
      tokens: { input_tokens: 0, output_tokens: 0 },
      messages: [
        {
          role: 'model',
          text: 'Hello! I am your AI Candidate Screening Copilot.\n\nAttach a **Job Description** and a **Candidate Resume** using the buttons below, then click **Run AI Screen** to execute the end-to-end evaluation pipeline.'
        }
      ],
      result: null
    };
  }

  useEffect(() => {
    try {
      localStorage.setItem('screener_chat_sessions_v2', JSON.stringify(sessions));
    } catch (e) {
      console.error(e);
    }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isScreening, screeningLogs]);

  const calculateCost = (tokens, modelName) => {
    const rate = MODEL_COSTS[modelName] || MODEL_COSTS['default'];
    const cost = (tokens.input_tokens * rate.in) + (tokens.output_tokens * rate.out);
    return cost.toFixed(4);
  };

  const handleNewSession = () => {
    const newSess = createNewSession();
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
    setJdTitle('');
    setJdText('');
    setCandidateName('');
    setResumeText('');
    setResumeFileName('');
    setScreeningLogs([]);
    setCurrentStepIndex(0);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      handleNewSession();
      return;
    }
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  // Upload Resume File
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsParsingResume(true);

    const baseName = file.name.split('.')[0];
    const cleanName = baseName.replace(/_|-/g, ' ').replace(/\d+/g, '').trim();
    if (!candidateName) setCandidateName(cleanName || baseName);
    setResumeFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/resume/parse`, {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) throw new Error("Failed to parse file.");
      const data = await resp.json();
      setResumeText(data.raw_text);
      setShowResumeModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsParsingResume(false);
    }
  };

  // Select Cached Resume
  const handleSelectCachedResume = async (candIdentifier) => {
    if (!candIdentifier) return;
    try {
      const url = `${API_BASE_URL}/api/resumes/cache?candidate_name=${encodeURIComponent(candIdentifier)}&jd_id=jd_custom`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setCandidateName(data.candidate_name);
        setResumeText(data.resume_text);
        setResumeFileName(data.filename || `${data.candidate_name}.txt`);
        setShowResumeModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Select Saved JD
  const handleSelectSavedJd = (id) => {
    if (!id) return;
    const jd = savedJds.find(j => j.id === id);
    if (jd) {
      setJdText(jd.jd_text);
      setJdTitle(jd.title);
      setShowJdModal(false);
    }
  };

  // Autonomous Pipeline Trigger with Real-Time SSE Streaming
  const handleRunAutonomousScreen = async () => {
    if (!jdText.trim()) {
      setShowJdModal(true);
      return;
    }
    if (!resumeText.trim()) {
      setShowResumeModal(true);
      return;
    }
    if (!apiConfig?.api_key) {
      alert("API Key required. Please configure your key in Settings.");
      return;
    }

    const targetTitle = jdTitle || "Target Role";
    const candTitle = candidateName || "Candidate";

    setIsScreening(true);
    setCurrentStepIndex(1);
    setShowExecutionLogs(true);
    setScreeningLogs(["✦ Launching Autonomous Screening Pipeline..."]);

    const userMsg = {
      role: 'user',
      text: `Screen [${candTitle}] for [${targetTitle}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const initialScreeningMsg = {
      role: 'model',
      isScreeningRun: true,
      currentStepIndex: 1,
      screeningLogs: ["✦ Launching Autonomous Screening Pipeline..."],
      text: `Evaluating candidate **${candTitle}** against **${targetTitle}**...`,
      result: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: `${candTitle} · ${targetTitle}`,
          messages: [...s.messages, userMsg, initialScreeningMsg]
        };
      }
      return s;
    }));

    try {
      const resp = await fetch(`${API_BASE_URL}/api/agent/autonomous_screen/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdText,
          jd_title: targetTitle,
          candidate_name: candTitle,
          resume_text: resumeText,
          config: apiConfig
        })
      });

      if (!resp.ok) {
        throw new Error(`Screening stream failed with status ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const trimmed = rawLine.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const event = JSON.parse(dataStr);
            if (event.type === 'step') {
              setCurrentStepIndex(event.step);
              setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].isScreeningRun) {
                    const logs = event.log 
                      ? [...(msgs[lastIdx].screeningLogs || []), `[Step 0${event.step}] ${event.log}`]
                      : msgs[lastIdx].screeningLogs;
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      currentStepIndex: event.step,
                      screeningLogs: logs
                    };
                  }
                  return { ...s, messages: msgs };
                }
                return s;
              }));
            } else if (event.type === 'step_done') {
              setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].isScreeningRun && event.log) {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      screeningLogs: [...(msgs[lastIdx].screeningLogs || []), `✓ ${event.log}`]
                    };
                  }
                  return { ...s, messages: msgs };
                }
                return s;
              }));
            } else if (event.type === 'result') {
              const resData = event.data;
              setCurrentStepIndex(5);

              setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].isScreeningRun) {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      currentStepIndex: 5,
                      text: `Evaluation complete for **${candTitle}** against **${targetTitle}**. Final Hiring Verdict: **${resData.verdict}**.\n\n${resData.summary}`,
                      result: resData
                    };
                  }
                  return {
                    ...s,
                    jd_text: jdText,
                    resume_text: resumeText,
                    jd_title: targetTitle,
                    candidate_name: candTitle,
                    tokens: {
                      input_tokens: s.tokens.input_tokens + (resData.tokens?.input_tokens || 0),
                      output_tokens: s.tokens.output_tokens + (resData.tokens?.output_tokens || 0)
                    },
                    messages: msgs,
                    result: resData
                  };
                }
                return s;
              }));
            } else if (event.type === 'error') {
              throw new Error(event.message || "Pipeline error");
            }
          } catch (pe) {
            console.warn("Parse SSE event error:", pe);
          }
        }
      }

    } catch (err) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          const msgs = [...s.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].isScreeningRun) {
            msgs[lastIdx] = {
              ...msgs[lastIdx],
              text: `Screening pipeline error: ${err.message}`,
              isError: true
            };
          }
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } finally {
      setIsScreening(false);
    }
  };

  // Conversational follow-up handler with Token-by-Token Streaming
  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isScreening) return;

    if (!apiConfig?.api_key) {
      alert("API Key required. Please configure in Settings.");
      return;
    }

    const question = inputVal;
    setInputVal('');

    const userMsg = {
      role: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const streamingModelMsg = {
      role: 'model',
      text: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg, streamingModelMsg]
        };
      }
      return s;
    }));

    try {
      const chatHistory = activeSession.messages.slice(-6).map(m => ({
        role: m.role,
        text: m.text
      }));

      const activeResumeText = activeSession.resume_text || resumeText;
      const activeJdText = activeSession.jd_text || jdText;
      const activeCand = activeSession.candidate_name || candidateName;
      const activeTitle = activeSession.jd_title || jdTitle;

      const stepContext = {
        candidate_name: activeCand,
        position_title: activeTitle,
        resume_text: activeResumeText,
        jd_text: activeJdText,
        evaluation_result: activeSession.result
      };

      const resp = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: chatHistory,
          step_id: 6,
          step_context: stepContext,
          config: apiConfig
        })
      });

      if (!resp.ok) throw new Error("Chat stream response failed.");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullReplyText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const trimmed = rawLine.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const event = JSON.parse(dataStr);
            if (event.chunk) {
              fullReplyText += event.chunk;
              setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].role === 'model') {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      text: fullReplyText,
                      isStreaming: true
                    };
                  }
                  return { ...s, messages: msgs };
                }
                return s;
              }));
            }
          } catch (e) {
            console.warn("Error parsing token chunk:", e);
          }
        }
      }

      // Mark streaming complete
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          const msgs = [...s.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === 'model') {
            msgs[lastIdx] = {
              ...msgs[lastIdx],
              isStreaming: false
            };
          }
          return { ...s, messages: msgs };
        }
        return s;
      }));

    } catch (err) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          const msgs = [...s.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === 'model') {
            msgs[lastIdx] = {
              ...msgs[lastIdx],
              text: `Error: ${err.message}`,
              isError: true,
              isStreaming: false
            };
          }
          return { ...s, messages: msgs };
        }
        return s;
      }));
    }
  };

  // Save to Leaderboard
  const handleSaveToLeaderboard = async (res) => {
    if (!res) return;
    try {
      const avgScore = res.evaluations.reduce((acc, curr) => acc + curr.score, 0) / (res.evaluations.length || 1);
      const resp = await fetch(`${API_BASE_URL}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: res.candidate_name,
          jd_id: 'jd_custom',
          jd_title: res.jd_title,
          score: avgScore,
          verdict: res.verdict,
          summary: res.summary,
          evaluations: res.evaluations
        })
      });
      if (!resp.ok) throw new Error("Failed to save.");
      alert(`Candidate [${res.candidate_name}] saved to Leaderboard!`);
      if (fetchCandidateRegistry) fetchCandidateRegistry();
    } catch (e) {
      alert(e.message);
    }
  };

  const totalTokens = (activeSession?.tokens?.input_tokens || 0) + (activeSession?.tokens?.output_tokens || 0);
  const totalCost = calculateCost(activeSession?.tokens || { input_tokens: 0, output_tokens: 0 }, apiConfig?.model);

  const hasJd = !!jdText.trim();
  const hasResume = !!resumeText.trim();
  const isReadyToScreen = hasJd && hasResume;

  return (
    <div className="minimal-chat-layout">
      {/* 1. Left Vertical Icon Rail & Expandable Sessions Shelf */}
      <aside className={`minimal-sessions-shelf ${isSidebarOpen ? 'open' : 'closed'}`}>
        {!isSidebarOpen ? (
          /* Collapsed Mode: Sleek Vertical Icon Bar */
          <div className="shelf-rail-icons">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rail-icon-btn"
              title="Show Assessment Sessions"
            >
              <Layers size={18} />
            </button>

            <button
              onClick={handleNewSession}
              className="rail-icon-btn primary-new"
              title="Create New Assessment Session"
            >
              <Plus size={18} />
            </button>
          </div>
        ) : (
          /* Expanded Mode: Full Sessions Drawer */
          <div className="shelf-expanded-content">
            <div className="shelf-header">
              <div className="shelf-title-group">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="shelf-collapse-icon-btn"
                  title="Collapse to Icon Bar"
                >
                  <Layers size={16} className="neon-cyan" />
                </button>
                <span>Sessions</span>
              </div>
              <button
                onClick={handleNewSession}
                className="new-session-btn"
                title="Start New Assessment Session"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            </div>

            <div className="shelf-sessions-list">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const sessTokens = (sess.tokens?.input_tokens || 0) + (sess.tokens?.output_tokens || 0);
                return (
                  <div
                    key={sess.id}
                    className={`shelf-session-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSessionId(sess.id)}
                  >
                    <div className="session-item-main">
                      <div className="session-title">{sess.title}</div>
                      <div className="session-meta">
                        {sess.result && (
                          <span className={`mini-verdict-pill ${sess.result.verdict.toLowerCase()}`}>
                            {sess.result.verdict}
                          </span>
                        )}
                        <span className="session-tok">{sessTokens.toLocaleString()} tok</span>
                      </div>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        className="delete-session-btn"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        title="Delete session"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* 2. Main Minimalist Chat Stage */}
      <section className="minimal-chat-stage">
        {/* Top Minimalist Telemetry Bar */}
        <div className="minimal-telemetry-bar">
          <div className="telemetry-bar-left">
            <div className="active-session-label">
              <span className="session-dot"></span>
              <span className="session-name">{activeSession.title}</span>
            </div>
          </div>

          <div className="telemetry-bar-right">
            <div className="minimal-token-pill">
              <Coins size={14} className="neon-cyan" />
              <span>{totalTokens.toLocaleString()} tok</span>
              <span className="divider">·</span>
              <span className="cost-tag">${totalCost}</span>
            </div>
            <div className="minimal-model-badge">
              {apiConfig?.model || 'gemini-2.5-flash'}
            </div>
          </div>
        </div>

        {/* Chat Feed Scroll Area */}
        <div className="minimal-chat-scroll clean-stream">
          {/* Message Stream */}
          {activeSession.messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const res = msg.result;

            return (
              <div key={idx} className={`chat-message-bubble-row ${isUser ? 'user' : 'model'}`}>
                <div className="message-avatar">
                  {isUser ? <User size={15} /> : <Bot size={15} className="neon-cyan" />}
                </div>

                <div className="message-bubble-content">
                  <div className="message-header-line">
                    <span className="message-author">{isUser ? 'Recruiter' : 'AI Screener'}</span>
                    {msg.timestamp && <span className="message-time">{msg.timestamp}</span>}
                  </div>

                  <div className="message-text-body">{msg.text}</div>

                  {/* Minimalist Multi-Stage Stepper for Screening Run */}
                  {msg.isScreeningRun && (
                    <div className="minimal-stepper-container">
                      <div className="stepper-meta-row">
                        <div className="stepper-status-pill">
                          <span className={msg.result ? "stepper-dot done" : "stepper-dot live"}></span>
                          <span className="stepper-status-text">
                            {msg.result 
                              ? "Screening Complete (5/5 ✓)" 
                              : `Stage 0${msg.currentStepIndex || 1}/05: ${
                                  (msg.currentStepIndex || 1) === 1 ? "Modularizing JD" :
                                  (msg.currentStepIndex || 1) === 2 ? "Compiling Rubric" :
                                  (msg.currentStepIndex || 1) === 3 ? "Mapping Evidence" :
                                  (msg.currentStepIndex || 1) === 4 ? "Batch Dimension Agents" :
                                  "Verdict Resolution"
                                }`
                            }
                          </span>
                        </div>

                        <button
                          type="button"
                          className="stepper-logs-toggle"
                          onClick={() => setShowExecutionLogs(!showExecutionLogs)}
                        >
                          <Terminal size={12} />
                          <span>Logs ({(msg.screeningLogs || []).length})</span>
                          {showExecutionLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {/* Smooth Progress Track */}
                      <div className="stepper-track-bar">
                        <div 
                          className="stepper-track-fill" 
                          style={{ width: `${((msg.result ? 5 : (msg.currentStepIndex || 1)) / 5) * 100}%` }}
                        ></div>
                      </div>

                      {/* Micro Step Nodes */}
                      <div className="stepper-micro-nodes">
                        {[
                          { id: 1, label: "JD", icon: Briefcase },
                          { id: 2, label: "Rubric", icon: Layers },
                          { id: 3, label: "Evidence", icon: FileText },
                          { id: 4, label: "Evaluation", icon: Zap },
                          { id: 5, label: "Verdict", icon: Award }
                        ].map((node) => {
                          const isDone = (msg.currentStepIndex || 1) > node.id || !!msg.result;
                          const isCurrent = (msg.currentStepIndex || 1) === node.id && !msg.result;
                          const IconC = node.icon;
                          return (
                            <div 
                              key={node.id} 
                              className={`micro-node-item ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}`}
                              title={`Stage 0${node.id}: ${node.label}`}
                            >
                              <div className="micro-node-icon">
                                {isDone ? <CheckCircle2 size={12} /> : <IconC size={12} />}
                              </div>
                              <span className="micro-node-label">{node.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expandable Logs */}
                      {showExecutionLogs && (
                        <div className="stepper-logs-drawer">
                          {(msg.screeningLogs || []).map((log, lIdx) => (
                            <div key={lIdx} className="mini-log-line">
                              <span className="mini-log-bullet">›</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Result Deck */}
                  {res && (
                    <div className="chat-result-cards-deck">
                      {/* Verdict Hero Card */}
                      <div className={`chat-verdict-card ${res.verdict.toLowerCase() === 'fit' ? 'fit' : 'miss'}`}>
                        <div className="card-topline">
                          <span className="verdict-label">HIRING RESOLUTION</span>
                          <span className="candidate-tag">{res.candidate_name} · {res.jd_title}</span>
                        </div>
                        <div className="verdict-main-badge">
                          {res.verdict.toLowerCase() === 'fit' ? (
                            <CheckCircle2 size={28} />
                          ) : (
                            <AlertOctagon size={28} />
                          )}
                          <span>{res.verdict}</span>
                        </div>
                        <p className="verdict-summary-p">{res.summary}</p>
                      </div>

                      {/* Dimensions Bento Scorecards (Collapsible & Expandable) */}
                      <div className="chat-bento-deck">
                        <button
                          type="button"
                          className={`bento-deck-toggle-btn ${expandedScorecards[idx] ? 'expanded' : ''}`}
                          onClick={() => toggleScorecards(idx)}
                        >
                          <div className="toggle-left">
                            <Award size={15} className="neon-cyan" />
                            <span>Competency Scorecards ({res.evaluations?.length || 0})</span>
                          </div>
                          <div className="toggle-right">
                            <span className="toggle-hint">
                              {expandedScorecards[idx] ? "Hide Details" : "View Scorecards"}
                            </span>
                            {expandedScorecards[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </button>

                        {expandedScorecards[idx] && (
                          <div className="chat-bento-grid animate-fade-in">
                            {res.evaluations?.map((ev, eIdx) => {
                              const scoreClass = ev.score >= 7 ? 'high' : ev.score >= 4 ? 'mid' : 'low';
                              return (
                                <div key={eIdx} className="chat-bento-item">
                                  <div className="bento-item-header">
                                    <span className="dim-name">{ev.vertical_name}</span>
                                    <span className={`dim-score-badge ${scoreClass}`}>
                                      {ev.score}/10
                                    </span>
                                  </div>
                                  <p className="dim-rationale">{ev.rationale}</p>
                                  
                                  {ev.green_points?.length > 0 && (
                                    <div className="point-group green">
                                      <span className="point-head">Strengths:</span>
                                      {ev.green_points.slice(0, 2).map((gp, gIdx) => (
                                        <div key={gIdx} className="point-item">✓ {gp}</div>
                                      ))}
                                    </div>
                                  )}

                                  {ev.miss_points?.length > 0 && (
                                    <div className="point-group red">
                                      <span className="point-head">Misses:</span>
                                      {ev.miss_points.slice(0, 2).map((mp, mIdx) => (
                                        <div key={mIdx} className="point-item">✗ {mp}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="chat-result-actions">
                        <button
                          className="modern-btn secondary sm"
                          onClick={() => handleSaveToLeaderboard(res)}
                        >
                          <Save size={13} />
                          <span>Save to Leaderboard</span>
                        </button>
                        {onOpenAlignedModal && (
                          <button
                            className="modern-btn amber sm"
                            onClick={() => onOpenAlignedModal(res)}
                          >
                            <Sparkles size={13} />
                            <span>Align Resume</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Bottom Chat Input Area with Attached Action Toolbar */}
        <div className="minimal-input-container">
          {/* Active Attached Pills */}
          {(hasJd || hasResume) && (
            <div className="attached-chips-row">
              {hasJd && (
                <div className="attached-chip">
                  <Briefcase size={13} className="neon-cyan" />
                  <span className="chip-label">{jdTitle || "Job Description"}</span>
                  <span className="chip-meta">({jdText.length} chars)</span>
                  <button className="chip-remove-btn" onClick={() => { setJdText(''); setJdTitle(''); }}>
                    <X size={12} />
                  </button>
                </div>
              )}

              {hasResume && (
                <div className="attached-chip">
                  <FileText size={13} className="neon-green" />
                  <span className="chip-label">{candidateName || resumeFileName || "Resume"}</span>
                  <span className="chip-meta">({resumeText.length} chars)</span>
                  <button className="chip-remove-btn" onClick={() => { setResumeText(''); setCandidateName(''); setResumeFileName(''); }}>
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Setup Action Buttons Bar */}
          <div className="input-action-toolbar">
            <button
              type="button"
              className={`toolbar-chip-btn ${isReadyToScreen ? 'active' : ''}`}
              onClick={() => {
                setAttachModalStep(hasJd && !hasResume ? 2 : 1);
                setShowAttachModal(true);
              }}
              title="Attach Role, JD, and Candidate Resume"
            >
              <Paperclip size={14} className={isReadyToScreen ? 'neon-green' : ''} />
              <span>
                {hasJd && hasResume 
                  ? 'JD & Resume Ready (2/2 ✓)' 
                  : hasJd 
                  ? 'JD Attached (1/2) · Attach Resume' 
                  : hasResume 
                  ? 'Resume Attached (1/2) · Attach JD' 
                  : 'Attach Role & Resume (0/2)'}
              </span>
            </button>

            <button
              type="button"
              className={`toolbar-chip-btn run-screen ${isReadyToScreen ? 'ready' : ''}`}
              onClick={handleRunAutonomousScreen}
              disabled={isScreening || !isReadyToScreen}
              title="Run Autonomous Agentic Pipeline"
            >
              {isScreening ? (
                <>
                  <span className="spin-icon">✦</span>
                  <span>Screening...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Run AI Screen</span>
                </>
              )}
            </button>
          </div>

          {/* Main Follow-up Input Bar */}
          <form onSubmit={handleSendFollowUp} className="minimal-input-bar">
            <input
              type="text"
              placeholder="Ask a question about the candidate, competencies, or next steps..."
              className="follow-up-input"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isScreening}
            />
            <button
              type="submit"
              className="follow-up-send-btn"
              disabled={!inputVal.trim() || isScreening}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </section>

      {/* --- Unified 2-Step Guided Modal: Attach Role, JD & Resume --- */}
      {showAttachModal && (
        <div className="modal-overlay" onClick={() => setShowAttachModal(false)}>
          <div className="modal-card-glass large-guided" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-glass">
              <div className="header-title-row">
                <Paperclip size={16} className="neon-cyan" />
                <h3>Attach Screening Inputs</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAttachModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Stepper Header Navigation */}
            <div className="guided-stepper-header">
              <button
                type="button"
                className={`guided-step-tab ${attachModalStep === 1 ? 'active' : ''} ${hasJd ? 'done' : ''}`}
                onClick={() => setAttachModalStep(1)}
              >
                <div className="tab-num-badge">
                  {hasJd ? <CheckCircle2 size={13} /> : "01"}
                </div>
                <div className="tab-meta">
                  <span className="tab-title">Role & JD</span>
                  <span className="tab-sub">{hasJd ? (jdTitle || "Attached") : "Requirements"}</span>
                </div>
              </button>

              <div className="stepper-arrow-divider">➔</div>

              <button
                type="button"
                className={`guided-step-tab ${attachModalStep === 2 ? 'active' : ''} ${hasResume ? 'done' : ''}`}
                onClick={() => setAttachModalStep(2)}
              >
                <div className="tab-num-badge">
                  {hasResume ? <CheckCircle2 size={13} /> : "02"}
                </div>
                <div className="tab-meta">
                  <span className="tab-title">Candidate Resume</span>
                  <span className="tab-sub">{hasResume ? (candidateName || "Attached") : "Experience & Evidence"}</span>
                </div>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="modal-body-content">
              {/* STEP 1: ROLE & JD */}
              {attachModalStep === 1 && (
                <div className="guided-step-view animate-fade-in">
                  {savedJds.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Select from Saved JD Library (Auto-Cached)</label>
                      <select
                        className="modern-select large"
                        onChange={(e) => handleSelectSavedJd(e.target.value)}
                      >
                        <option value="">-- Choose a Saved Role --</option>
                        {savedJds.map(j => (
                          <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Position Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Gen AI Engineer / Lead Architect..."
                      className="modern-input large"
                      value={jdTitle}
                      onChange={(e) => setJdTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Job Description Text</label>
                    <textarea
                      rows={7}
                      placeholder="Paste Job Description text here... (Any newly entered JD is automatically saved to your library and Redis cache for instant reuse)"
                      className="modern-textarea large"
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                    />
                  </div>

                  <div className="modal-actions-between">
                    <span className="step-count-label">Step 1 of 2</span>
                    <div className="action-btns-group">
                      <button
                        type="button"
                        className="modern-btn secondary"
                        onClick={() => setShowAttachModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="modern-btn primary"
                        onClick={() => setAttachModalStep(2)}
                        disabled={!jdText.trim()}
                      >
                        <span>Next: Attach Resume</span>
                        <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CANDIDATE RESUME */}
              {attachModalStep === 2 && (
                <div className="guided-step-view animate-fade-in">
                  {savedResumes.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Select from Cached Candidates</label>
                      <select
                        className="modern-select large"
                        onChange={(e) => handleSelectCachedResume(e.target.value)}
                      >
                        <option value="">-- Choose Cached Candidate --</option>
                        {savedResumes.map((r, idx) => {
                          const name = typeof r === 'string' ? r : r.candidate_name;
                          return <option key={name + idx} value={name}>{name}</option>;
                        })}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Upload Resume Document (PDF / DOCX / TXT)</label>
                    <label className="file-drop-box large">
                      <Upload size={16} />
                      <span>{isParsingResume ? "Parsing Document..." : resumeFileName || "Upload PDF or DOCX"}</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        disabled={isParsingResume}
                      />
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Candidate Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Himanshu Gandhotra..."
                      className="modern-input large"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Resume Text</label>
                    <textarea
                      rows={6}
                      placeholder="Paste resume text or upload a document above..."
                      className="modern-textarea large"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                  </div>

                  <div className="modal-actions-between">
                    <button
                      type="button"
                      className="modern-btn secondary"
                      onClick={() => setAttachModalStep(1)}
                    >
                      <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} />
                      <span>Back to Role & JD</span>
                    </button>

                    <div className="action-btns-group">
                      <button
                        type="button"
                        className="modern-btn secondary"
                        onClick={() => setShowAttachModal(false)}
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        className="modern-btn primary"
                        onClick={() => {
                          setShowAttachModal(false);
                          if (hasJd && resumeText.trim()) {
                            handleRunAutonomousScreen();
                          }
                        }}
                        disabled={!resumeText.trim()}
                      >
                        <Sparkles size={14} />
                        <span>{hasJd ? "Ready · Run AI Screen" : "Attach Resume"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
