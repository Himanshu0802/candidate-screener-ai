import os
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    APIKeyConfig,
    TestConfigRequest,
    TestConfigResponse,
    JDModularizeRequest,
    JDModularizeResponse,
    Vertical,
    RubricCompileRequest,
    RubricCompileResponse,
    ResumeMapRequest,
    ResumeMapResponse,
    MappedChunk,
    AgentEvaluateRequest,
    AgentEvaluateResponse,
    VerdictRequest,
    VerdictResponse,
    ChatRequest,
    ChatResponse,
    TokenTelemetry,
    JDSaveRequest,
    JDLibraryItem,
    CandidateSaveRequest,
    CandidateRegistryItem,
    ResumeCacheItem,
    ResumeCacheSaveRequest,
    ResumeCacheGetResponse,
    BatchEvaluationRequest,
    BatchEvaluationResponse
)
import services.llm as llm_service
import services.parser as parser_service
from pydantic import BaseModel

logger = logging.getLogger("screener_main")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Retro Candidate Screener API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this. For development, allow all.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM Models definitions for response schema mapping
class LLMVertical(BaseModel):
    name: str
    description: str

class LLMVerticalsResponse(BaseModel):
    verticals: List[LLMVertical]

class LLMMapping(BaseModel):
    vertical_name: str
    chunk_text: str

class LLMResumeMapResponse(BaseModel):
    mappings: List[LLMMapping]

class LLMEvaluationResponse(BaseModel):
    score: int
    rationale: str
    green_points: List[str]
    miss_points: List[str]

class LLMVerdictResponse(BaseModel):
    verdict: str
    summary: str

class LLMSingleEvaluation(BaseModel):
    vertical_name: str
    score: int
    rationale: str
    green_points: List[str]
    miss_points: List[str]

class LLMBatchEvaluationResponse(BaseModel):
    evaluations: List[LLMSingleEvaluation]


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/config/test", response_model=TestConfigResponse)
async def test_config(req: TestConfigRequest):
    try:
        # Simple test call
        prompt = "Hello! Output exactly 'Success' if you read this."
        resp, telemetry = llm_service.call_llm_text(
            config=req.config,
            prompt=prompt
        )
        if "success" in resp.lower() or resp.strip():
            return TestConfigResponse(
                success=True,
                message="API connection validated successfully.",
                tokens=telemetry
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid API Key or connection failed.")
    except Exception as e:
        logger.error(f"Config verification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/jd/modularize", response_model=JDModularizeResponse)
async def modularize_jd(req: JDModularizeRequest):
    try:
        sanitized_jd = parser_service.sanitize_text(req.jd_text)
        prompt = (
            f"You are an expert HR recruiter. Analyze the following Job Description (JD) and extract between 3 to 6 core evaluation verticals "
            f"(such as Technical Expertise, System Architecture, Governance, Execution, Soft Skills). "
            f"For each vertical, provide a clear Name and a brief Description. "
            f"Job Description:\n\n{sanitized_jd}"
        )
        
        parsed_res, telemetry = llm_service.call_llm_structured(
            config=req.config,
            prompt=prompt,
            response_schema=LLMVerticalsResponse,
            system_instruction="You extract core evaluation verticals from Job Descriptions."
        )
        
        verticals = [
            Vertical(name=v.name, description=v.description)
            for v in parsed_res.verticals
        ]
        
        return JDModularizeResponse(verticals=verticals, tokens=telemetry)
    except Exception as e:
        logger.error(f"JD modularization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rubric/compile", response_model=RubricCompileResponse)
async def compile_rubric(req: RubricCompileRequest):
    try:
        active_verticals = [v for v in req.verticals if v.weight.lower() != "ignore"]
        
        prompt_parts = [
            "SYSTEM INSTRUCTION:",
            "You are an expert resume evaluation agent.",
            "Evaluate the candidate's experience against the specified job requirements for the active vertical.",
            "You must follow these instructions strictly:",
            "",
            "SCORING CRITERIA (0 - 10):",
            "- 0: No evidence provided / Completely missing.",
            "- 1-3: Critical gaps, highly insufficient experience or skills.",
            "- 4-6: Foundational experience, but lacks depth or specific advanced skills.",
            "- 7-8: Strong evidence, covers all primary requirements of this vertical.",
            "- 9-10: Exceptional match, exceeds requirements with advanced proof or achievements.",
            "",
            "WEIGHTING STANDARDS:",
            "- High Weight: Apply extremely strict standards. Deduced claims must have solid project evidence.",
            "- Medium Weight: Apply balanced standards. Good experience with clear mention is required.",
            "- Low Weight: Apply flexible standards. Basic keywords or general experience is acceptable.",
            "",
            "EDGE CASE RULE:",
            "- If the candidate resume chunk is empty or completely lacks information for a vertical, you MUST score it 0 and output 'No evidence provided' in the rationale. Do not guess or assume.",
            "",
            "ACTIVE VERTICALS & EXPECTATIONS:"
        ]
        
        for v in active_verticals:
            prompt_parts.append(f"- Vertical: '{v.name}' (Priority Weight: {v.weight})")
            prompt_parts.append(f"  Description: {v.description}")
            prompt_parts.append("")
            
        compiled_prompt = "\n".join(prompt_parts)
        return RubricCompileResponse(compiled_prompt=compiled_prompt)
    except Exception as e:
        logger.error(f"Rubric compilation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resume/parse")
async def parse_resume(file: UploadFile = File(...)):
    filename = file.filename or "resume"
    ext = os.path.splitext(filename)[1].lower()
    
    try:
        file_bytes = await file.read()
        if ext == ".pdf":
            raw_text = parser_service.extract_text_from_pdf(file_bytes)
        elif ext in [".docx", ".doc"]:
            raw_text = parser_service.extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or DOCX.")
            
        sanitized = parser_service.sanitize_text(raw_text)
        return {"filename": filename, "raw_text": sanitized}
    except Exception as e:
        logger.error(f"File parsing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resume/map", response_model=ResumeMapResponse)
async def map_resume(req: ResumeMapRequest):
    try:
        active_verticals = [v for v in req.verticals if v.weight.lower() != "ignore"]
        verticals_list_str = "\n".join([
            f"- {v.name}: {v.description}" for v in active_verticals
        ])
        
        prompt = (
            f"You are given a candidate's resume and a list of evaluation verticals. "
            f"Analyze the resume and extract the specific text sections, sentences, or paragraphs "
            f"that serve as evidence for each vertical. "
            f"Do not paraphrase significantly or summarize the text, try to extract the original statements. "
            f"If there is absolutely no evidence or relevant text for a vertical, you MUST write "
            f"'No evidence provided' for that chunk_text.\n\n"
            f"Evaluation Verticals:\n{verticals_list_str}\n\n"
            f"Candidate Resume Text:\n{req.resume_text}"
        )
        
        parsed_res, telemetry = llm_service.call_llm_structured(
            config=req.config,
            prompt=prompt,
            response_schema=LLMResumeMapResponse,
            system_instruction="You map sections of resumes directly to job evaluation verticals."
        )
        
        # Group mappings by vertical_name to prevent duplicates
        grouped = {}
        for m in parsed_res.mappings:
            grouped.setdefault(m.vertical_name, []).append(m.chunk_text)
            
        mappings = []
        for vname, chunks in grouped.items():
            # Join multiple snippets with a bullet point
            combined_text = "\n".join([f"• {c}" for c in chunks]) if len(chunks) > 1 else chunks[0]
            mappings.append(MappedChunk(vertical_name=vname, chunk_text=combined_text))
        
        # Ensure any missing active verticals are filled with "No evidence provided"
        mapped_names = {m.vertical_name for m in mappings}
        for v in active_verticals:
            if v.name not in mapped_names:
                mappings.append(MappedChunk(vertical_name=v.name, chunk_text="No evidence provided"))
                
        return ResumeMapResponse(mappings=mappings, tokens=telemetry)
    except Exception as e:
        logger.error(f"Resume mapping failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/evaluate", response_model=AgentEvaluateResponse)
async def evaluate_agent(req: AgentEvaluateRequest):
    try:
        prompt = (
            f"Evaluate the candidate's performance for the vertical '{req.vertical_name}' based on the provided resume chunk.\n\n"
            f"Vertical Focus: {req.vertical_description}\n"
            f"Vertical Weight: {req.vertical_weight}\n\n"
            f"Resume Chunk to Evaluate:\n{req.resume_chunk}"
        )
        
        # We run this structured query with the compiled rubric as the system instruction
        parsed_res, telemetry = llm_service.call_llm_structured(
            config=req.config,
            prompt=prompt,
            response_schema=LLMEvaluationResponse,
            system_instruction=req.system_prompt
        )
        
        return AgentEvaluateResponse(
            vertical_name=req.vertical_name,
            score=parsed_res.score,
            weight=req.vertical_weight,
            rationale=parsed_res.rationale,
            green_points=parsed_res.green_points,
            miss_points=parsed_res.miss_points,
            tokens=telemetry
        )
    except Exception as e:
        logger.error(f"Agent evaluation failed for vertical {req.vertical_name}: {e}")
        # Return a safe fallback evaluation in case the LLM call fails
        return AgentEvaluateResponse(
            vertical_name=req.vertical_name,
            score=0,
            weight=req.vertical_weight,
            rationale=f"Evaluation failed due to system error: {str(e)}",
            green_points=[],
            miss_points=["System evaluation error"],
            tokens=TokenTelemetry(input_tokens=0, output_tokens=0)
        )

@app.post("/api/agent/evaluate_batch", response_model=BatchEvaluationResponse)
async def evaluate_agent_batch(req: BatchEvaluationRequest):
    try:
        prompt_lines = [
            "You are an expert HR evaluation agent. Evaluate the candidate across multiple Job Description verticals.",
            "For each vertical, read the vertical name, description, priority weight, and the mapped resume evidence chunk provided below.",
            "Evaluate the evidence and compute a score (0 to 10), detailed rationale, green points (strengths), and miss points (gaps) following the system grading standards.",
            "",
            "VERTICALS TO EVALUATE:"
        ]
        
        for v in req.verticals:
            chunk_text = "No evidence provided"
            for m in req.mappings:
                if m.vertical_name == v.name:
                    chunk_text = m.chunk_text
                    break
            prompt_lines.append(f"- Vertical: '{v.name}' (Weight: {v.weight})")
            prompt_lines.append(f"  Description: {v.description}")
            prompt_lines.append(f"  Resume Evidence: {chunk_text}")
            prompt_lines.append("---")
            
        prompt = "\n".join(prompt_lines)
        
        parsed_res, telemetry = llm_service.call_llm_structured(
            config=req.config,
            prompt=prompt,
            response_schema=LLMBatchEvaluationResponse,
            system_instruction=req.system_prompt
        )
        
        # Build mapping lookup for the results
        result_map = {res.vertical_name: res for res in parsed_res.evaluations}
        evaluations_out = []
        for v in req.verticals:
            if v.name in result_map:
                res = result_map[v.name]
                evaluations_out.append(AgentEvaluateResponse(
                    vertical_name=v.name,
                    score=res.score,
                    weight=v.weight,
                    rationale=res.rationale,
                    green_points=res.green_points,
                    miss_points=res.miss_points,
                    tokens=TokenTelemetry(input_tokens=0, output_tokens=0)
                ))
            else:
                evaluations_out.append(AgentEvaluateResponse(
                    vertical_name=v.name,
                    score=0,
                    weight=v.weight,
                    rationale="No evaluation evidence returned by the model for this vertical.",
                    green_points=[],
                    miss_points=["Evaluation missing from model response"],
                    tokens=TokenTelemetry(input_tokens=0, output_tokens=0)
                ))
                
        return BatchEvaluationResponse(
            evaluations=evaluations_out,
            tokens=telemetry
        )
    except Exception as e:
        logger.error(f"Batch agent evaluation failed: {e}")
        # Return fallback evaluations for all verticals
        evaluations_out = []
        for v in req.verticals:
            evaluations_out.append(AgentEvaluateResponse(
                vertical_name=v.name,
                score=0,
                weight=v.weight,
                rationale=f"Batch evaluation failed due to system error: {str(e)}",
                green_points=[],
                miss_points=["System evaluation error"],
                tokens=TokenTelemetry(input_tokens=0, output_tokens=0)
            ))
        return BatchEvaluationResponse(
            evaluations=evaluations_out,
            tokens=TokenTelemetry(input_tokens=0, output_tokens=0)
        )


@app.post("/api/agent/synthesize", response_model=VerdictResponse)
async def synthesize_verdict(req: VerdictRequest):
    try:
        evaluations_summary = []
        for ev in req.evaluations:
            evaluations_summary.append({
                "vertical": ev.vertical_name,
                "score": ev.score,
                "weight": ev.weight,
                "green_points": ev.green_points[:2],
                "miss_points": ev.miss_points[:2]
            })
            
        # Enforce final verdict programmatically based on weighted average of scores
        # Weight mapping: High = 3, Medium = 2, Low = 1
        weight_values = {"high": 3.0, "medium": 2.0, "low": 1.0}
        total_weighted_score = 0.0
        total_weight = 0.0
        has_critical_fail = False
        
        for ev in req.evaluations:
            w_str = ev.weight.lower()
            w_val = weight_values.get(w_str, 1.0)
            total_weighted_score += ev.score * w_val
            total_weight += w_val
            
            # Critical fail check: if score is <= 3 in a High weight vertical
            if w_str == "high" and ev.score <= 3:
                has_critical_fail = True
                
        weighted_average = total_weighted_score / total_weight if total_weight > 0 else 0.0
        
        if weighted_average >= 6.5 and not has_critical_fail:
            calculated_verdict = "FIT"
        else:
            calculated_verdict = "MISS"
            
        prompt = (
            f"Review the candidate's sectional scores and key points:\n"
            f"{json.dumps(evaluations_summary, indent=2)}\n\n"
            f"We have programmatically determined the screening verdict to be: '{calculated_verdict}' "
            f"(based on a weighted average of {weighted_average:.2f}/10 and critical gap checks).\n"
            f"Generate a brief 2-sentence executive summary explanation of this decision, starting with or clearly stating the verdict as '{calculated_verdict}'."
        )
        
        parsed_res, telemetry = llm_service.call_llm_structured(
            config=req.config,
            prompt=prompt,
            response_schema=LLMVerdictResponse,
            system_instruction="You synthesize a final hiring verdict explanation from evaluation scores."
        )
        
        return VerdictResponse(
            verdict=calculated_verdict,
            summary=parsed_res.summary,
            tokens=telemetry
        )
    except Exception as e:
        logger.error(f"Verdict synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat_helper(req: ChatRequest):
    try:
        # Build systemic prompt for "AI-OPERATOR" helper agent
        system_instruction = (
            f"You are AI-OPERATOR, a retro terminal-styled recruiting assistant.\n"
            f"You are assisting a recruiter who is currently on Step {req.step_id} of a 7-step candidate screening workflow.\n"
            f"Current step details:\n"
            f"- Step ID: {req.step_id}\n"
            f"- Step Context: {json.dumps(req.step_context)}\n\n"
            f"Respond to user queries professionally, helpfully, and matching a retro hacking/terminal vibe "
            f"(use monospaced alignment concepts, computer jargon like 'sysops', 'cache', 'buffer' appropriately, but keep it readable). "
            f"Provide constructive solutions, such as explaining how to improve JDs, how weighting works, what "
            f"the evaluation scores mean, or suggestions on candidate profiles. Keep your replies concise (under 4 short paragraphs)."
        )
        
        # Build conversation prompt including history
        prompt_parts = []
        for msg in req.history:
            role_name = "User" if msg.get("role") == "user" else "AI-OPERATOR"
            prompt_parts.append(f"{role_name}: {msg.get('text')}")
            
        prompt_parts.append(f"User: {req.message}")
        prompt = "\n".join(prompt_parts)
        
        reply, telemetry = llm_service.call_llm_text(
            config=req.config,
            prompt=prompt,
            system_instruction=system_instruction
        )
        
        return ChatResponse(reply=reply, tokens=telemetry)
    except Exception as e:
        logger.error(f"Chat helper failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Database Persistence (Redis with Local File Fallback)
import uuid
import datetime
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")

def get_redis_client():
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1.0)
        r.ping()
        return r
    except Exception as e:
        logger.warning(f"Redis not available: {e}. Falling back to local files.")
        return None

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
JDS_FILE = os.path.join(DATA_DIR, "jds.json")
CANDIDATES_FILE = os.path.join(DATA_DIR, "candidates.json")

def load_jds_file() -> list:
    if not os.path.exists(JDS_FILE):
        return []
    try:
        with open(JDS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading jds file: {e}")
        return []

def save_jds_file(jds: list):
    try:
        with open(JDS_FILE, "w", encoding="utf-8") as f:
            json.dump(jds, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing jds file: {e}")

def load_candidates_file() -> list:
    if not os.path.exists(CANDIDATES_FILE):
        return []
    try:
        with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading candidates file: {e}")
        return []

def save_candidates_file(cands: list):
    try:
        with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
            json.dump(cands, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing candidates file: {e}")

RESUMES_FILE = os.path.join(DATA_DIR, "resumes.json")

def load_resumes_file() -> dict:
    if not os.path.exists(RESUMES_FILE):
        return {}
    try:
        with open(RESUMES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading resumes file: {e}")
        return {}

def save_resumes_file(data: dict):
    try:
        with open(RESUMES_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing resumes file: {e}")


@app.get("/api/jds", response_model=List[JDLibraryItem])
async def get_jds():
    r = get_redis_client()
    if r:
        try:
            keys = r.keys("screener:jd:*")
            items = []
            for k in keys:
                val = r.get(k)
                if val:
                    items.append(json.loads(val))
            return items
        except Exception as e:
            logger.error(f"Redis GET jds error: {e}")
    # Fallback
    return load_jds_file()

@app.post("/api/jds", response_model=JDLibraryItem)
async def save_jd(req: JDSaveRequest):
    jd_id = req.id or f"jd_{int(datetime.datetime.now().timestamp())}"
    item = {
        "id": jd_id,
        "title": req.title,
        "jd_text": req.jd_text,
        "verticals": [v.model_dump() for v in req.verticals]
    }
    
    r = get_redis_client()
    if r:
        try:
            r.set(f"screener:jd:{jd_id}", json.dumps(item))
            r.sadd("screener:jds", jd_id)
            return item
        except Exception as e:
            logger.error(f"Redis POST jd error: {e}")
            
    # Fallback
    jds = load_jds_file()
    # Replace if id exists, else append
    jds = [j for j in jds if j["id"] != jd_id]
    jds.append(item)
    save_jds_file(jds)
    return item

@app.delete("/api/jds/{jd_id}")
async def delete_jd(jd_id: str):
    r = get_redis_client()
    success = False
    if r:
        try:
            r.delete(f"screener:jd:{jd_id}")
            r.srem("screener:jds", jd_id)
            success = True
        except Exception as e:
            logger.error(f"Redis DELETE jd error: {e}")
            
    # Fallback / sync
    jds = load_jds_file()
    initial_len = len(jds)
    jds = [j for j in jds if j["id"] != jd_id]
    if len(jds) < initial_len:
        save_jds_file(jds)
        success = True
        
    if success:
        return {"message": "Job Description successfully deleted."}
    else:
        raise HTTPException(status_code=404, detail="Job Description not found.")

@app.get("/api/candidates", response_model=List[CandidateRegistryItem])
async def get_candidates(jd_id: Optional[str] = None):
    r = get_redis_client()
    items = []
    if r:
        try:
            keys = r.keys("screener:candidate:*")
            for k in keys:
                val = r.get(k)
                if val:
                    items.append(json.loads(val))
        except Exception as e:
            logger.error(f"Redis GET candidates error: {e}")
    else:
        items = load_candidates_file()
        
    if jd_id:
        items = [c for c in items if c["jd_id"] == jd_id]
        
    # Sort candidates by score descending
    items.sort(key=lambda x: x["score"], reverse=True)
    return items

@app.post("/api/candidates", response_model=CandidateRegistryItem)
async def save_candidate(req: CandidateSaveRequest):
    cand_id = f"cand_{int(datetime.datetime.now().timestamp())}"
    date_str = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    item = {
        "id": cand_id,
        "name": req.name,
        "jd_id": req.jd_id,
        "jd_title": req.jd_title,
        "score": req.score,
        "verdict": req.verdict,
        "summary": req.summary,
        "evaluations": [e.model_dump() for e in req.evaluations],
        "date": date_str
    }
    
    r = get_redis_client()
    if r:
        try:
            r.set(f"screener:candidate:{cand_id}", json.dumps(item))
            # Track candidate in sorted set (score used for ranking)
            r.zadd("screener:candidates", {cand_id: req.score})
            return item
        except Exception as e:
            logger.error(f"Redis POST candidate error: {e}")
            
    # Fallback
    cands = load_candidates_file()
    cands.append(item)
    save_candidates_file(cands)
    return item

@app.delete("/api/candidates/{cand_id}")
async def delete_candidate(cand_id: str):
    r = get_redis_client()
    success = False
    if r:
        try:
            r.delete(f"screener:candidate:{cand_id}")
            r.zrem("screener:candidates", cand_id)
            success = True
        except Exception as e:
            logger.error(f"Redis DELETE candidate error: {e}")
            
    # Check fallback / sync fallback
    cands = load_candidates_file()
    initial_len = len(cands)
    cands = [c for c in cands if c["id"] != cand_id]
    if len(cands) < initial_len:
        save_candidates_file(cands)
        success = True
        
    if success:
        return {"message": "Candidate profile successfully deleted."}
    else:
        raise HTTPException(status_code=404, detail="Candidate not found.")

@app.get("/api/resumes", response_model=List[ResumeCacheItem])
async def get_resumes_list():
    r = get_redis_client()
    items = []
    if r:
        try:
            names = r.smembers("screener:resumes")
            for name in names:
                info_json = r.get(f"screener:resume:info:{name}")
                if info_json:
                    info = json.loads(info_json)
                    items.append(ResumeCacheItem(
                        candidate_name=info["candidate_name"],
                        filename=info["filename"]
                    ))
            return items
        except Exception as e:
            logger.error(f"Redis GET resumes list error: {e}")
    # Fallback
    resumes_dict = load_resumes_file()
    for name, info in resumes_dict.items():
        items.append(ResumeCacheItem(
            candidate_name=info["candidate_name"],
            filename=info["filename"]
        ))
    return items

@app.get("/api/resumes/cache", response_model=ResumeCacheGetResponse)
async def get_resume_cache(candidate_name: str, jd_id: str):
    r = get_redis_client()
    if r:
        try:
            info_json = r.get(f"screener:resume:info:{candidate_name}")
            if info_json:
                info = json.loads(info_json)
                mappings_json = r.get(f"screener:resume:mappings:{candidate_name}:{jd_id}")
                mappings = json.loads(mappings_json) if mappings_json else None
                return ResumeCacheGetResponse(
                    candidate_name=info["candidate_name"],
                    filename=info["filename"],
                    resume_text=info["resume_text"],
                    mappings=mappings
                )
        except Exception as e:
            logger.error(f"Redis GET resume cache error: {e}")
            
    # Fallback
    resumes_dict = load_resumes_file()
    if candidate_name in resumes_dict:
        info = resumes_dict[candidate_name]
        mappings = info.get("mappings", {}).get(jd_id)
        return ResumeCacheGetResponse(
            candidate_name=info["candidate_name"],
            filename=info["filename"],
            resume_text=info["resume_text"],
            mappings=mappings
        )
    raise HTTPException(status_code=404, detail="Resume not found in cache.")

@app.post("/api/resumes/cache")
async def save_resume_cache(req: ResumeCacheSaveRequest):
    candidate_name = req.candidate_name.strip()
    if not candidate_name:
        raise HTTPException(status_code=400, detail="Candidate name cannot be empty.")
        
    r = get_redis_client()
    if r:
        try:
            # Save info
            info = {
                "candidate_name": candidate_name,
                "filename": req.filename,
                "resume_text": req.resume_text
            }
            r.set(f"screener:resume:info:{candidate_name}", json.dumps(info))
            r.sadd("screener:resumes", candidate_name)
            # Save mappings
            mappings_list = [m.model_dump() for m in req.mappings]
            r.set(f"screener:resume:mappings:{candidate_name}:{req.jd_id}", json.dumps(mappings_list))
            return {"message": "Resume and context map cached successfully."}
        except Exception as e:
            logger.error(f"Redis POST resume cache error: {e}")
            
    # Fallback
    resumes_dict = load_resumes_file()
    if candidate_name not in resumes_dict:
        resumes_dict[candidate_name] = {
            "candidate_name": candidate_name,
            "filename": req.filename,
            "resume_text": req.resume_text,
            "mappings": {}
        }
    else:
        # Update text/filename in case it changed
        resumes_dict[candidate_name]["filename"] = req.filename
        resumes_dict[candidate_name]["resume_text"] = req.resume_text
        
    resumes_dict[candidate_name]["mappings"][req.jd_id] = [m.model_dump() for m in req.mappings]
    save_resumes_file(resumes_dict)
    return {"message": "Resume and context map cached successfully."}

@app.post("/api/jds/clear")
async def clear_jds():
    r = get_redis_client()
    if r:
        try:
            keys = r.keys("screener:jd:*")
            for k in keys:
                r.delete(k)
            r.delete("screener:jds")
        except Exception as e:
            logger.error(f"Redis CLEAR jds error: {e}")
            
    # Fallback / sync file
    save_jds_file([])
    return {"message": "Job Description library cleared."}

@app.post("/api/resumes/clear")
async def clear_resumes():
    r = get_redis_client()
    if r:
        try:
            # Delete info keys
            info_keys = r.keys("screener:resume:info:*")
            for k in info_keys:
                r.delete(k)
            # Delete mappings keys
            mapping_keys = r.keys("screener:resume:mappings:*")
            for k in mapping_keys:
                r.delete(k)
            r.delete("screener:resumes")
        except Exception as e:
            logger.error(f"Redis CLEAR resumes error: {e}")
            
    # Fallback / sync file
    save_resumes_file({})
    return {"message": "Resume archive cache cleared."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


