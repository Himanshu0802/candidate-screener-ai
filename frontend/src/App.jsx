import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  Sparkles, 
  Bot, 
  FileText, 
  Settings, 
  Sun, 
  Moon, 
  RotateCcw, 
  Coins,
  Home
} from 'lucide-react';
import HeaderNav from './components/screener/HeaderNav';
import SettingsDrawer from './components/screener/SettingsDrawer';
import LeaderboardModal from './components/screener/LeaderboardModal';
import AlignedResumeModal from './components/screener/AlignedResumeModal';
import WorkflowGraphStepper from './components/screener/WorkflowGraphStepper';
import StickyCopilotWidget from './components/screener/StickyCopilotWidget';

import JDCard from './components/screener/JDCard';
import CompetencyCard from './components/screener/CompetencyCard';
import ResumeIngestCard from './components/screener/ResumeIngestCard';
import EvaluationCard from './components/screener/EvaluationCard';
import ScorecardStack from './components/screener/ScorecardStack';
import VerdictCard from './components/screener/VerdictCard';

import RAGWorkbench from './components/RAGWorkbench';
import MinimalChatScreener from './components/screener/MinimalChatScreener';
import LandingPage from './components/LandingPage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  // --- WORKBENCH VIEW STATE ---
  const [activeMainView, setActiveMainView] = useState('landing'); // 'landing', 'chat', 'screener', or 'rag'

  // --- THEME STATE ---
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [isRetroTheme, setIsRetroTheme] = useState(false);

  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightTheme]);

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
  const [availableModels, setAvailableModels] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configMessage, setConfigMessage] = useState('');

  // --- DATABASE & PERSISTENCE STATES ---
  const [savedJds, setSavedJds] = useState([]);
  const [selectedJdId, setSelectedJdId] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateRegistry, setCandidateRegistry] = useState([]);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);

  // --- RESUME CACHE & REUSE STATES ---
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResumeName, setSelectedResumeName] = useState('');

  // --- VIEW MODE: 'stack' or 'drawer' ---
  const [viewMode, setViewMode] = useState('stack');

  // --- STACKED CARDS STEP TRACKING ---
  const [activeStep, setActiveStep] = useState(1);
  const [expandedCards, setExpandedCards] = useState({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false
  });

  const toggleCardExpand = (stepId) => {
    setExpandedCards(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const setOnlyCardExpanded = (stepId) => {
    setActiveStep(stepId);
    setExpandedCards({
      1: stepId === 1,
      2: stepId === 2,
      3: stepId === 3,
      4: stepId === 4,
      5: stepId === 5,
      6: stepId === 6
    });
  };

  // --- TOKEN TELEMETRY STATE ---
  const [sessionTelemetry, setSessionTelemetry] = useState({ input_tokens: 0, output_tokens: 0 });
  const [phaseTelemetry, setPhaseTelemetry] = useState({
    1: { input_tokens: 0, output_tokens: 0 },
    2: { input_tokens: 0, output_tokens: 0 },
    3: { input_tokens: 0, output_tokens: 0 },
    4: { input_tokens: 0, output_tokens: 0 },
    5: { input_tokens: 0, output_tokens: 0 },
    6: { input_tokens: 0, output_tokens: 0 }
  });

  const addTokens = (input, output) => {
    setSessionTelemetry(prev => ({
      input_tokens: prev.input_tokens + input,
      output_tokens: prev.output_tokens + output
    }));
    setPhaseTelemetry(prev => ({
      ...prev,
      [activeStep]: {
        input_tokens: (prev[activeStep]?.input_tokens || 0) + input,
        output_tokens: (prev[activeStep]?.output_tokens || 0) + output
      }
    }));
  };

  // --- STEP 1: JD INGESTION STATE ---
  const [jdText, setJdText] = useState('');
  const [isModularizing, setIsModularizing] = useState(false);

  // --- STEP 2: COMPETENCY WEIGHTS & RUBRIC STATE ---
  const [verticals, setVerticals] = useState([]);
  const [compiledRubric, setCompiledRubric] = useState('');
  const [isCompilingRubric, setIsCompilingRubric] = useState(false);

  // --- STEP 3: RESUME PARSER & MAPPING STATE ---
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [isMappingChunks, setIsMappingChunks] = useState(false);

  // --- STEP 4: AGENT EVALUATION STATE ---
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationLogs, setEvaluationLogs] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeEvalVertical, setActiveEvalVertical] = useState('');

  // --- STEP 5: SECTIONAL SCORECARD STATE ---
  const [expandedTabs, setExpandedTabs] = useState({});

  // --- STEP 6: FINAL VERDICT & RESUME OPTIMIZATION STATE ---
  const [verdict, setVerdict] = useState('');
  const [verdictSummary, setVerdictSummary] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const [isOptimizingResume, setIsOptimizingResume] = useState(false);
  const [alignedResumeText, setAlignedResumeText] = useState('');
  const [alignedHighlights, setAlignedHighlights] = useState([]);
  const [isAlignedModalOpen, setIsAlignedModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Context for retro chat assistant
  const [stepContexts, setStepContexts] = useState({});

  useEffect(() => {
    setStepContexts({
      1: { jdTextLength: jdText.length, position: jdTitle },
      2: { extractedVerticals: verticals },
      3: { resumeFileName: uploadedFileName, hasResumeText: !!resumeText, mappingsCount: mappings.length },
      4: { ongoingEvaluation: isEvaluating, logs: evaluationLogs, processedCount: evaluations.length },
      5: { scoringResults: evaluations },
      6: { finalVerdict: verdict, summary: verdictSummary }
    });
  }, [
    jdText,
    jdTitle,
    verticals,
    uploadedFileName,
    resumeText,
    mappings,
    isEvaluating,
    evaluationLogs,
    evaluations,
    verdict,
    verdictSummary
  ]);

  // Initial load
  useEffect(() => {
    fetchSavedJds();
    fetchCandidateRegistry();
    fetchSavedResumes();
  }, []);

  const fetchSavedJds = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/jds`);
      if (resp.ok) {
        const data = await resp.json();
        setSavedJds(data);
      }
    } catch (e) {
      console.error("Failed to load saved JDs", e);
    }
  };

  const fetchSavedResumes = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/resumes`);
      if (resp.ok) {
        const data = await resp.json();
        setSavedResumes(data);
      }
    } catch (e) {
      console.error("Failed to load saved resumes", e);
    }
  };

  const fetchCandidateRegistry = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/candidates`);
      if (resp.ok) {
        const data = await resp.json();
        setCandidateRegistry(data);
      }
    } catch (e) {
      console.error("Failed to load candidates", e);
    }
  };

  const fetchAvailableModels = async (configOverride = null) => {
    const cfg = configOverride || apiConfig;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/models/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        }
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  };

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
      const resp = await fetch(`${API_BASE_URL}/api/config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: apiConfig })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setConfigSuccess(true);
        setConfigMessage("CONNECTION ESTABLISHED. Handshake successful.");
        addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
        fetchAvailableModels(apiConfig);
        setTimeout(() => setIsSettingsOpen(false), 1500);
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

  // --- STEP 1 HANDLERS ---
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
      const suggested = window.prompt("Enter a title for this Job Description:", "Software Engineer");
      if (!suggested) return;
      title = suggested;
      setJdTitle(suggested);
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/api/jds`, {
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
      alert(`Job Description saved as [${title.toUpperCase()}] in library!`);
    } catch (err) {
      alert("Error saving JD: " + err.message);
    }
  };

  const handleDeleteJd = async () => {
    if (!selectedJdId) return;
    const jdToDelete = savedJds.find(j => j.id === selectedJdId);
    const title = jdToDelete ? jdToDelete.title : "this Job Description";
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/jds/${selectedJdId}`, { method: 'DELETE' });
      if (resp.ok) {
        setSelectedJdId('');
        setJdTitle('');
        setJdText('');
        setVerticals([]);
        setCompiledRubric('');
        fetchSavedJds();
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleClearJds = async () => {
    if (!window.confirm("Are you sure you want to clear the entire JD library?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/jds/clear`, { method: 'POST' });
      if (resp.ok) {
        setSelectedJdId('');
        setJdTitle('');
        setJdText('');
        setVerticals([]);
        setCompiledRubric('');
        fetchSavedJds();
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleNextFromStep1 = async () => {
    if (selectedJdId && verticals && verticals.length > 0) {
      setOnlyCardExpanded(2);
    } else {
      await handleModularizeJd();
    }
  };

  const handleModularizeJd = async () => {
    if (!jdText.trim()) return;
    setIsModularizing(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/jd/modularize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText, config: apiConfig })
      });
      if (!resp.ok) throw new Error("Failed to modularize Job Description.");
      const data = await resp.json();
      const loadedVerticals = data.verticals.map(v => ({
        ...v,
        weight: 'High'
      }));
      setVerticals(loadedVerticals);
      addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
      setOnlyCardExpanded(2);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsModularizing(false);
    }
  };

  // --- STEP 2 HANDLERS ---
  const handleCompileRubric = async () => {
    setIsCompilingRubric(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/rubric/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verticals })
      });
      if (!resp.ok) throw new Error("Failed to compile rubric.");
      const data = await resp.json();
      setCompiledRubric(data.compiled_prompt);
      setOnlyCardExpanded(3);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCompilingRubric(false);
    }
  };

  // --- STEP 3 HANDLERS ---
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
    setMappings([]);
    setEvaluations([]);
    setEvaluationLogs([]);
    setVerdict('');
    setVerdictSummary('');

    try {
      const activeJdId = selectedJdId || 'jd_custom';
      const url = `${API_BASE_URL}/api/resumes/cache?candidate_name=${encodeURIComponent(resumeName)}&jd_id=${encodeURIComponent(activeJdId)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setUploadedFileName(data.filename);
        setResumeText(data.resume_text);
        setCandidateName(data.candidate_name);
        if (data.mappings && data.mappings.length > 0) {
          setMappings(data.mappings);
        }
      }
    } catch (err) {
      console.error("Error retrieving cached resume:", err);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedResumeName('');
    setUploadedFileName(file.name);
    setMappings([]);
    setEvaluations([]);
    setEvaluationLogs([]);
    setVerdict('');
    setVerdictSummary('');

    const baseName = file.name.split('.')[0];
    const cleanName = baseName.replace(/_|-/g, ' ').replace(/\d+/g, '').trim();
    setCandidateName(cleanName || baseName);
    setIsParsingFile(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/resume/parse`, {
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

  const handleContextMapping = async () => {
    if (!resumeText) return;
    setIsMappingChunks(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/resume/map`, {
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
    } catch (err) {
      alert(err.message);
    } finally {
      setIsMappingChunks(false);
    }
  };

  const handleNextToStep5 = () => {
    if (!candidateName.trim()) {
      alert("Please confirm the Candidate Full Name before proceeding.");
      return;
    }
    // Save to cache
    fetch(`${API_BASE_URL}/api/resumes/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: candidateName.trim(),
        filename: uploadedFileName,
        resume_text: resumeText,
        jd_id: selectedJdId || 'jd_custom',
        mappings: mappings
      })
    }).then(() => fetchSavedResumes()).catch(e => console.error(e));

    setOnlyCardExpanded(4);
  };

  const handleClearResumes = async () => {
    if (!window.confirm("Are you sure you want to clear the resume archive cache?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/resumes/clear`, { method: 'POST' });
      if (resp.ok) {
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
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  // --- STEP 4 HANDLERS ---
  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setEvaluations([]);
    setEvaluationLogs([
      "SYS_LOG: Launching Batch Evaluation Agent Orchestrator...",
      "SYS_LOG: Compiling mapped evidence across all active competency dimensions...",
      "SYS_LOG: Querying Gemini model via forced tool-calling schema..."
    ]);

    const activeVerticals = verticals.filter(v => v.weight?.toLowerCase() !== "ignore");

    try {
      const resp = await fetch(`${API_BASE_URL}/api/agent/evaluate_batch`, {
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

      const logLines = data.evaluations.map(e =>
        `  -> EVALUATED [${e.vertical_name}] - SCORE: ${e.score}/10`
      );

      setEvaluationLogs(prev => [
        ...prev,
        ...logLines,
        "SYS_LOG: Batch evaluation completed successfully."
      ]);

      // Automatically expand scorecard
      setOnlyCardExpanded(5);
    } catch (err) {
      setEvaluationLogs(prev => [
        ...prev,
        `SYS_LOG: Orchestration failure: ${err.message}`
      ]);
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

  // --- STEP 5 & 6 HANDLERS ---
  const toggleTab = (name) => {
    setExpandedTabs(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleSynthesizeVerdict = async () => {
    setIsSynthesizing(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/agent/synthesize`, {
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
      setOnlyCardExpanded(6);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSaveCandidate = async () => {
    if (!candidateName.trim()) {
      alert("Candidate Name is required.");
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/api/candidates`, {
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
      if (!resp.ok) throw new Error("Failed to save candidate.");
      alert(`Candidate [${candidateName.toUpperCase()}] saved to Leaderboard!`);
      fetchCandidateRegistry();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/candidates/${id}`, { method: 'DELETE' });
      if (resp.ok) fetchCandidateRegistry();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  // AI Resume Optimization
  const handleOptimizeResume = async () => {
    if (!resumeText || evaluations.length === 0) {
      alert("Missing resume text or evaluation data.");
      return;
    }
    setIsOptimizingResume(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/resume/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateName || "Candidate",
          resume_text: resumeText,
          jd_text: jdText,
          jd_title: jdTitle || "Target Position",
          evaluations: evaluations,
          config: apiConfig
        })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || "Failed to optimize resume");
      }
      const data = await resp.json();
      if (data.tokens) {
        addTokens(data.tokens.input_tokens, data.tokens.output_tokens);
      }
      setAlignedResumeText(data.aligned_resume);
      setAlignedHighlights(data.optimization_highlights || []);
      setIsAlignedModalOpen(true);
    } catch (e) {
      alert(`Optimization failed: ${e.message}`);
    } finally {
      setIsOptimizingResume(false);
    }
  };

  const handleReScreenAlignedResume = () => {
    if (!alignedResumeText) return;
    const baseCandName = candidateName ? candidateName.replace(/\s*\(AI Aligned\)/gi, '') : "Candidate";
    const alignedName = `${baseCandName} (AI Aligned)`;
    const alignedFileName = `${(uploadedFileName || 'resume').replace(/\.[^/.]+$/, '').replace(/_aligned$/i, '')}_aligned.txt`;

    setResumeText(alignedResumeText);
    setCandidateName(alignedName);
    setUploadedFileName(alignedFileName);

    fetch(`${API_BASE_URL}/api/resumes/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: alignedName,
        filename: alignedFileName,
        resume_text: alignedResumeText
      })
    }).then(() => fetchSavedResumes()).catch(err => console.error(err));

    setMappings([]);
    setEvaluations([]);
    setEvaluationLogs([]);
    setVerdict('');
    setVerdictSummary('');
    setIsAlignedModalOpen(false);
    setOnlyCardExpanded(3);
  };

  const handleCopyAlignedResume = () => {
    if (!alignedResumeText) return;
    navigator.clipboard.writeText(alignedResumeText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleDownloadAlignedResume = (format = 'md') => {
    if (!alignedResumeText) return;
    const cleanName = (candidateName || 'candidate').replace(/\s+/g, '_').toLowerCase();
    const filename = `${cleanName}_aligned_resume.${format}`;
    const blob = new Blob([alignedResumeText], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleScreenNewCandidate = () => {
    setUploadedFileName('');
    setResumeText('');
    setCandidateName('');
    setMappings([]);
    setEvaluations([]);
    setEvaluationLogs([]);
    setVerdict('');
    setVerdictSummary('');
    setSelectedResumeName('');
    setOnlyCardExpanded(3);
  };

  const handleReset = () => {
    if (window.confirm("Start fresh? This will reset all screening state.")) {
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
      setOnlyCardExpanded(1);
    }
  };

  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  const calculateCost = () => {
    const isPro = apiConfig.model?.includes('pro');
    const inputRate = isPro ? 1.25 : 0.075;
    const outputRate = isPro ? 5.00 : 0.30;
    const inputCost = (sessionTelemetry.input_tokens / 1000000) * inputRate;
    const outputCost = (sessionTelemetry.output_tokens / 1000000) * outputRate;
    return (inputCost + outputCost).toFixed(4);
  };
  const totalTokens = sessionTelemetry.input_tokens + sessionTelemetry.output_tokens;

  return (
    <div className="modern-app-root">
      {/* 1. Extreme Left Vertical Navigation Rail */}
      <nav className="app-left-rail">
        <div 
          className="rail-top-brand"
          onClick={() => {
            setIsRegistryOpen(false);
            setActiveMainView('landing');
          }}
          title="Candidate Screener AI - Home"
        >
          <div className="brand-logo-glow">
            <Cpu size={20} className="brand-icon" />
          </div>
        </div>

        <div className="rail-nav-group">
          <button
            className={`rail-nav-btn ${activeMainView === 'landing' && !isRegistryOpen ? 'active' : ''}`}
            onClick={() => {
              setIsRegistryOpen(false);
              setActiveMainView('landing');
            }}
            title="Overview & Key Features"
          >
            <Home size={18} />
            <span className="rail-btn-label">Home</span>
          </button>

          <button
            className={`rail-nav-btn ${activeMainView === 'chat' && !isRegistryOpen ? 'active' : ''}`}
            onClick={() => {
              setIsRegistryOpen(false);
              setActiveMainView('chat');
            }}
            title="Agent Chat Screener"
          >
            <Sparkles size={18} className="neon-cyan" />
            <span className="rail-btn-label">Chat</span>
          </button>

          <button
            className={`rail-nav-btn ${activeMainView === 'screener' && !isRegistryOpen ? 'active' : ''}`}
            onClick={() => {
              setIsRegistryOpen(false);
              setActiveMainView('screener');
            }}
            title="Interactive Pipeline"
          >
            <Layers size={18} />
            <span className="rail-btn-label">Pipeline</span>
          </button>

          <button
            className={`rail-nav-btn ${activeMainView === 'rag' && !isRegistryOpen ? 'active' : ''}`}
            onClick={() => {
              setIsRegistryOpen(false);
              setActiveMainView('rag');
            }}
            title="ADK RAG Workbench"
          >
            <Bot size={18} />
            <span className="rail-btn-label">RAG</span>
          </button>

          <button
            className={`rail-nav-btn ${isRegistryOpen ? 'active' : ''}`}
            onClick={() => setIsRegistryOpen(!isRegistryOpen)}
            title="Candidate Leaderboard"
          >
            <FileText size={18} />
            <span className="rail-btn-label">Registry</span>
          </button>
        </div>

        <div className="rail-bottom-status" title={`Engine: ${apiConfig.model || 'gemini-2.5-flash'}`}>
          <span className="status-dot"></span>
        </div>
      </nav>

      {/* 2. Main Content Area */}
      <main className="modern-main-layout full-width-workspace">
        {activeMainView === 'landing' ? (
          <LandingPage
            setActiveMainView={setActiveMainView}
            setIsRegistryOpen={setIsRegistryOpen}
            onOpenSettings={() => setIsSettingsOpen(true)}
            apiConfig={apiConfig}
            sessionTelemetry={sessionTelemetry}
          />
        ) : activeMainView === 'rag' ? (
          <RAGWorkbench apiConfig={apiConfig} />
        ) : activeMainView === 'chat' ? (
          <MinimalChatScreener
            apiConfig={apiConfig}
            savedJds={savedJds}
            savedResumes={savedResumes}
            onOpenAlignedModal={(res) => {
              setResumeText(res.resume_text || resumeText);
              setCandidateName(res.candidate_name);
              setJdText(res.jd_text || jdText);
              setJdTitle(res.jd_title || jdTitle);
              setEvaluations(res.evaluations || []);
              handleOptimizeResume();
            }}
            fetchCandidateRegistry={fetchCandidateRegistry}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isLightTheme={isLightTheme}
            setIsLightTheme={setIsLightTheme}
            onReset={handleReset}
          />
        ) : (
          <div className="workspace-graph-layout">
            {/* Top Interactive Graph Stepper */}
            <WorkflowGraphStepper
              activeStep={activeStep}
              setOnlyCardExpanded={setOnlyCardExpanded}
              viewMode={viewMode}
              setViewMode={setViewMode}
              verticals={verticals}
              compiledRubric={compiledRubric}
              mappings={mappings}
              evaluations={evaluations}
              verdict={verdict}
            />

            {/* Main Squared Cards Workspace */}
            <div className={`squared-cards-workspace ${viewMode}`}>
              {/* CARD 1: JD INGEST */}
              {(viewMode === 'stack' || activeStep === 1) && (
                <JDCard
                  isExpanded={viewMode === 'drawer' || expandedCards[1]}
                  onToggleExpand={() => toggleCardExpand(1)}
                  isCompleted={verticals.length > 0}
                  savedJds={savedJds}
                  selectedJdId={selectedJdId}
                  handleSelectSavedJd={handleSelectSavedJd}
                  jdTitle={jdTitle}
                  setJdTitle={setJdTitle}
                  jdText={jdText}
                  setJdText={setJdText}
                  verticals={verticals}
                  handleSaveJd={handleSaveJd}
                  handleDeleteJd={handleDeleteJd}
                  handleClearJds={handleClearJds}
                  handleNextFromStep1={handleNextFromStep1}
                  isModularizing={isModularizing}
                  API_BASE_URL={API_BASE_URL}
                />
              )}

              {/* CARD 2: COMPETENCIES & RUBRIC */}
              {(viewMode === 'stack' || activeStep === 2) && (
                <CompetencyCard
                  isExpanded={viewMode === 'drawer' || expandedCards[2]}
                  onToggleExpand={() => toggleCardExpand(2)}
                  isCompleted={compiledRubric.length > 0}
                  isLocked={verticals.length === 0}
                  verticals={verticals}
                  setVerticals={setVerticals}
                  compiledRubric={compiledRubric}
                  setCompiledRubric={setCompiledRubric}
                  handleCompileRubric={handleCompileRubric}
                  isCompilingRubric={isCompilingRubric}
                  onBack={() => setOnlyCardExpanded(1)}
                />
              )}

              {/* CARD 3: RESUME & MAPPING */}
              {(viewMode === 'stack' || activeStep === 3) && (
                <ResumeIngestCard
                  isExpanded={viewMode === 'drawer' || expandedCards[3]}
                  onToggleExpand={() => toggleCardExpand(3)}
                  isCompleted={mappings.length > 0}
                  isLocked={verticals.length === 0}
                  savedResumes={savedResumes}
                  selectedResumeName={selectedResumeName}
                  handleSelectSavedResume={handleSelectSavedResume}
                  candidateName={candidateName}
                  setCandidateName={setCandidateName}
                  uploadedFileName={uploadedFileName}
                  resumeText={resumeText}
                  setResumeText={setResumeText}
                  handleResumeUpload={handleResumeUpload}
                  isParsingFile={isParsingFile}
                  mappings={mappings}
                  handleContextMapping={handleContextMapping}
                  isMappingChunks={isMappingChunks}
                  handleNextToStep5={handleNextToStep5}
                  handleClearResumes={handleClearResumes}
                  onBack={() => setOnlyCardExpanded(2)}
                />
              )}

              {/* CARD 4: AGENT EVALUATION */}
              {(viewMode === 'stack' || activeStep === 4) && (
                <EvaluationCard
                  isExpanded={viewMode === 'drawer' || expandedCards[4]}
                  onToggleExpand={() => toggleCardExpand(4)}
                  isCompleted={evaluations.length > 0}
                  isLocked={mappings.length === 0}
                  isEvaluating={isEvaluating}
                  evaluationLogs={evaluationLogs}
                  evaluations={evaluations}
                  activeEvalVertical={activeEvalVertical}
                  handleRunEvaluation={handleRunEvaluation}
                  onNext={() => setOnlyCardExpanded(5)}
                  onBack={() => setOnlyCardExpanded(3)}
                />
              )}

              {/* CARD 5: DIMENSIONAL SCORECARD */}
              {(viewMode === 'stack' || activeStep === 5) && (
                <ScorecardStack
                  isExpanded={viewMode === 'drawer' || expandedCards[5]}
                  onToggleExpand={() => toggleCardExpand(5)}
                  isCompleted={verdict.length > 0}
                  isLocked={evaluations.length === 0}
                  evaluations={evaluations}
                  verticals={verticals}
                  expandedTabs={expandedTabs}
                  toggleTab={toggleTab}
                  handleSynthesizeVerdict={handleSynthesizeVerdict}
                  isSynthesizing={isSynthesizing}
                  onBack={() => setOnlyCardExpanded(4)}
                />
              )}

              {/* CARD 6: FINAL VERDICT */}
              {(viewMode === 'stack' || activeStep === 6) && (
                <VerdictCard
                  isExpanded={viewMode === 'drawer' || expandedCards[6]}
                  onToggleExpand={() => toggleCardExpand(6)}
                  isCompleted={verdict.length > 0}
                  isLocked={!verdict}
                  verdict={verdict}
                  verdictSummary={verdictSummary}
                  candidateName={candidateName}
                  setCandidateName={setCandidateName}
                  handleSaveCandidate={handleSaveCandidate}
                  handleOptimizeResume={handleOptimizeResume}
                  isOptimizingResume={isOptimizingResume}
                  resumeText={resumeText}
                  evaluations={evaluations}
                  onScreenNewCandidate={handleScreenNewCandidate}
                  onStartOver={handleReset}
                  onBack={() => setOnlyCardExpanded(5)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Extreme Right Vertical Action Rail */}
      <aside className="app-right-rail">
        {/* Token / Cost Telemetry Pill */}
        <div className="rail-telemetry-container">
          <button 
            className="rail-icon-btn telemetry"
            onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
            title={`Telemetry: ${totalTokens.toLocaleString()} tokens ($${calculateCost()})`}
          >
            <Coins size={18} className="neon-cyan" />
          </button>

          {showTelemetryDetails && (
            <div className="telemetry-popover-rail">
              <div className="telemetry-popover-title">Telemetry & Cost</div>
              <div className="telemetry-stat-row">
                <span>Tokens:</span>
                <span className="val-cyan">{totalTokens.toLocaleString()}</span>
              </div>
              <div className="telemetry-stat-row">
                <span>Input:</span>
                <span className="val-cyan">{sessionTelemetry.input_tokens.toLocaleString()}</span>
              </div>
              <div className="telemetry-stat-row">
                <span>Output:</span>
                <span className="val-green">{sessionTelemetry.output_tokens.toLocaleString()}</span>
              </div>
              <div className="telemetry-stat-row total-cost">
                <span>Est. Cost:</span>
                <span className="val-amber">${calculateCost()}</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="rail-icon-btn"
          title="API & Model Settings"
        >
          <Settings size={18} />
        </button>

        <button
          onClick={() => setIsLightTheme(!isLightTheme)}
          className="rail-icon-btn"
          title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {isLightTheme ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          onClick={handleReset}
          className="rail-icon-btn"
          title="Reset Assessment Pipeline"
        >
          <RotateCcw size={18} />
        </button>
      </aside>

      {/* Floating Sticky Bottom-Right AI Copilot & Telemetry Widget */}
      <StickyCopilotWidget
        activeStep={activeStep}
        stepContext={stepContexts[activeStep] || {}}
        apiConfig={apiConfig}
        sessionTelemetry={sessionTelemetry}
        phaseTelemetry={phaseTelemetry[activeStep]}
        onTokensSpent={(inp, out) => addTokens(inp, out)}
      />

      {/* Slide-out Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiConfig={apiConfig}
        setApiConfig={setApiConfig}
        availableModels={availableModels}
        handleTestConfig={handleTestConfig}
        isTestingConfig={isTestingConfig}
        configSuccess={configSuccess}
        configMessage={configMessage}
      />

      {/* Candidate Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        candidateRegistry={candidateRegistry}
        savedJds={savedJds}
        handleDeleteCandidate={handleDeleteCandidate}
        fetchCandidateRegistry={fetchCandidateRegistry}
      />

      {/* AI Resume Optimization Preview Modal */}
      <AlignedResumeModal
        isOpen={isAlignedModalOpen}
        onClose={() => setIsAlignedModalOpen(false)}
        candidateName={candidateName}
        alignedResumeText={alignedResumeText}
        alignedHighlights={alignedHighlights}
        handleCopyAlignedResume={handleCopyAlignedResume}
        handleDownloadAlignedResume={handleDownloadAlignedResume}
        handleReScreenAlignedResume={handleReScreenAlignedResume}
        copySuccess={copySuccess}
      />
    </div>
  );
}
