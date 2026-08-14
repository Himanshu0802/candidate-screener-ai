from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class APIKeyConfig(BaseModel):
    api_key: str = Field(..., description="Google Gemini or Vertex API Key")
    use_vertex: bool = Field(default=False, description="Whether to use Google Cloud Vertex AI")
    project_id: Optional[str] = Field(default=None, description="GCP Project ID for Vertex AI")
    location: Optional[str] = Field(default="us-central1", description="GCP Region for Vertex AI")
    model: Optional[str] = Field(default="gemini-2.5-flash", description="Model selected by user")

class TokenTelemetry(BaseModel):
    input_tokens: int = Field(default=0, description="Tokens consumed in request input")
    output_tokens: int = Field(default=0, description="Tokens generated in response")

class TestConfigRequest(BaseModel):
    config: APIKeyConfig

class TestConfigResponse(BaseModel):
    success: bool
    message: str
    tokens: TokenTelemetry

# Step 2: Modularize
class JDModularizeRequest(BaseModel):
    jd_text: str
    config: APIKeyConfig

class Vertical(BaseModel):
    name: str = Field(..., description="Name of the evaluation vertical (e.g., Architecture)")
    description: str = Field(..., description="Details and focus areas of this vertical")

class JDModularizeResponse(BaseModel):
    verticals: List[Vertical]
    tokens: TokenTelemetry

# Step 3: Rubric
class VerticalWeight(BaseModel):
    name: str
    description: str
    weight: str = Field(..., description="High, Medium, Low, or Ignore")

class RubricCompileRequest(BaseModel):
    verticals: List[VerticalWeight]

class RubricCompileResponse(BaseModel):
    compiled_prompt: str

# Step 4: Resume Parsing & Mapping
class ResumeMapRequest(BaseModel):
    resume_text: str
    verticals: List[VerticalWeight]
    config: APIKeyConfig

class MappedChunk(BaseModel):
    vertical_name: str
    chunk_text: str = Field(..., description="Relevant section/s of the resume for this vertical. If none, write 'No evidence provided'.")

class ResumeMapResponse(BaseModel):
    mappings: List[MappedChunk]
    tokens: TokenTelemetry

# Step 5: Agent Execution
class AgentEvaluateRequest(BaseModel):
    vertical_name: str
    vertical_description: str
    vertical_weight: str
    resume_chunk: str
    system_prompt: str
    config: APIKeyConfig

class AgentEvaluateResponse(BaseModel):
    vertical_name: str
    score: int = Field(..., description="Numerical score from 0 to 10")
    weight: str = Field(..., description="Priority weight (High, Medium, Low)")
    rationale: str = Field(..., description="Detailed explanation of the rating")
    green_points: List[str] = Field(default=[], description="Bullet points of candidate strengths")
    miss_points: List[str] = Field(default=[], description="Bullet points of gaps or lacking skills")
    tokens: TokenTelemetry

# Step 7: Final Conclusion
class EvaluationResult(BaseModel):
    vertical_name: str
    score: int
    weight: str
    rationale: str
    green_points: List[str]
    miss_points: List[str]

class VerdictRequest(BaseModel):
    evaluations: List[EvaluationResult]
    config: APIKeyConfig

class VerdictResponse(BaseModel):
    verdict: str = Field(..., description="FIT or MISS")
    summary: str = Field(..., description="A 2-sentence executive summary verdict")
    tokens: TokenTelemetry

# Post-Analysis AI Resume Aligner
class ResumeOptimizeRequest(BaseModel):
    candidate_name: Optional[str] = Field(default="", description="Name of the candidate")
    resume_text: str = Field(..., description="Original raw resume text")
    jd_text: str = Field(..., description="Target Job Description text")
    jd_title: Optional[str] = Field(default="Target Role", description="Target job title")
    evaluations: List[EvaluationResult] = Field(default=[], description="Sectional evaluation scores and miss points")
    config: APIKeyConfig

class ResumeOptimizeResponse(BaseModel):
    aligned_resume: str = Field(..., description="Full upgraded and JD-aligned candidate resume in Markdown format")
    optimization_highlights: List[str] = Field(default=[], description="Bullet points of key improvements made to bridge identified gaps")
    tokens: TokenTelemetry


# Chat Agent
class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to the AI helper")
    history: List[Dict[str, str]] = Field(default=[], description="Chat history as list of {'role': 'user'|'model', 'text': str}")
    step_id: int = Field(..., description="Active step number (1 to 7)")
    step_context: Dict = Field(default={}, description="Current state data relevant to the active step")
    config: APIKeyConfig

class ChatResponse(BaseModel):
    reply: str
    tokens: TokenTelemetry

# Library Persistence Schemas
class JDSaveRequest(BaseModel):
    id: Optional[str] = None
    title: str
    jd_text: str
    verticals: List[VerticalWeight]

class JDLibraryItem(BaseModel):
    id: str
    title: str
    jd_text: str
    verticals: List[VerticalWeight]

class CandidateSaveRequest(BaseModel):
    name: str
    jd_id: str
    jd_title: str
    score: float
    verdict: str
    summary: str
    evaluations: List[EvaluationResult]

class CandidateRegistryItem(BaseModel):
    id: str
    name: str
    jd_id: str
    jd_title: str
    score: float
    verdict: str
    summary: str
    evaluations: List[EvaluationResult]
    date: str

class ResumeCacheItem(BaseModel):
    candidate_name: str
    filename: str

class ResumeCacheSaveRequest(BaseModel):
    candidate_name: str
    filename: str
    resume_text: str
    jd_id: str
    mappings: List[MappedChunk]

class ResumeCacheGetResponse(BaseModel):
    candidate_name: str
    filename: str
    resume_text: str
    mappings: Optional[List[MappedChunk]] = None

class BatchEvaluationRequest(BaseModel):
    verticals: List[VerticalWeight]
    mappings: List[MappedChunk]
    system_prompt: str
    config: APIKeyConfig

class BatchEvaluationResponse(BaseModel):
    evaluations: List[AgentEvaluateResponse]
    tokens: TokenTelemetry

# RAG Conversational ADK Chat Schemas
class RAGChatMessage(BaseModel):
    id: str
    role: str # "user" or "assistant"
    content: str
    timestamp: str
    agent_logs: Optional[List[str]] = Field(default=[], description="Agent Execution Logs")
    retrieved_chunks: Optional[List[Dict]] = Field(default=[], description="Retrieved RAG Chunks")
    evaluations: Optional[Dict] = Field(default={}, description="RAGAS + Code Evaluation metrics")
    search_strategy: Optional[str] = Field(default="HNSW")
    tokens: Optional[TokenTelemetry] = Field(default=None, description="Input/Output token counts for turn")
    cost_usd: Optional[float] = Field(default=0.0, description="Estimated turn cost in USD based on model pricing")

class RAGChatSession(BaseModel):
    session_id: str
    created_at: str
    messages: List[RAGChatMessage] = Field(default=[])
    memory_summary: str = Field(default="Empty session memory.")
    search_strategy: str = Field(default="HNSW")
    top_k: int = Field(default=4)
    doc_filter: Optional[str] = Field(default=None, description="Active artifact filter")
    enable_agentic_flow: bool = Field(default=True)
    enable_evaluations: bool = Field(default=True)

class RAGChatRequest(BaseModel):
    session_id: Optional[str] = Field(default=None, description="Active session ID or empty to create new")
    message: str = Field(..., description="User message to the RAG Agent")
    search_strategy: str = Field(default="HNSW")
    top_k: int = Field(default=4)
    doc_filter: Optional[str] = Field(default=None, description="Optional document/artifact name filter")
    enable_agentic_flow: bool = Field(default=True)
    enable_evaluations: bool = Field(default=True)
    config: Optional[APIKeyConfig] = None

class RAGChatResponse(BaseModel):
    session_id: str
    message: RAGChatMessage
    memory_summary: str
    evaluations: Dict

class ModelListRequest(BaseModel):
    config: APIKeyConfig

class ModelListResponse(BaseModel):
    success: bool
    models: List[Dict[str, str]]
    message: str

class AutonomousScreenRequest(BaseModel):
    jd_text: str = Field(..., description="Job description text")
    jd_title: Optional[str] = Field(default="Target Position", description="Position title")
    candidate_name: Optional[str] = Field(default="Candidate", description="Full name of candidate")
    resume_text: str = Field(..., description="Resume text to evaluate")
    config: APIKeyConfig

class AutonomousScreenResponse(BaseModel):
    jd_title: str
    candidate_name: str
    verticals: List[VerticalWeight]
    mappings: List[MappedChunk]
    evaluations: List[EvaluationResult]
    verdict: str
    summary: str
    tokens: TokenTelemetry
    steps_log: List[str]
