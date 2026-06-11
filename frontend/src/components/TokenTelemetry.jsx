import React, { useState } from 'react';

export default function TokenTelemetry({ phaseTelemetry, sessionTelemetry }) {
  const [viewMode, setViewMode] = useState('session'); // 'session' or 'phase'

  const telemetry = viewMode === 'session' ? sessionTelemetry : phaseTelemetry;
  
  // Outer Ring: Input Tokens
  // Inner Ring: Output Tokens
  const outerRadius = 45;
  const innerRadius = 33;
  const strokeWidth = 5;
  const center = 60;
  
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  
  // Set logical maximums for visual representation, scale dynamically
  const maxInput = viewMode === 'session' ? 100000 : 15000;
  const maxOutput = viewMode === 'session' ? 20000 : 3000;
  
  const inputPct = Math.min((telemetry.input_tokens / maxInput) * 100, 100);
  const outputPct = Math.min((telemetry.output_tokens / maxOutput) * 100, 100);
  
  const outerOffset = outerCircumference - (inputPct / 100) * outerCircumference;
  const innerOffset = innerCircumference - (outputPct / 100) * innerCircumference;

  return (
    <div className="telemetry-container">
      <div className="terminal-header" style={{ width: '100%', marginBottom: '8px', padding: '2px 8px' }}>
        <span>[SYS_TELEMETRY]</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        
        {/* Left: SVG circle visualizer (enlarged for visibility) */}
        <div className="telemetry-svg-container">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circles */}
            <circle
              cx={center}
              cy={center}
              r={outerRadius}
              stroke="#16251b"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              stroke="#0a1a16"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            
            {/* Input Tokens Ring (Outer - Neon Green) */}
            <circle
              className="telemetry-ring"
              cx={center}
              cy={center}
              r={outerRadius}
              stroke="#39ff14"
              strokeWidth={strokeWidth}
              strokeDasharray={outerCircumference}
              strokeDashoffset={outerOffset}
              fill="transparent"
              style={{ filter: 'drop-shadow(0px 0px 3px rgba(57,255,20,0.6))' }}
            />
            
            {/* Output Tokens Ring (Inner - Neon Cyan) */}
            <circle
              className="telemetry-ring"
              cx={center}
              cy={center}
              r={innerRadius}
              stroke="#00ffcc"
              strokeWidth={strokeWidth}
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerOffset}
              fill="transparent"
              style={{ filter: 'drop-shadow(0px 0px 3px rgba(0,255,204,0.6))' }}
            />
          </svg>
          
          <div className="telemetry-text-overlay">
            <div className="telemetry-label" style={{ fontSize: '0.55rem' }}>Total</div>
            <div className="telemetry-value" style={{ color: '#39ff14', textShadow: '0 0 4px rgba(57,255,20,0.4)', fontSize: '1rem', lineHeight: '1.1' }}>
              {telemetry.input_tokens + telemetry.output_tokens}
            </div>
            <div className="telemetry-label" style={{ fontSize: '0.55rem' }}>Tokens</div>
          </div>
        </div>
        
        {/* Right: Controls & Legend Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexGrow: 1 }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setViewMode('phase')} 
              className={`retro-button ${viewMode === 'phase' ? '' : 'secondary'}`}
              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
            >
              Phase
            </button>
            <button 
              onClick={() => setViewMode('session')} 
              className={`retro-button ${viewMode === 'session' ? '' : 'secondary'}`}
              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
            >
              Session
            </button>
          </div>

          <div className="telemetry-legend" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: '90px' }}>
            <div className="telemetry-legend-item" style={{ borderBottom: '1px solid rgba(127, 127, 127, 0.1)', paddingBottom: '2px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#39ff14', borderRadius: '50%' }}></span>
                In:
              </span>
              <span style={{ color: '#39ff14', fontWeight: 'bold' }}>{telemetry.input_tokens}</span>
            </div>
            <div className="telemetry-legend-item" style={{ borderBottom: 'none', paddingBottom: 0, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#00ffcc', borderRadius: '50%' }}></span>
                Out:
              </span>
              <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{telemetry.output_tokens}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
