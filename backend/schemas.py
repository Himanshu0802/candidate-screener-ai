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


