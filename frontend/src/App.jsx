import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Terminal as TermIcon, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  Play, 
  FileText, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldAlert, 
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Trash2
} from 'lucide-react';
import TokenTelemetry from './components/TokenTelemetry';
import RetroChatAssistant from './components/RetroChatAssistant';

export default function App() {
  // --- THEME STATE ---
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightTheme]);

  // --- UI MODE STATE ---
  const [isRetroTheme, setIsRetroTheme] = useState(false);

  useEffect(() => {
    if (isRetroTheme) {
      document.body.classList.add('retro-theme');
    } else {
      document.body.classList.remove('retro-theme');
    }
  }, [isRetroTheme]);

  // --- CONFIG STATE ---
  const [apiConfig, setApiConfig] = useState({
    api_key: '',
    use_vertex: false,
    project_id: '',
    location: 'us-central1',
    model: 'gemini-2.5-flash'
  });

  // --- DATABASE & PERSISTENCE STATES ---
  const [savedJds, setSavedJds] = useState([]);
  const [selectedJdId, setSelectedJdId] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateRegistry, setCandidateRegistry] = useState([]);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [viewingCandDetails, setViewingCandDetails] = useState(null);
  const [registryFilterJd, setRegistryFilterJd] = useState('');
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);

  // --- RESUME CACHE & REUSE STATES ---
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResumeName, setSelectedResumeName] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [showConfig, setShowConfig] = useState(true);

  // --- WIZARD STEP ---
  const [activeStep, setActiveStep] = useState(1);
  const [isLandingScreen, setIsLandingScreen] = useState(true);

  // --- TOKEN TELEMETRY STATE ---
  const [sessionTelemetry, setSessionTelemetry] = useState({ input_tokens: 0, output_tokens: 0 });
  const [phaseTelemetry, setPhaseTelemetry] = useState({
    1: { input_tokens: 0, output_tokens: 0 },
    2: { input_tokens: 0, output_tokens: 0 },
    3: { input_tokens: 0, output_tokens: 0 },
    4: { input_tokens: 0, output_tokens: 0 },
    5: { input_tokens: 0, output_tokens: 0 },
    6: { input_tokens: 0, output_tokens: 0 },
    7: { input_tokens: 0, output_tokens: 0 }
  });

  // --- STEP-SPECIFIC DATA STATES ---
  // Step 1: JD Ingestion
  const [jdText, setJdText] = useState('');
  const [isJdSubmitting, setIsJdSubmitting] = useState(false);

  // Step 2: Modularization
  const [verticals, setVerticals] = useState([]); // Array of { name, description, weight }
  const [isModularizing, setIsModularizing] = useState(false);

  // Step 3: Rubric
  const [compiledRubric, setCompiledRubric] = useState('');
  const [isCompilingRubric, setIsCompilingRubric] = useState(false);

  // Step 4: Resume Parser & Map
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [mappings, setMappings] = useState([]); // Array of { vertical_name, chunk_text }
  const [isMappingChunks, setIsMappingChunks] = useState(false);

  // Step 5: Agent Execution
  const [evaluations, setEvaluations] = useState([]); // Array of { vertical_name, score, rationale, green_points, miss_points }
  const [evaluationLogs, setEvaluationLogs] = useState([]); // CLI-style lines
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeEvalVertical, setActiveEvalVertical] = useState('');

  // Step 6: Sectional dashboard
  const [expandedTabs, setExpandedTabs] = useState({});

  // Step 7: Final Conclusion
  const [verdict, setVerdict] = useState(''); // FIT or MISS
  const [verdictSummary, setVerdictSummary] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // --- CONTEXT INJECTION FOR CHAT ---
  const [stepContexts, setStepContexts] = useState({});

  useEffect(() => {
    // Dynamic Context Builder for the chat assistant
    setStepContexts({
      1: { jdTextLength: jdText.length },
      2: { extractedVerticals: verticals },
      3: { compiledRubricPromptLength: compiledRubric.length },
      4: { resumeFileName: uploadedFileName, hasResumeText: !!resumeText, mappingsCount: mappings.length },
      5: { ongoingEvaluation: isEvaluating, logs: evaluationLogs, processedCount: evaluations.length },
      6: { scoringResults: evaluations },
      7: { finalVerdict: verdict, summary: verdictSummary }
    });
  }, [
    jdText, 
    verticals, 
    compiledRubric, 
    uploadedFileName, 
    resumeText, 
    mappings, 
    isEvaluating, 
    evaluationLogs, 
    evaluations, 
    verdict, 
    verdictSummary
  ]);

  // Helper: Increment global/phase tokens
  const addTokens = (input, output) => {
    setSessionTelemetry(prev => ({
      input_tokens: prev.input_tokens + input,
      output_tokens: prev.output_tokens + output
    }));
    setPhaseTelemetry(prev => ({
      ...prev,
      [activeStep]: {
        input_tokens: prev[activeStep].input_tokens + input,
        output_tokens: prev[activeStep].output_tokens + output
      }
    }));
  };

  useEffect(() => {
    fetchSavedJds();
    fetchCandidateRegistry();
  }, []);

  useEffect(() => {
    if (isRegistryOpen) {
      fetchCandidateRegistry();
      fetchSavedJds();
    }
  }, [isRegistryOpen]);

  useEffect(() => {
    if (activeStep === 4) {
      fetchSavedResumes();
    }
  }, [activeStep]);

  const fetchSavedResumes = async () => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/resumes');
      if (resp.ok) {
        const data = await resp.json();
        setSavedResumes(data);
      }
    } catch (e) {
      console.error("Failed to load saved resumes", e);
    }
  };

  const fetchSavedJds = async () => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/jds');
      if (resp.ok) {
        const data = await resp.json();
        setSavedJds(data);
      }
    } catch (e) {
      console.error("Failed to load saved JDs", e);
    }
  };

  const fetchCandidateRegistry = async () => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/candidates');
      if (resp.ok) {
        const data = await resp.json();
        setCandidateRegistry(data);
      }
    } catch (e) {
      console.error("Failed to load candidates", e);
    }
  };

  const handleSelectSavedJd = (id) => {
    if (!id) {
      setSelectedJdId('');
      setJdTitle('');
      setJdText('');
      setVerticals([]);
      return;
    }
    const jd = savedJds.find(j => j.id === id);
    if (jd) {
      setSelectedJdId(jd.id);
      setJdTitle(jd.title);
      setJdText(jd.jd_text);
      setVerticals(jd.verticals || []);
    }
  };

  const handleSaveJd = async () => {
    let title = jdTitle;
    if (!title.trim()) {
      const suggested = window.prompt("ENTER A TITLE FOR THIS JOB DESCRIPTION POSITION:", "AI Developer Position");
      if (!suggested) return;
      title = suggested;
      setJdTitle(suggested);
    }
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/jds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedJdId || null,
          title: title,
          jd_text: jdText,
          verticals: verticals
        })
      });
      if (!resp.ok) throw new Error("Failed to save JD.");
      const data = await resp.json();
      setSelectedJdId(data.id);
      fetchSavedJds();
      alert(`Job Description parameters saved as [${title.toUpperCase()}] in library!`);
    } catch (err) {
      alert("Error saving JD: " + err.message);
    }
  };

  const handleSaveCandidate = async () => {
    if (!candidateName.trim()) {
      alert("Candidate Name is required to save.");
      return;
    }
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidateName,
          jd_id: selectedJdId || 'jd_custom',
          jd_title: jdTitle || 'Custom Position',
          score: evaluations.reduce((acc, curr) => acc + curr.score, 0) / (evaluations.length || 1),
          verdict: verdict,
          summary: verdictSummary,
          evaluations: evaluations
        })
      });
      if (!resp.ok) throw new Error("Failed to save candidate report.");
      alert(`Verdict report for [${candidateName.toUpperCase()}] successfully saved to leaderboard!`);
      fetchCandidateRegistry();
    } catch (e) {
      alert("Failed to save candidate: " + e.message);
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!window.confirm("ARE YOU SURE you want to delete this candidate from the registry?")) return;
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/candidates/${id}`, {
        method: 'DELETE'
      });
      if (!resp.ok) throw new Error("Failed to delete.");
      fetchCandidateRegistry();
    } catch (e) {
      alert("Failed to delete candidate: " + e.message);
    }
  };

  const handleNextFromStep1 = async () => {
    if (selectedJdId && verticals && verticals.length > 0) {
      setActiveStep(2);
    } else {
      await handleModularizeJd();
    }
  };

  // --- ACTIONS & API HANDLERS ---
  
  // Test Config API Connection
  const handleTestConfig = async () => {
    if (!apiConfig.api_key) {
      setConfigSuccess(false);
      setConfigMessage("ERROR: API Key cannot be blank.");
      return;
    }
    setIsTestingConfig(true);
    setConfigSuccess(null);
    setConfigMessage("Pinging API endpoint...");
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: apiConfig })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setConfigSuccess(true);
        setConfigMessage("CONNECTION ESTABLISHED. Handshake successful.");
        addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
        // Hide config panel automatically on success after delay
        setTimeout(() => setShowConfig(false), 2000);
      } else {
        throw new Error(data.detail || "Handshake rejected.");
      }
    } catch (err) {
      setConfigSuccess(false);
      setConfigMessage(`CONNECTION FAILED: ${err.message}`);
    } finally {
      setIsTestingConfig(false);
    }
  };

  // Step 2: modularize JD
  const handleModularizeJd = async () => {
    if (!jdText.trim()) return;
    setIsModularizing(true);
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/jd/modularize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText, config: apiConfig })
      });
      if (!resp.ok) throw new Error("Failed to modularize Job Description.");
      const data = await resp.json();
      
      // Default all weights to 'High' initially
      const loadedVerticals = data.verticals.map(v => ({
        ...v,
        weight: 'High'
      }));
      
      setVerticals(loadedVerticals);
      addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
      setActiveStep(2);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsModularizing(false);
    }
  };

  // Step 3: Generate Dynamic Rubric (Programmatic)
  const handleCompileRubric = async () => {
    setIsCompilingRubric(true);
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/rubric/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verticals })
      });
      if (!resp.ok) throw new Error("Failed to compile rubric.");
      const data = await resp.json();
      setCompiledRubric(data.compiled_prompt);
      setActiveStep(3);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCompilingRubric(false);
    }
  };

  // Resume caching & reuse actions
  const handleSelectSavedResume = async (resumeName) => {
    setSelectedResumeName(resumeName);
    if (!resumeName) {
      setUploadedFileName('');
      setResumeText('');
      setCandidateName('');
      setMappings([]);
      setEvaluations([]);
      setEvaluationLogs([]);
      setVerdict('');
      setVerdictSummary('');
      return;
    }

    // Clear older candidate mapping, evaluations, logs, and final verdicts
    setMappings([]);
    setEvaluations([]);
    setEvaluationLogs([]);
    setVerdict('');
    setVerdictSummary('');

    try {
      const activeJdId = selectedJdId || 'jd_custom';
      const url = `http://127.0.0.1:8000/api/resumes/cache?candidate_name=${encodeURIComponent(resumeName)}&jd_id=${encodeURIComponent(activeJdId)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setUploadedFileName(data.filename);
        setResumeText(data.resume_text);
        setCandidateName(data.candidate_name);
        if (data.mappings && data.mappings.length > 0) {
          setMappings(data.mappings);
        } else {
          setMappings([]);
        }
      } else {
        console.warn("Failed to retrieve cached resume details.");
      }
    } catch (err) {
      console.error("Error retrieving cached resume:", err);
      alert("Error loading cached resume details: " + err.message);
    }
  };

  const saveResumeToBackendCache = async (name, filename, text, currentMappings) => {
    if (!name.trim() || !text) return;
    try {
      await fetch('http://127.0.0.1:8000/api/resumes/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: name.trim(),
          filename: filename,
          resume_text: text,
          jd_id: selectedJdId || 'jd_custom',
          mappings: currentMappings
        })
      });
      fetchSavedResumes();
    } catch (e) {
      console.error("Failed to cache resume on backend", e);
    }
  };

  const handleClearJds = async () => {
    if (!window.confirm("ARE YOU SURE you want to clear the entire Job Description library? This will delete all saved JDs.")) return;
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/jds/clear', { method: 'POST' });
      if (resp.ok) {
        alert("Job Description library cleared successfully.");
        setSelectedJdId('');
        setJdTitle('');
        setJdText('');
        setVerticals([]);
        setCompiledRubric('');
        fetchSavedJds();
      } else {
        alert("Failed to clear JD library.");
      }
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
  };

  const handleDeleteJd = async () => {
    if (!selectedJdId) return;
    const jdToDelete = savedJds.find(j => j.id === selectedJdId);
    const title = jdToDelete ? jdToDelete.title : "this Job Description";
    if (!window.confirm(`ARE YOU SURE you want to delete the Job Description: "${title.toUpperCase()}"?`)) return;
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/jds/${selectedJdId}`, { method: 'DELETE' });
      if (resp.ok) {
        alert("Job Description deleted successfully.");
        setSelectedJdId('');
        setJdTitle('');
        setJdText('');
        setVerticals([]);
        setCompiledRubric('');
        fetchSavedJds();
      } else {
        alert("Failed to delete Job Description.");
      }
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
  };

  const handleClearResumes = async () => {
    if (!window.confirm("ARE YOU SURE you want to clear the entire Resume archive cache? This will delete all saved candidate resumes and mappings.")) return;
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/resumes/clear', { method: 'POST' });
      if (resp.ok) {
        alert("Resume archive cache cleared successfully.");
        setSelectedResumeName('');
        setUploadedFileName('');
        setResumeText('');
        setCandidateName('');
        setMappings([]);
        setEvaluations([]);
        setEvaluationLogs([]);
        setVerdict('');
        setVerdictSummary('');
        fetchSavedResumes();
      } else {
        alert("Failed to clear resume archive cache.");
      }
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
  };

  const handleNextToStep5 = () => {
    if (!candidateName.trim()) {
      alert("Please confirm the Candidate Full Name before proceeding.");
      return;
    }
    saveResumeToBackendCache(candidateName.trim(), uploadedFileName, resumeText, mappings);
    setActiveStep(5);
  };

  // Step 4: Resume upload
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedResumeName(''); // Reset pre-uploaded selection on new manual upload
    setUploadedFileName(file.name);
    
    // Clear older candidate mapping, evaluations, logs, and final verdicts
    setMappings([]);
    setEvaluations([]);
    setEvaluationLogs([]);
    setVerdict('');
    setVerdictSummary('');

    // Auto-extract candidate name from file name
    const baseName = file.name.split('.')[0];
    const cleanName = baseName
      .replace(/_|-/g, ' ')
      .replace(/\d+/g, '') // remove numbers
      .trim();
    setCandidateName(cleanName || baseName);
    setIsParsingFile(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/resume/parse', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) throw new Error("Failed to parse resume file.");
      const data = await resp.json();
      setResumeText(data.raw_text);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Step 4: Context chunk mapping
  const handleContextMapping = async () => {
    if (!resumeText) return;
    setIsMappingChunks(true);
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/resume/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          verticals: verticals,
          config: apiConfig
        })
      });
      if (!resp.ok) throw new Error("Failed to map resume chunks.");
      const data = await resp.json();
      setMappings(data.mappings);
      addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
      setActiveStep(4);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsMappingChunks(false);
    }
  };

  // Step 5: Agent execution (Batch Orchestrated Agent calling)
  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setEvaluations([]);
    setEvaluationLogs([
      "SYS_LOG: Starting Batch Evaluation Orchestrator...",
      "SYS_LOG: Compiling all mapped categories...",
      "SYS_LOG: Requesting concurrent scorecard evaluation via forced tool calling..."
    ]);
    
    const activeVerticals = verticals.filter(v => v.weight.lower ? v.weight.lower() !== "ignore" : v.weight.toLowerCase() !== "ignore");
    
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/agent/evaluate_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verticals: activeVerticals,
          mappings: mappings,
          system_prompt: compiledRubric,
          config: apiConfig
        })
      });

      if (!resp.ok) throw new Error("Batch evaluation endpoint failed.");
      const data = await resp.json();
      
      setEvaluations(data.evaluations);
      addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
      
      // Output detailed logs for each completed vertical
      const logLines = data.evaluations.map(e => 
        `  -> COMPLETED [${e.vertical_name}] - SCORE: ${e.score}/10`
      );
      
      setEvaluationLogs(prev => [
        ...prev,
        ...logLines,
        "SYS_LOG: Batch evaluation successfully processed in 1 roundtrip."
      ]);
    } catch (err) {
      console.error("Batch evaluation failed:", err);
      setEvaluationLogs(prev => [
        ...prev,
        `SYS_LOG: Orchestration failure: ${err.message}`
      ]);
      // Set fallbacks for active verticals
      const fallbacks = activeVerticals.map(v => ({
        vertical_name: v.name,
        score: 0,
        weight: v.weight,
        rationale: `System Error: ${err.message}`,
        green_points: [],
        miss_points: ["System evaluation error"],
        tokens: { input_tokens: 0, output_tokens: 0 }
      }));
      setEvaluations(fallbacks);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Step 7: Synthesize final verdict
  const handleSynthesizeVerdict = async () => {
    setIsSynthesizing(true);
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/agent/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluations: evaluations,
          config: apiConfig
        })
      });
      if (!resp.ok) throw new Error("Failed to synthesize final verdict.");
      const data = await resp.json();
      setVerdict(data.verdict);
      setVerdictSummary(data.summary);
      addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
      setActiveStep(7);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const toggleTab = (name) => {
    setExpandedTabs(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Reset entire workflow state
  const handleReset = () => {
    if (window.confirm("ARE YOU SURE? This will purge all screening state records.")) {
      setJdText('');
      setJdTitle('');
      setSelectedJdId('');
      setVerticals([]);
      setCompiledRubric('');
      setUploadedFileName('');
      setResumeText('');
      setCandidateName('');
      setMappings([]);
      setEvaluations([]);
      setEvaluationLogs([]);
      setVerdict('');
      setVerdictSummary('');
      setSelectedResumeName('');
      setActiveStep(1);
      setIsLandingScreen(true);
    }
  };

  return (
    <div className="crt-container">
      <div className="crt-scanlines"></div>
      
      {/* HEADER BANNER */}
      {(!isLandingScreen || isRegistryOpen) && (
        <header className="retro-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="retro-title" style={{ cursor: 'pointer' }} onClick={() => { setIsLandingScreen(true); setIsRegistryOpen(false); }} title="RETURN TO SYSTEM HOME">
                <Cpu className="neon-green" />
                Candidate_screener.ai
              </h1>
              <div className="retro-subtitle">
                CODENAME: CANDIDATE_SCREENER.AI_PIPELINE // SECURE CORE OPERATIONAL INTERFACE
              </div>
            </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setIsRegistryOpen(!isRegistryOpen)} 
              className="retro-button secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)' }}
            >
              <FileText size={14} />
              {isRegistryOpen ? "VIEW_SCREENER" : "CANDIDATE_LEADERBOARD"}
            </button>

            <button 
              onClick={() => setIsRetroTheme(!isRetroTheme)} 
              className="retro-button secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              <TermIcon size={14} />
              {isRetroTheme ? "MODERN_UI" : "RETRO_UI"}
            </button>

            <button 
              onClick={() => setIsLightTheme(!isLightTheme)} 
              className="retro-button secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              {isLightTheme ? <Moon size={14} /> : <Sun size={14} />}
              {isLightTheme ? "DARK_MODE" : "LIGHT_MODE"}
            </button>

            <button 
              onClick={() => setShowConfig(!showConfig)} 
              className="retro-button secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              <Settings size={14} />
              {showConfig ? "HIDE_CONFIG" : "SHOW_CONFIG"}
            </button>
            
            <button 
              onClick={handleReset} 
              className="retro-button amber"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              <RotateCcw size={14} />
              SYS_RESET
            </button>
          </div>
        </div>

        {/* API CONFIG CONTROL BLOCK */}
        {showConfig && (
          <div className="terminal-window cyan" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
            <div className="terminal-header">
              <span>[GCP_VERTEX_AI_AND_GEMINI_CONFIGURATION]</span>
              <span className="neon-cyan">API_SETTINGS_V1</span>
            </div>
            <div className="terminal-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem' }} className="neon-cyan">API_KEY / DEVEL_TOKEN</label>
                <input 
                  type="password" 
                  placeholder="Enter API key..." 
                  className="retro-input"
                  style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)' }}
                  value={apiConfig.api_key}
                  onChange={(e) => setApiConfig({ ...apiConfig, api_key: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem' }} className="neon-cyan">MODEL_SELECTION</label>
                <select 
                  value={apiConfig.model}
                  onChange={(e) => setApiConfig({ ...apiConfig, model: e.target.value })}
                  className="retro-select"
                  style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '0.5rem' }}
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Default/Fast)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Advanced)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  id="use_vertex"
                  checked={apiConfig.use_vertex}
                  onChange={(e) => setApiConfig({ ...apiConfig, use_vertex: e.target.checked })}
                  style={{ marginRight: '8px', accentColor: 'var(--text-cyan)' }}
                />
                <label htmlFor="use_vertex" style={{ fontSize: '0.75rem', cursor: 'pointer' }} className="neon-cyan">USE VERTEX AI MODE</label>
              </div>

              {apiConfig.use_vertex && (
                <>
                  <div>
                    <label style={{ fontSize: '0.75rem' }} className="neon-cyan">GCP PROJECT ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. my-project-id" 
                      className="retro-input"
                      style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)' }}
                      value={apiConfig.project_id || ''}
                      onChange={(e) => setApiConfig({ ...apiConfig, project_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem' }} className="neon-cyan">GCP REGION / LOCATION</label>
                    <input 
                      type="text" 
                      placeholder="e.g. us-central1" 
                      className="retro-input"
                      style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)' }}
                      value={apiConfig.location || ''}
                      onChange={(e) => setApiConfig({ ...apiConfig, location: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <button 
                  onClick={handleTestConfig}
                  className="retro-button secondary"
                  style={{ height: '38px', width: '100%' }}
                  disabled={isTestingConfig}
                >
                  {isTestingConfig ? "TESTING..." : "TEST_CONNECTION"}
                </button>
              </div>
            </div>
            
            {configMessage && (
              <div style={{ 
                borderTop: '1px dashed var(--text-cyan)', 
                padding: '0.5rem 1rem', 
                fontSize: '0.75rem',
                color: configSuccess ? 'var(--text-green)' : configSuccess === false ? 'var(--text-red)' : 'var(--text-cyan)'
              }}>
                {configMessage}
              </div>
            )}
          </div>
        )}
      </header>
      )}

      {/* PIPELINE STEP TRACKER BAR */}
      <main style={{ padding: '0 2rem 2rem 2rem' }}>
        {isRegistryOpen ? (
          <div className="terminal-window cyan">
            <div className="terminal-header">
              <span>[CANDIDATE_REGISTRY_AND_LEADERBOARD]</span>
              <span className="neon-cyan">DATABASE_QUERIES_ACTIVE</span>
            </div>
            <div className="terminal-content">
              <p className="text-dim" style={{ marginBottom: '1.5rem' }}>
                Archive of all screened candidate evaluations. Filter candidates by job position and click on any row to drill down into the full assessment report.
              </p>

              {/* Filter Toolbar */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <label style={{ fontSize: '0.75rem' }} className="neon-cyan">FILTER BY JOB POSITION</label>
                  <select
                    value={registryFilterJd}
                    onChange={(e) => setRegistryFilterJd(e.target.value)}
                    className="retro-select"
                    style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '4px' }}
                  >
                    <option value="">-- ALL POSITIONS --</option>
                    {savedJds.map(jd => (
                      <option key={jd.id} value={jd.id}>{jd.title.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setRegistryFilterJd('');
                    fetchCandidateRegistry();
                  }}
                  className="retro-button secondary"
                  style={{ padding: '0.65rem 1.2rem', marginTop: '1.25rem' }}
                >
                  CLEAR_FILTERS
                </button>
              </div>

              {/* Leaderboard Table */}
              {candidateRegistry.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  border: '1px dashed var(--text-cyan)',
                  borderRadius: '6px',
                  backgroundColor: '#040706',
                  color: '#666'
                }}>
                  NO CANDIDATE EVALUATIONS REGISTERED IN DATABASE.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: '2px solid var(--text-cyan)',
                        color: 'var(--text-cyan)',
                        textAlign: 'left'
                      }}>
                        <th style={{ padding: '0.75rem 1rem' }}>CANDIDATE NAME</th>
                        <th style={{ padding: '0.75rem 1rem' }}>JOB POSITION</th>
                        <th style={{ padding: '0.75rem 1rem' }}>DATE SCREENED</th>
                        <th style={{ padding: '0.75rem 1rem', textTransform: 'uppercase' }}>VERDICT</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>OVERALL SCORE</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidateRegistry
                        .filter(cand => !registryFilterJd || cand.jd_id === registryFilterJd)
                        .map((cand) => (
                          <tr 
                            key={cand.id} 
                            style={{
                              borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td 
                              onClick={() => setViewingCandDetails(cand)}
                              style={{ padding: '1rem', fontWeight: 'bold' }}
                              className="neon-cyan"
                            >
                              {cand.name}
                            </td>
                            <td 
                              onClick={() => setViewingCandDetails(cand)}
                              style={{ padding: '1rem', color: '#ccc' }}
                            >
                              {cand.jd_title.toUpperCase()}
                            </td>
                            <td 
                              onClick={() => setViewingCandDetails(cand)}
                              style={{ padding: '1rem', color: '#888' }}
                            >
                              {new Date(cand.date).toLocaleDateString()}
                            </td>
                            <td 
                              onClick={() => setViewingCandDetails(cand)}
                              style={{ padding: '1rem' }}
                            >
                              <span className={`priority-badge ${cand.verdict.toLowerCase() === 'fit' ? 'high' : 'ignore'}`}>
                                {cand.verdict.toUpperCase()}
                              </span>
                            </td>
                            <td 
                              onClick={() => setViewingCandDetails(cand)}
                              style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}
                              className="neon-green"
                            >
                              {cand.score.toFixed(1)} / 10
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingCandDetails(cand);
                                  }}
                                  className="retro-button secondary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  VIEW
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCandidate(cand.id);
                                  }}
                                  className="retro-button amber"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : isLandingScreen ? (
          <div className="terminal-window" style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <div className="terminal-header">
              <span>[SYSTEM_INITIALIZATION // Welcome, HR Operator]</span>
              <span className="neon-cyan">BOOT_SEQUENCE: COMPLETE</span>
            </div>
            <div className="terminal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Retro ASCII Branding */}
              <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
                <div style={{ 
                  display: 'inline-block',
                  border: '1px solid var(--text-cyan)', 
                  padding: '1.25rem 2.5rem', 
                  background: 'rgba(0, 229, 255, 0.03)',
                  boxShadow: '0 0 15px rgba(0, 229, 255, 0.15), inset 0 0 10px rgba(0, 229, 255, 0.1)',
                  borderRadius: isRetroTheme ? '0px' : '4px',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ 
                    fontSize: '1.6rem', 
                    fontWeight: '800', 
                    color: 'var(--text-cyan)', 
                    textShadow: '0 0 8px rgba(0, 229, 255, 0.5)',
                    letterSpacing: '2px'
                  }}>
                    ◢ Candidate_screener.ai ◣
                  </div>
                  <div style={{ 
                    fontSize: '0.65rem', 
                    color: '#888', 
                    marginTop: '6px', 
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    Agentic Candidate Assessment Console // v1.0.4
                  </div>
                </div>
              </div>

              {/* Quirky Greeting */}
              <div className="terminal-window" style={{ borderStyle: 'dashed', borderColor: 'var(--text-green)', background: 'rgba(0, 230, 118, 0.02)', marginBottom: 0 }}>
                <div className="terminal-header" style={{ background: 'rgba(0, 230, 118, 0.08)', color: 'var(--text-green)', borderBottom: '1px solid rgba(0, 230, 118, 0.25)' }}>
                  <span>[OPERATOR_GREETINGS]</span>
                </div>
                <div className="terminal-content" style={{ padding: '1rem 1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: '#ccc' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <span className="neon-green" style={{ fontWeight: 'bold' }}>GREETINGS, HUMAN ACQUISITION OFFICER.</span>
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    Our intelligence registers that the talent pool is currently saturated. Optimal screening metrics are required. 
                    The Agentic screening core is online, prepped with forced-tool calling and dual-layered fallbacks.
                  </p>
                  <p>
                    Initialize the pipeline to ingest a Job Description, modularize core dimensions, weight rubrics programmatically, and feed resume parameters to our evaluation sub-agents. Let's make some hires!
                  </p>
                </div>
              </div>

              {/* System Diagnostics Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="terminal-window" style={{ marginBottom: 0 }}>
                  <div className="terminal-header" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    <span>[SYS_DIAGNOSTICS]</span>
                  </div>
                  <div className="terminal-content" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>CORE ENGINE: <span className="neon-green" style={{ fontWeight: 'bold' }}>ONLINE</span></div>
                    <div>LLM PIPELINE: <span className="neon-cyan">READY</span></div>
                    <div>PERSISTENCE: <span className="neon-amber">JSON_FALLBACK</span></div>
                    <div>REDIS STATUS: <span className="neon-red">TIMEOUT_FALLBACK</span></div>
                  </div>
                </div>

                <div className="terminal-window" style={{ marginBottom: 0 }}>
                  <div className="terminal-header" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    <span>[DATA_BUFFERS]</span>
                  </div>
                  <div className="terminal-content" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>SAVED JDS: <span className="neon-cyan" style={{ fontWeight: 'bold' }}>{savedJds.length}</span></div>
                    <div>CANDIDATES SCREENED: <span className="neon-green" style={{ fontWeight: 'bold' }}>{candidateRegistry.length}</span></div>
                    <div>CACHED RESUMES: <span className="neon-amber" style={{ fontWeight: 'bold' }}>{savedResumes.length}</span></div>
                    <div>SESSION TOKENS: <span style={{ fontWeight: 'bold' }}>{sessionTelemetry.input_tokens + sessionTelemetry.output_tokens}</span></div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    setIsLandingScreen(false);
                    setActiveStep(1);
                  }}
                  className="retro-button"
                  style={{ padding: '0.8rem 2rem', fontSize: '0.95rem', boxShadow: '0 0 15px rgba(0, 230, 118, 0.3)' }}
                >
                  <Play size={16} />
                  INITIALIZE PIPELINE // START SCREENING
                </button>

                <button 
                  onClick={() => {
                    setIsRegistryOpen(true);
                  }}
                  className="retro-button secondary"
                  style={{ padding: '0.8rem 1.5rem', fontSize: '0.85rem' }}
                >
                  <FileText size={16} />
                  ACCESS LEADERBOARD
                </button>
              </div>

            </div>
          </div>
        ) : (
          <>
            <div className="step-tracker">
              {[
                { id: 1, label: "1: JD_INGEST" },
                { id: 2, label: "2: CHOOSE_WEIGHTS" },
                { id: 3, label: "3: GEN_RUBRIC" },
                { id: 4, label: "4: RESUME_INGEST" },
                { id: 5, label: "5: CORE_EVAL" },
                { id: 6, label: "6: INSIGHTS" },
                { id: 7, label: "7: VERDICT" }
              ].map((st) => (
                <div 
                  key={st.id} 
                  className={`step-tracker-item ${activeStep === st.id ? 'active' : activeStep > st.id ? 'completed' : ''}`}
                >
                  {st.label}
                </div>
              ))}
            </div>

            {/* RETRO SOFT GLASS PROGRESS BAR */}
            <div className="terminal-window" style={{
              padding: '0.6rem 1rem',
              marginBottom: '2rem',
              marginTop: '-1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              borderColor: 'rgba(0, 230, 118, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-green)',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}>
                <span>SCREENING_STAGE: {
                  activeStep === 1 ? "JD_INGESTION" :
                  activeStep === 2 ? "DIMENSION_WEIGHTING" :
                  activeStep === 3 ? "RUBRIC_COMPILATION" :
                  activeStep === 4 ? "RESUME_INGEST_AND_MAPPING" :
                  activeStep === 5 ? "AGENT_EVALUATION_BATCH" :
                  activeStep === 6 ? "SECTIONAL_SCORECARD" :
                  "FINAL_VERDICT_REPORT"
                }</span>
                <span className="neon-green">
                  [{'='.repeat((activeStep - 1) * 4)}{' '.repeat(24 - (activeStep - 1) * 4)}] {Math.round(((activeStep - 1) / 6) * 100)}%
                </span>
              </div>
              <div style={{
                height: '10px',
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 230, 118, 0.25)',
                borderRadius: isRetroTheme ? '0px' : '5px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.8)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${((activeStep - 1) / 6) * 100}%`,
                  background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.65) 0%, rgba(0, 230, 118, 0.85) 100%)',
                  boxShadow: '0 0 12px rgba(0, 230, 118, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                  transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  borderRadius: isRetroTheme ? '0px' : '4px',
                  backdropFilter: 'blur(4px)'
                }}></div>
              </div>
            </div>

            {/* WORKSPACE LAYOUT */}
            <div className="dashboard-grid">
              
              {/* LEFT: PRIMARY ACTION SCREEN */}
              <section style={{ position: 'relative' }}>
                
                {/* STEP 1: JD INGESTION */}
                {activeStep === 1 && (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span>[STEP_01 // INGEST_JOB_DESCRIPTION]</span>
                      <span>SANITY_CHECK_MODE</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1rem' }}>
                        Paste or enter the raw Job Description text below. The compiler sanitizes formatting and strips whitespace without LLM usage.
                      </p>

                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 250px' }}>
                          <label style={{ fontSize: '0.75rem' }} className="neon-cyan">LOAD_PRE_SAVED_JOB_DESCRIPTION</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={selectedJdId}
                              onChange={(e) => handleSelectSavedJd(e.target.value)}
                              className="retro-select"
                              style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '4px', flexGrow: 1 }}
                              disabled={isModularizing}
                            >
                              <option value="">-- SELECT FROM LIBRARY --</option>
                              {savedJds.map(jd => (
                                <option key={jd.id} value={jd.id}>{jd.title.toUpperCase()}</option>
                              ))}
                            </select>
                            {selectedJdId && (
                              <button
                                onClick={handleDeleteJd}
                                className="retro-button secondary"
                                style={{ height: '38px', borderColor: 'var(--text-red)', color: 'var(--text-red)', marginTop: '4px', padding: '0 8px' }}
                                title="DELETE SELECTED JD"
                                disabled={isModularizing}
                              >
                                DELETE
                              </button>
                            )}
                            {savedJds.length > 0 && (
                              <button
                                onClick={handleClearJds}
                                className="retro-button secondary"
                                style={{ height: '38px', borderColor: 'var(--text-red)', color: 'var(--text-red)', marginTop: '4px', padding: '0 8px' }}
                                title="CLEAR ALL SAVED JDs"
                                disabled={isModularizing}
                              >
                                CLEAR
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                          <label style={{ fontSize: '0.75rem' }} className="neon-cyan">JOB POSITION TITLE</label>
                          <input 
                            type="text" 
                            placeholder="e.g. AI Builder Developer" 
                            className="retro-input"
                            style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '4px' }}
                            value={jdTitle}
                            onChange={(e) => setJdTitle(e.target.value)}
                            disabled={isModularizing}
                          />
                        </div>
                      </div>
                      
                      <textarea
                        rows={12}
                        placeholder="PASTE JOB DESCRIPTION HERE..."
                        className="retro-textarea"
                        value={jdText}
                        onChange={(e) => {
                          setJdText(e.target.value);
                          if (selectedJdId) setSelectedJdId('');
                        }}
                        disabled={isModularizing}
                      ></textarea>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        {isModularizing && (
                          <div className="neon-cyan" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                            <span className="spinner-anim"></span> PROCESSING REQUEST...
                          </div>
                        )}
                        <button 
                          onClick={handleNextFromStep1} 
                          className="retro-button"
                          disabled={isModularizing || !jdText.trim()}
                        >
                          {isModularizing ? "MODULARIZING..." : "NEXT: EXTRACT_VERTICALS"}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: JD MODULARIZATION & PRIORITIZATION */}
                {activeStep === 2 && (
                  <div className="terminal-window amber">
                    <div className="terminal-header">
                      <span>[STEP_02 // MODULARIZE_AND_PRIORITIZE]</span>
                      <span className="neon-amber">WEIGHTING_SYSTEM</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1.2rem' }}>
                        Extracted vertical dimensions from the Job Description. Assign a grading priority weight to each card.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {verticals.map((vert, idx) => (
                          <div key={idx} className="priority-card" style={{ borderColor: vert.weight === 'Ignore' ? '#444' : 'var(--text-amber)' }}>
                            <div style={{ flexGrow: 1, paddingRight: '1rem' }}>
                              <h3 className="neon-amber" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sliders size={14} />
                                {vert.name}
                              </h3>
                              <p style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '4px' }}>
                                {vert.description}
                              </p>
                            </div>
                            <div>
                              <select 
                                value={vert.weight}
                                onChange={(e) => {
                                  const updated = [...verticals];
                                  updated[idx].weight = e.target.value;
                                  setVerticals(updated);
                                }}
                                className="priority-select"
                                style={{ borderColor: 'var(--text-amber)', color: 'var(--text-amber)' }}
                                disabled={isCompilingRubric}
                              >
                                <option value="High">HIGH</option>
                                <option value="Medium">MEDIUM</option>
                                <option value="Low">LOW</option>
                                <option value="Ignore">IGNORE</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => setActiveStep(1)} className="retro-button secondary" disabled={isCompilingRubric}>
                          <ChevronLeft size={16} />
                          BACK_TO_JD
                        </button>

                        <button 
                          onClick={handleSaveJd} 
                          className="retro-button secondary"
                          style={{ borderColor: 'var(--text-amber)', color: 'var(--text-amber)' }}
                          disabled={isCompilingRubric}
                        >
                          SAVE_JD_TO_LIBRARY
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isCompilingRubric && (
                            <div className="neon-cyan" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                              <span className="spinner-anim"></span> PROCESSING REQUEST...
                            </div>
                          )}
                          <button 
                            onClick={handleCompileRubric} 
                            className="retro-button amber"
                            disabled={isCompilingRubric || verticals.length === 0}
                          >
                            {isCompilingRubric ? "COMPILING..." : "NEXT: DYNAMIC_RUBRIC"}
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: DYNAMIC RUBRIC GENERATION */}
                {activeStep === 3 && (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span>[STEP_03 // PROGRAMMATIC_RUBRIC_COMPILATION]</span>
                      <span>NO_LLM_CALL_SECURE</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1rem' }}>
                        This strict evaluation system prompt instructs the evaluation agent in Step 5. Generated locally from your priorities.
                      </p>
                      
                      <pre style={{ 
                        background: '#040706', 
                        border: '1px solid var(--text-dim-green)', 
                        padding: '1rem', 
                        borderRadius: '3px',
                        color: 'var(--text-green)',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                        maxHeight: '280px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {compiledRubric}
                      </pre>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => setActiveStep(2)} className="retro-button secondary">
                          <ChevronLeft size={16} />
                          BACK_TO_WEIGHTS
                        </button>
                        <button onClick={() => setActiveStep(4)} className="retro-button">
                          NEXT: RESUME_INGESTION
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: RESUME PARSING & CONTEXT MAPPING */}
                {activeStep === 4 && (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span>[STEP_04 // RESUME_PARSING_AND_SEGMENTATION]</span>
                      <span>LIGHTWEIGHT_FLASH_MODEL</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1rem' }}>
                        Upload candidate PDF/DOCX or select a previously uploaded resume. Gemini maps relevant sentences directly to the evaluation verticals.
                      </p>

                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 300px' }}>
                          <label style={{ fontSize: '0.75rem' }} className="neon-cyan">LOAD_PRE_UPLOADED_RESUME</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={selectedResumeName}
                              onChange={(e) => handleSelectSavedResume(e.target.value)}
                              className="retro-select"
                              style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '4px', flexGrow: 1 }}
                              disabled={isParsingFile || isMappingChunks}
                            >
                              <option value="">-- SELECT FROM ARCHIVE --</option>
                              {savedResumes.map(r => (
                                <option key={r.candidate_name} value={r.candidate_name}>
                                  {r.candidate_name.toUpperCase()} ({r.filename.toUpperCase()})
                                </option>
                              ))}
                            </select>
                            {savedResumes.length > 0 && (
                              <button
                                onClick={handleClearResumes}
                                className="retro-button secondary"
                                style={{ height: '38px', borderColor: 'var(--text-red)', color: 'var(--text-red)', marginTop: '4px', padding: '0 8px' }}
                                title="CLEAR ALL CACHED RESUMES"
                                disabled={isParsingFile || isMappingChunks}
                              >
                                CLEAR
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        border: '2px dashed var(--text-dim-green)', 
                        borderRadius: '4px', 
                        padding: '2rem', 
                        textAlign: 'center',
                        backgroundColor: '#040706',
                        cursor: (isParsingFile || isMappingChunks) ? 'not-allowed' : 'pointer',
                        marginBottom: '1rem',
                        position: 'relative',
                        opacity: (isParsingFile || isMappingChunks) ? 0.6 : 1
                      }}>
                        <input 
                          type="file" 
                          accept=".pdf,.docx" 
                          onChange={handleResumeUpload}
                          disabled={isParsingFile || isMappingChunks}
                          style={{ 
                            position: 'absolute', 
                            top: 0, left: 0, width: '100%', height: '100%', 
                            opacity: 0, cursor: (isParsingFile || isMappingChunks) ? 'not-allowed' : 'pointer' 
                          }} 
                        />
                        <Upload size={32} style={{ color: 'var(--text-green)', marginBottom: '8px' }} />
                        <p style={{ fontWeight: 'bold' }}>
                          {uploadedFileName ? `SELECTED: ${uploadedFileName.toUpperCase()}` : "DROP OR CLICK TO UPLOAD RESUME"}
                        </p>
                        <p className="text-dim" style={{ fontSize: '0.75rem', marginTop: '4px' }}>PDF OR DOCX FORMAT ONLY</p>
                      </div>

                      {isParsingFile && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-amber)', marginBottom: '1rem' }}>
                          SYS_LOADER: Parsing binary text buffer...
                        </div>
                      )}

                      {resumeText && !isParsingFile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-green)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                          <CheckCircle2 size={16} />
                          TEXT PARSING COMPLETE ({resumeText.length} CHARS CACHED).
                        </div>
                      )}

                      {uploadedFileName && (
                        <div style={{ marginBottom: '1.2rem' }}>
                          <label style={{ fontSize: '0.75rem' }} className="neon-cyan">CONFIRM CANDIDATE FULL NAME</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Alice Smith" 
                            className="retro-input"
                            style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '4px' }}
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            disabled={isParsingFile || isMappingChunks}
                          />
                        </div>
                      )}

                      {mappings.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }} className="neon-cyan">MAPPED RESUME SECTIONS:</h3>
                          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--text-dim-green)', padding: '0.8rem', background: '#020503' }}>
                            {(() => {
                              const grouped = {};
                              mappings.forEach(m => {
                                if (!grouped[m.vertical_name]) {
                                  grouped[m.vertical_name] = [];
                                }
                                grouped[m.vertical_name].push(m.chunk_text);
                              });
                              return Object.entries(grouped).map(([vName, texts], idx) => {
                                // Consolidate text chunks, cleaning up duplicates
                                const uniqueTexts = [...new Set(texts.flatMap(t => {
                                  if (t.includes('• ')) {
                                    return t.split('\n').map(line => line.replace(/^•\s*/, '').trim()).filter(Boolean);
                                  }
                                  return [t.trim()];
                                }))];
                                
                                const combinedText = uniqueTexts.length > 1
                                  ? uniqueTexts.map(t => `• ${t}`).join('\n')
                                  : uniqueTexts[0] || 'No evidence provided';

                                return (
                                  <div key={idx} style={{ marginBottom: '0.8rem', borderBottom: '1px dashed #222', paddingBottom: '0.5rem' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.75rem' }} className="neon-cyan">{vName.toUpperCase()}</div>
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#aaa', 
                                      marginTop: '4px',
                                      whiteSpace: 'pre-line',
                                      fontStyle: combinedText === 'No evidence provided' ? 'italic' : 'normal' 
                                    }}>
                                      {combinedText}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => setActiveStep(3)} className="retro-button secondary" disabled={isParsingFile || isMappingChunks}>
                          <ChevronLeft size={16} />
                          BACK_TO_RUBRIC
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {(isParsingFile || isMappingChunks) && (
                            <div className="neon-cyan" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                              <span className="spinner-anim"></span> PROCESSING REQUEST...
                            </div>
                          )}
                          {mappings.length === 0 ? (
                            <button 
                              onClick={handleContextMapping} 
                              className="retro-button"
                              disabled={isMappingChunks || !resumeText || isParsingFile}
                            >
                              {isMappingChunks ? "MAPPING CHUNKS..." : "MAP_RESUME_CONTEXT"}
                              <ChevronRight size={16} />
                            </button>
                          ) : (
                            <button onClick={handleNextToStep5} className="retro-button" disabled={isParsingFile || isMappingChunks}>
                              NEXT: AGENT_EXECUTION
                              <ChevronRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: AGENT EXECUTION */}
                {activeStep === 5 && (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span>[STEP_05 // ASYNCHRONOUS_AGENT_EVALUATION]</span>
                      <span>PIPELINE_ENGINE</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1.2rem' }}>
                        Execute the LLM processing agent. It will evaluate each rubric vertical chunk independently in an asynchronous layout loop.
                      </p>

                      <div style={{ 
                        border: '1px solid var(--text-green)', 
                        background: 'black', 
                        borderRadius: '4px',
                        padding: '1rem',
                        minHeight: '180px',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        marginBottom: '1rem'
                      }}>
                        {evaluationLogs.length === 0 ? (
                          <div className="text-dim">CONSOLE_IDLE. READY TO LAUNCH AGENT PIPELINE.</div>
                        ) : (
                          evaluationLogs.map((log, index) => (
                            <div key={index} style={{ marginBottom: '4px', color: log.includes('ERROR') ? 'var(--text-red)' : 'var(--text-green)' }}>
                              {log}
                            </div>
                          ))
                        )}
                        {activeEvalVertical && (
                          <div className="neon-amber" style={{ marginTop: '8px' }}>
                            PROCESSING VERTICAL: [{activeEvalVertical.toUpperCase()}] <span className="cursor"></span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => setActiveStep(4)} className="retro-button secondary" disabled={isEvaluating}>
                          <ChevronLeft size={16} />
                          BACK_TO_MAPS
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isEvaluating && (
                            <div className="neon-cyan" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                              <span className="spinner-anim"></span> PROCESSING REQUEST...
                            </div>
                          )}
                          <button 
                            onClick={handleRunEvaluation} 
                            className="retro-button amber"
                            disabled={isEvaluating}
                          >
                            <Play size={14} />
                            {evaluations.length > 0 ? "RE-RUN EVALUATION" : "RUN EVALUATION"}
                          </button>
                        </div>

                        <button 
                          onClick={() => setActiveStep(6)} 
                          className="retro-button"
                          disabled={evaluations.length === 0 || isEvaluating}
                        >
                          NEXT: INSIGHTS
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: SECTIONAL SCORING & INSIGHTS */}
                {activeStep === 6 && (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span>[STEP_06 // EVALUATION_DASHBOARD_AND_METRICS]</span>
                      <span>SECTIONAL_INSIGHTS</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1.2rem' }}>
                        Sectional scores display detailed rationale, Green points (strengths), and Miss points (gaps) for each vertical.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {evaluations.map((ev, idx) => {
                          const isExpanded = expandedTabs[ev.vertical_name];
                          const vertWeight = verticals.find(v => v.name === ev.vertical_name)?.weight || 'High';
                          
                          return (
                            <div key={idx} style={{ border: '1px solid var(--text-dim-green)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div 
                                className="collapsible-header" 
                                onClick={() => toggleTab(ev.vertical_name)}
                              >
                                <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  {ev.vertical_name.toUpperCase()} 
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }} className="text-dim">
                                    (Weight: {vertWeight})
                                  </span>
                                </span>
                                <span className="score-badge">
                                  {ev.score} / 10
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="collapsible-content">
                                  <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '8px' }}>
                                    <strong>Rationale:</strong> {ev.rationale}
                                  </p>
                                  
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    <div>
                                      <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold' }} className="neon-green">GREEN POINTS (STRENGTHS)</h4>
                                      {ev.green_points.length === 0 ? (
                                        <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>No positive points logged</div>
                                      ) : (
                                        <ul className="bullet-list">
                                          {ev.green_points.map((pt, i) => <li key={i} className="green" style={{ fontSize: '0.75rem' }}>{pt}</li>)}
                                        </ul>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold' }} className="neon-red">MISS POINTS (GAPS)</h4>
                                      {ev.miss_points.length === 0 ? (
                                        <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>No gaps logged</div>
                                      ) : (
                                        <ul className="bullet-list">
                                          {ev.miss_points.map((pt, i) => <li key={i} className="miss" style={{ fontSize: '0.75rem' }}>{pt}</li>)}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button onClick={() => setActiveStep(5)} className="retro-button secondary" disabled={isSynthesizing}>
                          <ChevronLeft size={16} />
                          BACK_TO_EVAL
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isSynthesizing && (
                            <div className="neon-cyan" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                              <span className="spinner-anim"></span> PROCESSING REQUEST...
                            </div>
                          )}
                          <button 
                            onClick={handleSynthesizeVerdict} 
                            className="retro-button"
                            disabled={isSynthesizing}
                          >
                            {isSynthesizing ? "SYNTHESIZING..." : "NEXT: FINAL_VERDICT"}
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 7: FINAL CONCLUSION */}
                {activeStep === 7 && (
                  <div className="terminal-window">
                    <div className="terminal-header">
                      <span>[STEP_07 // FINAL_VERDICT_REPORT]</span>
                      <span>EXECUTIVE_READOUT</span>
                    </div>
                    <div className="terminal-content">
                      <p className="text-dim" style={{ marginBottom: '1.2rem' }}>
                        The pipeline logic compiled sectional scores and synthesized this final screening verdict.
                      </p>

                      <div className={`verdict-board ${verdict.toLowerCase() === 'fit' ? 'fit' : 'miss'}`}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '2px' }}>
                          SCREENING RESOLUTION STATUS
                        </div>
                        <div className="verdict-title">
                          {verdict.toUpperCase()}
                        </div>
                      </div>

                      <div className="terminal-window" style={{ borderStyle: 'dashed' }}>
                        <div className="terminal-header" style={{ background: '#111', color: 'var(--text-green)' }}>
                          <span>[2_SENTENCE_EXECUTIVE_SUMMARY]</span>
                        </div>
                        <div className="terminal-content" style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#ccc' }}>
                          {verdictSummary}
                        </div>
                      </div>

                      <div className="terminal-window" style={{ marginTop: '1.5rem', borderStyle: 'dashed', borderColor: 'var(--text-cyan)' }}>
                        <div className="terminal-header" style={{ background: 'rgba(0, 229, 255, 0.08)', color: 'var(--text-cyan)', borderBottom: '1px solid rgba(0, 229, 255, 0.25)' }}>
                          <span>[LOG_VERDICT_TO_REGISTRY]</span>
                        </div>
                        <div className="terminal-content" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flexGrow: 1 }}>
                            <label style={{ fontSize: '0.75rem' }} className="neon-cyan">CANDIDATE FULL NAME</label>
                            <input 
                              type="text" 
                              placeholder="Enter candidate name..." 
                              className="retro-input"
                              style={{ borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)', marginTop: '4px' }}
                              value={candidateName}
                              onChange={(e) => setCandidateName(e.target.value)}
                            />
                          </div>
                          <button 
                            onClick={handleSaveCandidate}
                            className="retro-button secondary"
                            style={{ height: '42px' }}
                            disabled={!candidateName.trim()}
                          >
                            SAVE_VERDICT_REPORT
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <button onClick={() => setActiveStep(6)} className="retro-button secondary">
                          <ChevronLeft size={16} />
                          BACK_TO_METRICS
                        </button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={() => {
                              // Clear candidate-specific and JD-specific details
                              setJdText('');
                              setJdTitle('');
                              setSelectedJdId('');
                              setVerticals([]);
                              setCompiledRubric('');
                              setUploadedFileName('');
                              setResumeText('');
                              setCandidateName('');
                              setMappings([]);
                              setEvaluations([]);
                              setEvaluationLogs([]);
                              setVerdict('');
                              setVerdictSummary('');
                              setSelectedResumeName('');
                              // Redirect to Step 1
                              setActiveStep(1);
                            }} 
                            className="retro-button secondary"
                            style={{ borderColor: 'var(--text-amber)', color: 'var(--text-amber)' }}
                          >
                            START OVER (STEP 1)
                          </button>
                          <button 
                            onClick={() => {
                              // Clear candidate-specific details
                              setUploadedFileName('');
                              setResumeText('');
                              setCandidateName('');
                              setMappings([]);
                              setEvaluations([]);
                              setEvaluationLogs([]);
                              setVerdict('');
                              setVerdictSummary('');
                              setSelectedResumeName('');
                              // Redirect to Step 4 (Resume Ingest)
                              setActiveStep(4);
                            }} 
                            className="retro-button amber"
                          >
                            SCREEN NEW CANDIDATE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </section>
              
              {/* RIGHT: TELEMETRY & CHAT ASSISTANT SIDEBAR */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* TOKEN TELEMETRY CIRUCLAR PROGRESS */}
                <TokenTelemetry 
                  phaseTelemetry={phaseTelemetry[activeStep]} 
                  sessionTelemetry={sessionTelemetry} 
                />

                {/* RETRO AI CHAT ASSISTANT */}
                <RetroChatAssistant 
                  stepId={activeStep} 
                  stepContext={stepContexts[activeStep] || {}} 
                  apiConfig={apiConfig} 
                  onTokensSpent={(inp, out) => addTokens(inp, out)} 
                />

              </aside>

            </div>
          </>
        )}
      </main>


      {/* CANDIDATE DETAIL DRILL-DOWN MODAL */}
      {viewingCandDetails && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '2rem',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="terminal-window cyan" style={{
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            marginBottom: 0
          }}>
            <div className="terminal-header">
              <span>[CANDIDATE_DETAIL // {viewingCandDetails.name.toUpperCase()}]</span>
              <button 
                onClick={() => setViewingCandDetails(null)} 
                className="retro-button secondary" 
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--text-cyan)', color: 'var(--text-cyan)' }}
              >
                CLOSE [X]
              </button>
            </div>
            <div className="terminal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 className="neon-cyan" style={{ fontSize: '1.8rem' }}>{viewingCandDetails.name}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                    POSITION: <span className="neon-cyan">{viewingCandDetails.jd_title.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>
                    SCREENED ON: {new Date(viewingCandDetails.date).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className={`score-badge`} style={{ fontSize: '1.5rem', padding: '0.5rem 1rem' }}>
                    {(viewingCandDetails.score).toFixed(1)} / 10
                  </div>
                  <div className={`priority-badge ${viewingCandDetails.verdict.toLowerCase() === 'fit' ? 'high' : 'ignore'}`} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem' }}>
                    {viewingCandDetails.verdict.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="terminal-window" style={{ borderStyle: 'dashed', borderColor: '#444' }}>
                <div className="terminal-header" style={{ background: '#111', fontSize: '0.8rem' }}>
                  <span>[EXECUTIVE_SUMMARY]</span>
                </div>
                <div className="terminal-content" style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: '1.5' }}>
                  {viewingCandDetails.summary}
                </div>
              </div>

              <h3 className="neon-cyan" style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '1rem' }}>SECTIONAL BREAKDOWNS:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {viewingCandDetails.evaluations.map((ev, idx) => (
                  <div key={idx} style={{ border: '1px solid rgba(0, 229, 255, 0.2)', padding: '1rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>{ev.vertical_name.toUpperCase()}</span>
                      <span className="score-badge" style={{ fontSize: '0.85rem', padding: '2px 8px' }}>{ev.score}/10</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '0.8rem' }}>
                      {ev.rationale}
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.75rem' }} className="neon-green">STRENGTHS</h4>
                        {ev.green_points.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>None logged</div>
                        ) : (
                          <ul className="bullet-list">
                            {ev.green_points.map((pt, i) => <li key={i} className="green" style={{ fontSize: '0.72rem' }}>{pt}</li>)}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.75rem' }} className="neon-red">GAPS</h4>
                        {ev.miss_points.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>None logged</div>
                        ) : (
                          <ul className="bullet-list">
                            {ev.miss_points.map((pt, i) => <li key={i} className="miss" style={{ fontSize: '0.72rem' }}>{pt}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
