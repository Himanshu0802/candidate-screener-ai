import os
import json
import hashlib
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
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
    BatchEvaluationResponse,
    ResumeOptimizeRequest,
    ResumeOptimizeResponse,
    RAGChatRequest,
    RAGChatResponse,
    RAGChatSession,
    RAGChatMessage,
    ModelListRequest,
    ModelListResponse,
    AutonomousScreenRequest,
    AutonomousScreenResponse,
    VerticalWeight,
    EvaluationResult
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

class LLMResumeOptimizeResponse(BaseModel):
    aligned_resume: str
    optimization_highlights: List[str]



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

@app.post("/api/models/list", response_model=ModelListResponse)
async def list_supported_models(req: ModelListRequest):
    """Lists supported Gemini models for the provided API key or GCP Vertex project."""
    try:
        models = llm_service.list_available_models(req.config)
        return ModelListResponse(
            success=True,
            models=models,
            message=f"Discovered {len(models)} models available for API Key."
        )
    except Exception as e:
        logger.error(f"Failed to list supported models: {e}")
        return ModelListResponse(
            success=False,
            models=[
                {"name": "gemini-2.5-flash", "display_name": "Gemini 2.5 Flash"},
                {"name": "gemini-2.5-pro", "display_name": "Gemini 2.5 Pro"},
                {"name": "gemini-1.5-flash", "display_name": "Gemini 1.5 Flash"}
            ],
            message=str(e)
        )

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

@app.post("/api/resume/optimize", response_model=ResumeOptimizeResponse)
async def optimize_resume(req: ResumeOptimizeRequest):
    try:
        eval_gaps_summary = []
        for ev in req.evaluations:
            eval_gaps_summary.append({
                "vertical": ev.vertical_name,
                "score": ev.score,
                "weight": ev.weight,
                "rationale": ev.rationale,
                "strengths": ev.green_points,
                "gaps_or_miss_points": ev.miss_points
            })

        prompt = (
            f"You are a World-Class Executive Resume Engineering AI and Career Strategist.\n"
            f"Your objective is to generate an updated, upgraded, and highly aligned Markdown version of the candidate's resume targeting the specified Job Description parameters, while directly addressing the identified evaluation gaps.\n\n"
            f"CANDIDATE NAME: {req.candidate_name or 'Candidate'}\n"
            f"TARGET JOB TITLE: {req.jd_title or 'Target Position'}\n\n"
            f"JOB DESCRIPTION:\n{req.jd_text}\n\n"
            f"SECTIONAL EVALUATION RESULTS & GAPS:\n{json.dumps(eval_gaps_summary, indent=2)}\n\n"
            f"ORIGINAL CANDIDATE RESUME TEXT:\n{req.resume_text}\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Generate a complete, polished, high-impact resume in Markdown format for 'aligned_resume'.\n"
            f"2. Preserve all authentic career experience, dates, companies, degrees, and background facts.\n"
            f"3. Elevate bullet points with strong action verbs, technical terms from the JD, and metric-driven framing.\n"
            f"4. Directly address the 'gaps_or_miss_points' by emphasizing relevant transferable skills, side projects, or methodologies present in their experience.\n"
            f"5. Include a Professional Summary tailored to the JD, Core Technical Competencies aligned to JD verticals, Work History, and Education/Certifications.\n"
            f"6. Under 'optimization_highlights', list 3 to 5 concise bullet points summarizing key improvements made to bridge gaps."
        )

        parsed_res, telemetry = llm_service.call_llm_structured(
            config=req.config,
            prompt=prompt,
            response_schema=LLMResumeOptimizeResponse,
            system_instruction="You are an expert resume optimization agent that upgrades candidate resumes to align with Job Descriptions while bridging evaluation gaps."
        )

        return ResumeOptimizeResponse(
            aligned_resume=parsed_res.aligned_resume,
            optimization_highlights=parsed_res.optimization_highlights,
            tokens=telemetry
        )
    except Exception as e:
        logger.error(f"Resume optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/autonomous_screen", response_model=AutonomousScreenResponse)
async def autonomous_screen(req: AutonomousScreenRequest):
    try:
        steps_log = []
        total_inp = 0
        total_out = 0

        # Step 1: Modularize JD
        steps_log.append("✦ Step 1: Modularizing Job Description into competency verticals...")
        jd_prompt = (
            "Analyze the following Job Description and break it down into 3 to 6 critical competency verticals "
            "(e.g., Core Technical Skills, System Architecture, Leadership/Collaboration, Domain Knowledge).\n\n"
            f"JOB DESCRIPTION:\n{req.jd_text}"
        )
        parsed_verticals, t1 = llm_service.call_llm_structured(
            config=req.config,
            prompt=jd_prompt,
            response_schema=LLMVerticalsResponse,
            system_instruction="You are an expert HR and recruitment architect. You extract core competency verticals from Job Descriptions."
        )
        total_inp += t1.input_tokens
        total_out += t1.output_tokens

        verticals = [
            VerticalWeight(name=v.name, description=v.description, weight="High")
            for v in parsed_verticals.verticals
        ]
        steps_log.append(f"✓ Extracted {len(verticals)} dimensions: {', '.join([v.name for v in verticals])}")

        # Step 2: Compile Rubric
        steps_log.append("✦ Step 2: Compiling grading rubric criteria...")
        rubric_parts = [
            "SYSTEM INSTRUCTION:",
            "You are an expert resume evaluation agent.",
            "Evaluate candidate experience against the specified requirements with strict evidence-based scoring (0-10).",
            "ACTIVE VERTICALS:"
        ]
        for v in verticals:
            rubric_parts.append(f"- '{v.name}' (Weight: {v.weight}): {v.description}")
        compiled_rubric = "\n".join(rubric_parts)

        # Step 3: Semantic Resume Context Mapping
        steps_log.append("✦ Step 3: Mapping resume evidence to competency verticals...")
        map_prompt = (
            f"Analyze the resume and extract specific evidence statements for each vertical.\n\n"
            f"EVALUATION VERTICALS:\n" + "\n".join([f"- {v.name}: {v.description}" for v in verticals]) +
            f"\n\nCANDIDATE RESUME:\n{req.resume_text}"
        )
        parsed_map, t2 = llm_service.call_llm_structured(
            config=req.config,
            prompt=map_prompt,
            response_schema=LLMResumeMapResponse,
            system_instruction="You are an expert resume parsing and semantic context mapping agent."
        )
        total_inp += t2.input_tokens
        total_out += t2.output_tokens

        mappings = [
            MappedChunk(vertical_name=m.vertical_name, chunk_text=m.chunk_text)
            for m in parsed_map.mappings
        ]
        steps_log.append(f"✓ Mapped {len(mappings)} evidence sections")

        # Step 4: Batch Dimension Evaluation
        steps_log.append("✦ Step 4: Orchestrating parallel agent evaluations...")
        eval_prompt_lines = [
            "You are an expert HR evaluation agent. Evaluate the candidate across multiple Job Description verticals.",
            "For each vertical, compute a score (0 to 10), detailed rationale, green points (strengths), and miss points (gaps).",
            "",
            "VERTICALS & EVIDENCE:"
        ]
        for v in verticals:
            chunk = "No evidence provided"
            for m in mappings:
                if m.vertical_name == v.name:
                    chunk = m.chunk_text
                    break
            eval_prompt_lines.append(f"- Vertical: '{v.name}' (Weight: {v.weight})")
            eval_prompt_lines.append(f"  Description: {v.description}")
            eval_prompt_lines.append(f"  Evidence: {chunk}")
            eval_prompt_lines.append("---")

        parsed_evals, t3 = llm_service.call_llm_structured(
            config=req.config,
            prompt="\n".join(eval_prompt_lines),
            response_schema=LLMBatchEvaluationResponse,
            system_instruction=compiled_rubric
        )
        total_inp += t3.input_tokens
        total_out += t3.output_tokens

        eval_map = {res.vertical_name: res for res in parsed_evals.evaluations}
        evaluations = []
        for v in verticals:
            if v.name in eval_map:
                res = eval_map[v.name]
                evaluations.append(EvaluationResult(
                    vertical_name=v.name,
                    score=res.score,
                    weight=v.weight,
                    rationale=res.rationale,
                    green_points=res.green_points,
                    miss_points=res.miss_points
                ))
            else:
                evaluations.append(EvaluationResult(
                    vertical_name=v.name,
                    score=0,
                    weight=v.weight,
                    rationale="No direct evidence found.",
                    green_points=[],
                    miss_points=["Missing evidence in resume"]
                ))
        steps_log.append(f"✓ Completed {len(evaluations)} dimension evaluations")

        # Step 5: Synthesize Final Verdict
        steps_log.append("✦ Step 5: Synthesizing final hiring resolution verdict...")
        eval_summary_lines = []
        for ev in evaluations:
            eval_summary_lines.append(f"Dimension: '{ev.vertical_name}' (Weight: {ev.weight}) -> Score: {ev.score}/10")
            eval_summary_lines.append(f"Rationale: {ev.rationale}")
            eval_summary_lines.append(f"Strengths: {', '.join(ev.green_points)}")
            eval_summary_lines.append(f"Misses: {', '.join(ev.miss_points)}")
            eval_summary_lines.append("---")

        verdict_prompt = (
            f"Review all dimension scores and rationalize a final hiring resolution:\n\n"
            + "\n".join(eval_summary_lines) +
            "\nOutput 'FIT' if the candidate meets core competencies or 'MISS' if critical gaps exist, with a concise 2-sentence executive justification."
        )

        parsed_verdict, t4 = llm_service.call_llm_structured(
            config=req.config,
            prompt=verdict_prompt,
            response_schema=LLMVerdictResponse,
            system_instruction="You are a Chief Talent Officer making the final hiring decision."
        )
        total_inp += t4.input_tokens
        total_out += t4.output_tokens

        clean_verdict = parsed_verdict.verdict.strip().upper()
        if "FIT" in clean_verdict:
            clean_verdict = "FIT"
        else:
            clean_verdict = "MISS"

        steps_log.append(f"✓ Resolution Finalized: {clean_verdict}")

        return AutonomousScreenResponse(
            jd_title=req.jd_title or "Target Position",
            candidate_name=req.candidate_name or "Candidate",
            verticals=verticals,
            mappings=mappings,
            evaluations=evaluations,
            verdict=clean_verdict,
            summary=parsed_verdict.summary,
            tokens=TokenTelemetry(input_tokens=total_inp, output_tokens=total_out),
            steps_log=steps_log
        )
    except Exception as e:
        logger.error(f"Autonomous screening failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/autonomous_screen/stream")
async def autonomous_screen_stream(req: AutonomousScreenRequest):
    def event_stream():
        try:
            total_inp = 0
            total_out = 0

            # Step 1: Modularize JD
            jd_hash = hashlib.sha256(req.jd_text.strip().encode('utf-8')).hexdigest()[:16]
            jd_cache_key = f"jd_verticals_{jd_hash}"
            cached_jd = get_pipeline_cache(jd_cache_key)

            yield f"data: {json.dumps({'type': 'step', 'step': 1, 'label': 'Modularizing Job Description competencies...', 'log': 'Analyzing requirements & extracting 3-6 core competency dimensions'})}\n\n"
            
            if cached_jd and "verticals" in cached_jd:
                verticals = [VerticalWeight(**v) for v in cached_jd["verticals"]]
                yield f"data: {json.dumps({'type': 'step_done', 'step': 1, 'log': f'⚡ [Cache Hit] Reused {len(verticals)} dimensions (0 tokens): ' + ', '.join(v.name for v in verticals)})}\n\n"
            else:
                modularize_prompt = (
                    f"You are an expert recruitment architect. Analyze this Job Description:\n\n{req.jd_text}\n\n"
                    "Extract 3 to 6 critical competency verticals for candidate evaluation."
                )
                parsed_modularize, t0 = llm_service.call_llm_structured(
                    config=req.config,
                    prompt=modularize_prompt,
                    response_schema=LLMVerticalsResponse,
                    system_instruction="You are an expert HR recruitment architect."
                )
                total_inp += t0.input_tokens
                total_out += t0.output_tokens
                verticals = [VerticalWeight(name=v.name, description=v.description, weight="High") for v in parsed_modularize.verticals]
                set_pipeline_cache(jd_cache_key, {"verticals": [v.model_dump() for v in verticals]})
                auto_save_jd_if_new(req.jd_title, req.jd_text, verticals)
                yield f"data: {json.dumps({'type': 'step_done', 'step': 1, 'log': f'Extracted {len(verticals)} competency dimensions: ' + ', '.join(v.name for v in verticals)})}\n\n"

            # Step 2: Compile Rubric
            weights_sig = "|".join(f"{v.name}:{v.weight}" for v in verticals)
            rubric_hash = hashlib.sha256(f"{jd_hash}_{weights_sig}".encode('utf-8')).hexdigest()[:16]
            rubric_cache_key = f"rubric_{rubric_hash}"
            cached_rubric = get_pipeline_cache(rubric_cache_key)

            yield f"data: {json.dumps({'type': 'step', 'step': 2, 'label': 'Compiling evaluation rubric criteria...', 'log': 'Compiling 0-10 evidence-based grading rubric with calibrated weights'})}\n\n"
            
            if cached_rubric and "rubric_text" in cached_rubric:
                compiled_rubric_text = cached_rubric["rubric_text"]
                yield f"data: {json.dumps({'type': 'step_done', 'step': 2, 'log': f'⚡ [Cache Hit] Reused compiled grading rubric (0 tokens, {len(compiled_rubric_text)} chars)'})}\n\n"
            else:
                rubric_prompt = (
                    f"Job Description:\n{req.jd_text}\n\n"
                    f"Target Verticals & Weights:\n"
                    + "\n".join([f"- {v.name} (Weight: {v.weight}): {v.description}" for v in verticals])
                    + "\n\nSynthesize a rigorous, objective 0-10 grading rubric for candidate evaluations."
                )
                compiled_rubric_text, t1 = llm_service.call_llm_text(
                    config=req.config,
                    prompt=rubric_prompt,
                    system_instruction="You are a principal talent assessor writing an evaluation rubric."
                )
                total_inp += t1.input_tokens
                total_out += t1.output_tokens
                set_pipeline_cache(rubric_cache_key, {"rubric_text": compiled_rubric_text})
                yield f"data: {json.dumps({'type': 'step_done', 'step': 2, 'log': f'Compiled evaluation rubric ({len(compiled_rubric_text)} chars)'})}\n\n"

            # Step 3: Evidence Mapping
            res_hash = hashlib.sha256(req.resume_text.strip().encode('utf-8')).hexdigest()[:16]
            map_hash = hashlib.sha256(f"{res_hash}_{rubric_hash}".encode('utf-8')).hexdigest()[:16]
            map_cache_key = f"map_{map_hash}"
            cached_map = get_pipeline_cache(map_cache_key)

            yield f"data: {json.dumps({'type': 'step', 'step': 3, 'label': 'Mapping resume evidence chunks...', 'log': 'Extracting semantic evidence and chunk mapping from candidate resume'})}\n\n"
            
            if cached_map and "mappings" in cached_map:
                mappings = [MappedChunk(**m) for m in cached_map["mappings"]]
                yield f"data: {json.dumps({'type': 'step_done', 'step': 3, 'log': f'⚡ [Cache Hit] Reused {len(mappings)} mapped evidence chunks (0 tokens)'})}\n\n"
            else:
                mapping_prompt = (
                    f"Candidate Resume:\n{req.resume_text}\n\n"
                    f"Evaluation Verticals:\n"
                    + "\n".join([f"- {v.name}: {v.description}" for v in verticals])
                    + "\n\nMap relevant evidence chunks from the resume to each vertical."
                )
                parsed_mapping, t2 = llm_service.call_llm_structured(
                    config=req.config,
                    prompt=mapping_prompt,
                    response_schema=LLMResumeMapResponse,
                    system_instruction="You are an expert evidence mapper."
                )
                total_inp += t2.input_tokens
                total_out += t2.output_tokens
                mappings = [MappedChunk(vertical_name=m.vertical_name, chunk_text=m.chunk_text) for m in parsed_mapping.mappings]
                set_pipeline_cache(map_cache_key, {"mappings": [m.model_dump() for m in mappings]})
                yield f"data: {json.dumps({'type': 'step_done', 'step': 3, 'log': f'Extracted {len(mappings)} mapped evidence chunks from resume'})}\n\n"

            # Step 4
            yield f"data: {json.dumps({'type': 'step', 'step': 4, 'label': 'Executing parallel batch dimension agents...', 'log': 'Scoring candidate evidence against rubric with demonstrated strengths & gaps'})}\n\n"
            batch_eval_prompt = (
                f"Job Description: {req.jd_title or 'Position'}\n\n"
                f"Compiled Rubric:\n{compiled_rubric_text}\n\n"
                f"Candidate Name: {req.candidate_name or 'Candidate'}\n\n"
                f"Verticals to evaluate:\n"
                + "\n".join([f"- {v.name} (Weight: {v.weight})" for v in verticals])
                + "\n\nMapped Resume Evidence:\n"
                + "\n".join([f"[{m.vertical_name}]: {m.chunk_text}" for m in mappings])
                + "\n\nEvaluate each vertical with a score (0-10), rationale, demonstrated strengths, and miss points."
            )
            parsed_eval, t3 = llm_service.call_llm_structured(
                config=req.config,
                prompt=batch_eval_prompt,
                response_schema=LLMBatchEvaluationResponse,
                system_instruction="You are an expert candidate evaluation agent."
            )
            total_inp += t3.input_tokens
            total_out += t3.output_tokens
            evaluations = [
                EvaluationResult(
                    vertical_name=e.vertical_name,
                    score=e.score,
                    rationale=e.rationale,
                    green_points=e.green_points,
                    miss_points=e.miss_points,
                    weight=next((v.weight for v in verticals if v.name.lower() == e.vertical_name.lower()), "High")
                )
                for e in parsed_eval.evaluations
            ]
            yield f"data: {json.dumps({'type': 'step_done', 'step': 4, 'log': f'Evaluated {len(evaluations)} competency verticals'})}\n\n"

            # Step 5
            yield f"data: {json.dumps({'type': 'step', 'step': 5, 'label': 'Synthesizing final resolution verdict...', 'log': 'Determining overall hiring recommendation (FIT vs MISS)'})}\n\n"
            verdict_prompt = (
                f"Candidate: {req.candidate_name or 'Candidate'}\n"
                f"Position: {req.jd_title or 'Target Position'}\n\n"
                "Competency Evaluations:\n"
                + "\n".join([f"- {e.vertical_name} (Weight: {e.weight}): Score {e.score}/10. Rationale: {e.rationale}" for e in evaluations])
                + "\n\nSynthesize an overall hiring recommendation (FIT or MISS) and executive summary."
            )
            parsed_verdict, t4 = llm_service.call_llm_structured(
                config=req.config,
                prompt=verdict_prompt,
                response_schema=LLMVerdictResponse,
                system_instruction="You are a Chief Talent Officer making the final hiring decision."
            )
            total_inp += t4.input_tokens
            total_out += t4.output_tokens

            clean_verdict = parsed_verdict.verdict.strip().upper()
            if "FIT" in clean_verdict:
                clean_verdict = "FIT"
            else:
                clean_verdict = "MISS"

            final_res = {
                "jd_title": req.jd_title or "Target Position",
                "candidate_name": req.candidate_name or "Candidate",
                "verticals": [v.dict() for v in verticals],
                "mappings": [m.dict() for m in mappings],
                "evaluations": [e.dict() for e in evaluations],
                "verdict": clean_verdict,
                "summary": parsed_verdict.summary,
                "tokens": {"input_tokens": total_inp, "output_tokens": total_out},
                "steps_log": [
                    f"✓ Modularized {len(verticals)} Verticals",
                    "✓ Compiled Rubric Criteria",
                    f"✓ Mapped {len(mappings)} Evidence Chunks",
                    f"✓ Evaluated {len(evaluations)} Dimensions",
                    f"✓ Resolution Finalized: {clean_verdict}"
                ]
            }

            yield f"data: {json.dumps({'type': 'result', 'data': final_res})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming autonomous screening failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_helper(req: ChatRequest):
    try:
        system_instruction = (
            "You are an expert AI Talent Advisor and Executive Recruitment Copilot.\n"
            "You have direct access to the Candidate's Resume, Target Job Description, and Multi-Axis Evaluation Results provided in the context below.\n\n"
            f"=== CONTEXT DATA ===\n"
            f"{json.dumps(req.step_context, indent=2)}\n"
            f"====================\n\n"
            "Guidelines for Your Responses:\n"
            "1. Answer user questions directly, naturally, and accurately based on the Candidate Resume text, work history dates, companies, education, and competency evaluation scores.\n"
            "2. When asked about years of experience, tenure, past roles, or technical skills, analyze the candidate's resume history directly and compute/state the factual answer cleanly.\n"
            "3. Output ONLY clean, direct markdown text. Do NOT use fake terminal roleplay, robotic prefixes like [QUERY_EXEC], [STATUS], or code fences unless asked. Speak as a sharp, professional executive talent advisor.\n"
            "4. Keep answers concise, factual, well-formatted, and easy to read."
        )
        
        # Build conversation prompt including history
        prompt_parts = []
        for msg in req.history:
            role_name = "User" if msg.get("role") == "user" else "Assistant"
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

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    def stream_generator():
        try:
            system_instruction = (
                "You are an expert AI Talent Advisor and Executive Recruitment Copilot.\n"
                "You have direct access to the Candidate's Resume, Target Job Description, and Multi-Axis Evaluation Results provided in the context below.\n\n"
                f"=== CONTEXT DATA ===\n"
                f"{json.dumps(req.step_context, indent=2)}\n"
                f"====================\n\n"
                "Guidelines for Your Responses:\n"
                "1. Answer user questions directly, naturally, and accurately based on the Candidate Resume text, work history dates, companies, education, and competency evaluation scores.\n"
                "2. When asked about years of experience, tenure, past roles, or technical skills, analyze the candidate's resume history directly and compute/state the factual answer cleanly.\n"
                "3. Output ONLY clean, direct markdown text. Do NOT use fake terminal roleplay, robotic prefixes like [QUERY_EXEC], [STATUS], or code fences unless asked. Speak as a sharp, professional executive talent advisor.\n"
                "4. Keep answers concise, factual, well-formatted, and easy to read."
            )
            
            prompt_parts = []
            for msg in req.history:
                role_name = "User" if msg.get("role") == "user" else "Assistant"
                prompt_parts.append(f"{role_name}: {msg.get('text')}")
                
            prompt_parts.append(f"User: {req.message}")
            prompt = "\n".join(prompt_parts)

            for chunk_text in llm_service.call_llm_text_stream(
                config=req.config,
                prompt=prompt,
                system_instruction=system_instruction
            ):
                yield f"data: {json.dumps({'chunk': chunk_text})}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Streaming chat failed: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

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

PIPELINE_CACHE_FILE = os.path.join(DATA_DIR, "pipeline_cache.json")
_pipeline_mem_cache = {}

def get_pipeline_cache(key: str):
    if key in _pipeline_mem_cache:
        return _pipeline_mem_cache[key]
    r = get_redis_client()
    if r:
        try:
            val = r.get(f"screener:cache:{key}")
            if val:
                data = json.loads(val)
                _pipeline_mem_cache[key] = data
                return data
        except Exception as e:
            logger.warning(f"Redis get cache error: {e}")
    if os.path.exists(PIPELINE_CACHE_FILE):
        try:
            with open(PIPELINE_CACHE_FILE, "r", encoding="utf-8") as f:
                disk_cache = json.load(f)
                if key in disk_cache:
                    _pipeline_mem_cache[key] = disk_cache[key]
                    return disk_cache[key]
        except Exception as e:
            logger.warning(f"Disk cache read error: {e}")
    return None

def set_pipeline_cache(key: str, data: dict, ttl: int = 86400):
    _pipeline_mem_cache[key] = data
    r = get_redis_client()
    if r:
        try:
            r.set(f"screener:cache:{key}", json.dumps(data), ex=ttl)
        except Exception as e:
            logger.warning(f"Redis set cache error: {e}")
    try:
        disk_cache = {}
        if os.path.exists(PIPELINE_CACHE_FILE):
            with open(PIPELINE_CACHE_FILE, "r", encoding="utf-8") as f:
                disk_cache = json.load(f)
        disk_cache[key] = data
        with open(PIPELINE_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(disk_cache, f, indent=2)
    except Exception as e:
        logger.warning(f"Disk cache write error: {e}")

def auto_save_jd_if_new(title: str, jd_text: str, verticals: list):
    """Automatically saves a newly submitted JD to Redis and disk so it is instantly available in the saved library."""
    if not jd_text or len(jd_text.strip()) < 15:
        return None
    
    clean_title = (title or "").strip() or "Custom Role"
    existing_jds = load_jds_file()
    
    for j in existing_jds:
        if j.get("title", "").strip().lower() == clean_title.lower() or j.get("jd_text", "").strip() == jd_text.strip():
            return j
            
    r = get_redis_client()
    if r:
        try:
            keys = r.keys("screener:jd:*")
            for k in keys:
                val = r.get(k)
                if val:
                    item = json.loads(val)
                    if item.get("title", "").strip().lower() == clean_title.lower() or item.get("jd_text", "").strip() == jd_text.strip():
                        return item
        except Exception as e:
            logger.warning(f"Redis check JD error: {e}")
            
    jd_id = f"jd_{hashlib.sha256(jd_text.strip().encode('utf-8')).hexdigest()[:8]}"
    item = {
        "id": jd_id,
        "title": clean_title,
        "jd_text": jd_text,
        "verticals": [v.model_dump() if hasattr(v, 'model_dump') else v for v in verticals]
    }
    
    if r:
        try:
            r.set(f"screener:jd:{jd_id}", json.dumps(item))
            r.sadd("screener:jds", jd_id)
        except Exception as e:
            logger.warning(f"Redis auto-save error: {e}")
            
    existing_jds.append(item)
    save_jds_file(existing_jds)
    logger.info(f"Auto-saved new JD '{clean_title}' (id: {jd_id}) to library and Redis.")
    return item



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

# ==========================================
# MULTI-MODAL RAG & EVALUATION ENDPOINTS
# ==========================================

from services.ingestion import ingestion_parser
from services.search_engine import search_engine
from services.agentic_rag import agentic_rag_orchestrator
from services.evaluations import code_evaluator, ragas_evaluator

from schemas import APIKeyConfig

class RAGQueryRequest(BaseModel):
    query: str
    search_strategy: str = "HNSW" # BM25, HNSW, IVFFlat, GraphQA
    top_k: int = 4
    enable_agentic_flow: bool = True
    enable_evaluations: bool = True
    config: Optional[APIKeyConfig] = None

@app.post("/api/rag/upload")
async def rag_upload_document(file: UploadFile = File(...)):
    """Ingests Multi-modal files (PDFs with diagrams, Word, PPTX, CSV/Excel, Images) into RAG indexes."""
    try:
        content_bytes = await file.read()
        chunks = ingestion_parser.parse_file(file.filename, content_bytes)
        search_engine.add_chunks(chunks)
        
        return {
            "filename": file.filename,
            "status": "success",
            "chunks_ingested": len(chunks),
            "chunk_types": list(set(c.chunk_type for c in chunks)),
            "preview_chunks": [c.to_dict() for c in chunks[:5]]
        }
    except Exception as e:
        logger.error(f"RAG Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/stats")
async def rag_get_stats():
    """Returns total index statistics (chunks, graph nodes, strategy availability)."""
    return {
        "total_chunks": len(search_engine.chunks),
        "documents_indexed": list(set(c.doc_name for c in search_engine.chunks)),
        "available_strategies": ["HNSW", "IVFFlat", "BM25", "GraphQA"],
        "graph_nodes": search_engine.knowledge_graph.number_of_nodes(),
        "graph_edges": search_engine.knowledge_graph.number_of_edges()
    }

@app.post("/api/rag/query")
async def rag_query_endpoint(req: RAGQueryRequest):
    """Executes RAG Retrieval, optional Agentic Orchestration, and RAGAS + Code-driven Evals."""
    if not search_engine.chunks:
        raise HTTPException(status_code=400, detail="No documents ingested in RAG memory yet. Upload files first.")
        
    cfg = req.config or APIKeyConfig()
    
    if req.enable_agentic_flow:
        res = agentic_rag_orchestrator.run_agentic_flow(
            user_query=req.query,
            search_strategy=req.search_strategy,
            enable_evals=req.enable_evaluations,
            api_config=cfg
        )
        return res
    else:
        # Standard Direct Retrieval RAG
        retrieved = search_engine.search(req.query, strategy=req.search_strategy, top_k=req.top_k)
        retrieved_texts = [c["chunk"]["content"] for c in retrieved]
        context_block = "\n---\n".join(retrieved_texts)
        
        prompt = f"Analyze the context carefully and answer the user question directly.\n\nContext:\n{context_block}\n\nQuestion: {req.query}"
        try:
            answer, _ = llm_service.call_llm_text(
                config=cfg,
                prompt=prompt,
                system_instruction="You are an expert Multi-Modal RAG AI assistant providing clear, precise answers based strictly on retrieved context."
            )
        except Exception as e:
            logger.warning(f"Direct RAG LLM call error: {e}")
            answer = f"Based on retrieved context:\n" + "\n".join([f"• {t}" for t in retrieved_texts[:3]])
            
        evals = {}
        if req.enable_evaluations:
            c_evals = code_evaluator.evaluate_response(req.query, answer, retrieved)
            r_evals = ragas_evaluator.evaluate_ragas_metrics(req.query, answer, retrieved_texts)
            evals = {**c_evals, **r_evals}
            
        return {
            "query": req.query,
            "response": answer,
            "retrieved_chunks": retrieved,
            "agent_logs": [f"Direct Retrieval Mode using '{req.search_strategy}'"],
            "evaluations": evals
        }

@app.get("/api/rag/artifacts")
async def rag_get_artifacts():
    """Returns detailed summary of all currently ingested artifacts."""
    return search_engine.get_artifacts_summary()

@app.delete("/api/rag/artifacts/{doc_name}")
async def rag_delete_artifact(doc_name: str):
    """Deletes a specific ingested document artifact from RAG memory."""
    success = search_engine.delete_artifact(doc_name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Artifact '{doc_name}' not found.")
    return {"message": f"Artifact '{doc_name}' removed from RAG memory."}

@app.post("/api/rag/chat")
async def rag_chat_endpoint(req: RAGChatRequest):
    """Multi-turn Google ADK RAG Chat Endpoint with active session memory and artifact filtering."""
    if not search_engine.chunks:
        raise HTTPException(status_code=400, detail="No documents ingested in RAG memory yet. Upload files first.")
        
    cfg = req.config or APIKeyConfig()
    res = agentic_rag_orchestrator.process_chat_message(
        session_id=req.session_id,
        user_message=req.message,
        search_strategy=req.search_strategy,
        top_k=req.top_k,
        doc_filter=req.doc_filter,
        enable_agentic_flow=req.enable_agentic_flow,
        enable_evaluations=req.enable_evaluations,
        api_config=cfg
    )
    return res

@app.get("/api/rag/sessions")
async def list_rag_sessions():
    """Returns list of active RAG chat sessions."""
    return agentic_rag_orchestrator.list_sessions()

@app.post("/api/rag/sessions/new")
async def create_rag_session(
    search_strategy: str = "HNSW",
    top_k: int = 4,
    enable_agentic_flow: bool = True,
    enable_evaluations: bool = True
):
    """Creates a new RAG Chat session."""
    return agentic_rag_orchestrator.create_session(
        search_strategy=search_strategy,
        top_k=top_k,
        enable_agentic_flow=enable_agentic_flow,
        enable_evaluations=enable_evaluations
    )

@app.get("/api/rag/sessions/{session_id}/history")
async def get_rag_session_history(session_id: str):
    """Retrieves full message history & memory state for a session."""
    sess = agentic_rag_orchestrator.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return sess

@app.delete("/api/rag/sessions/{session_id}")
async def delete_rag_session(session_id: str):
    """Deletes a RAG chat session."""
    success = agentic_rag_orchestrator.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"message": f"Session '{session_id}' deleted successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)





