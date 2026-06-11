import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, ShieldAlert } from 'lucide-react';

export default function RetroChatAssistant({ stepId, stepContext, apiConfig, onTokensSpent }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: `AI-OPERATOR ONLINE. Assisting on Step ${stepId}.\nType a query regarding this step's inputs, rubric rules, parsing details, or results.`
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const messagesEndRef = useRef(null);

  // Clear or reset messages when stepId changes
  useEffect(() => {
    setMessages([
      {
        role: 'model',
        text: `AI-OPERATOR ONLINE. Assisting on Step ${stepId}.\nHow can I help you optimize or debug the candidate screening process on this page?`
      }
    ]);
    setErrorText('');
  }, [stepId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    if (!apiConfig.api_key) {
      setErrorText('ERROR: CONFIG_REQUIRED. Initialize API Key in the config panel first.');
      return;
    }

    const userMessage = inputVal;
    setInputVal('');
    setErrorText('');
    
    // Add user message to UI
    const updatedMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Clean history for API payload (limit to last 6 messages to save context tokens)
      const chatHistory = updatedMessages.slice(0, -1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory,
          step_id: stepId,
          step_context: stepContext || {},
          config: apiConfig
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to communicate with AI-OPERATOR');
      }

      const resData = await response.json();
      
      // Update tokens spent
      if (resData.tokens) {
        onTokensSpent(resData.tokens.input_tokens, resData.tokens.output_tokens);
      }

      // Add operator response to UI
      setMessages(prev => [...prev, { role: 'model', text: resData.reply }]);
    } catch (err) {
      setErrorText(`CONNECTION_ERROR: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Terminal size={14} />
          AI-OPERATOR_v1.0.sys
        </span>
        <span className="neon-cyan">STEP {stepId} HELPER</span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'operator'}`}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble operator">
            <span style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
              AI-OPERATOR is generating response... <span className="cursor"></span>
            </span>
          </div>
        )}
        {errorText && (
          <div className="chat-bubble operator" style={{ borderColor: 'var(--text-red)', backgroundColor: 'rgba(255,42,95,0.05)', color: 'var(--text-red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
              <ShieldAlert size={14} />
              SYSTEM FAILURE
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>{errorText}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-area">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Enter query for step ${stepId}...`}
          className="chat-input"
          disabled={isLoading}
        />
        <button type="submit" className="chat-send-btn" disabled={isLoading || !inputVal.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
