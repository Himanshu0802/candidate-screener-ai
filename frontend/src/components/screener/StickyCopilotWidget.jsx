import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Terminal, 
  Coins, 
  Maximize2, 
  Minimize2, 
  Cpu, 
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import TokenTelemetry from '../TokenTelemetry';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function StickyCopilotWidget({
  activeStep,
  stepContext,
  apiConfig,
  sessionTelemetry,
  phaseTelemetry,
  onTokensSpent
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'telemetry'
  const [isExpanded, setIsExpanded] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: `AI-OPERATOR ONLINE. Assisting on Step ${activeStep}.\nAsk me anything regarding this step's inputs, rubric rules, parsing details, or candidate evaluation.`
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const messagesEndRef = useRef(null);

  // Update greeting when step changes
  useEffect(() => {
    setMessages(prev => [
      ...prev,
      {
        role: 'model',
        text: `Switched context to Step ${activeStep}. How can I assist you with this stage?`
      }
    ]);
  }, [activeStep]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    if (!apiConfig.api_key) {
      setErrorText('API Key required. Please set your key in the Config drawer.');
      return;
    }

    const userMessage = inputVal;
    setInputVal('');
    setErrorText('');

    const updatedMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const chatHistory = updatedMessages.slice(-6, -1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory,
          step_id: activeStep,
          step_context: stepContext || {},
          config: apiConfig
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to communicate with AI Assistant');
      }

      const resData = await response.json();
      if (resData.tokens) {
        onTokensSpent(resData.tokens.input_tokens, resData.tokens.output_tokens);
      }

      setMessages(prev => [...prev, { role: 'model', text: resData.reply }]);
    } catch (err) {
      setErrorText(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const totalTokens = (sessionTelemetry?.input_tokens || 0) + (sessionTelemetry?.output_tokens || 0);

  return (
    <div className="sticky-copilot-anchor">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          className="copilot-floating-trigger"
          onClick={() => setIsOpen(true)}
          title="Open AI Copilot & Telemetry"
        >
          <div className="trigger-icon-box">
            <Bot size={22} className="neon-cyan" />
            <span className="trigger-pulse-dot"></span>
          </div>
          <div className="trigger-text-group">
            <span className="trigger-main-title">AI Copilot</span>
            <span className="trigger-sub-telemetry">
              {totalTokens > 0 ? `${totalTokens.toLocaleString()} tok` : 'Online'}
            </span>
          </div>
        </button>
      )}

      {/* Floating Window */}
      {isOpen && (
        <div className={`copilot-floating-window ${isExpanded ? 'fullscreen' : ''}`}>
          {/* Header */}
          <div className="copilot-window-header">
            <div className="header-tabs-group">
              <button
                className={`copilot-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <Bot size={15} />
                <span>AI Operator</span>
              </button>
              <button
                className={`copilot-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
                onClick={() => setActiveTab('telemetry')}
              >
                <Coins size={15} />
                <span>Telemetry ({totalTokens.toLocaleString()})</span>
              </button>
            </div>

            <div className="header-window-actions">
              <button
                className="window-action-icon"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse Window" : "Expand Window"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                className="window-action-icon close"
                onClick={() => setIsOpen(false)}
                title="Minimize Copilot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="copilot-window-body">
            {activeTab === 'chat' ? (
              <div className="copilot-chat-pane">
                <div className="copilot-step-badge">
                  <span className="badge-dot"></span>
                  <span>Context: Active Step {activeStep}</span>
                </div>

                <div className="copilot-messages-scroll">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`copilot-bubble ${m.role === 'user' ? 'user' : 'model'}`}
                    >
                      <div className="bubble-author">
                        {m.role === 'user' ? 'Operator' : 'AI Assistant'}
                      </div>
                      <div className="bubble-text">{m.text}</div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="copilot-bubble model loading">
                      <span className="spin-icon">✦</span>
                      <span>Thinking with Gemini...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {errorText && (
                  <div className="copilot-error-banner">
                    <AlertCircle size={14} />
                    <span>{errorText}</span>
                  </div>
                )}

                <form onSubmit={handleSend} className="copilot-input-form">
                  <input
                    type="text"
                    placeholder="Ask about this step, rubric, or candidates..."
                    className="copilot-chat-input"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="copilot-send-btn"
                    disabled={!inputVal.trim() || isLoading}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="copilot-telemetry-pane">
                <TokenTelemetry
                  phaseTelemetry={phaseTelemetry || { input_tokens: 0, output_tokens: 0 }}
                  sessionTelemetry={sessionTelemetry || { input_tokens: 0, output_tokens: 0 }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
