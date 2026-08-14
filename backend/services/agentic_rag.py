import os
import json
import uuid
import time
import logging
from typing import List, Dict, Any, Optional
from services.search_engine import search_engine
from services.evaluations import code_evaluator, ragas_evaluator
import services.llm as llm_service

logger = logging.getLogger("agentic_rag")

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SESSIONS_FILE = os.path.join(DATA_DIR, "rag_sessions.json")

class RAGAgentTools:
    """Tools exposed to the Autonomous RAG Agent."""
    
    @staticmethod
    def execute_search(query: str, strategy: str = "HNSW", top_k: int = 4, doc_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        return search_engine.search(query=query, strategy=strategy, top_k=top_k, doc_filter=doc_filter)

    @staticmethod
    def summarize_context(chunks: List[Dict[str, Any]]) -> str:
        text_blocks = [c["chunk"]["content"] for c in chunks if "chunk" in c]
        return "\n---\n".join(text_blocks[:4])

class AgenticRAGOrchestrator:
    def __init__(self):
        self.tools = RAGAgentTools()
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self._load_sessions()

    def _load_sessions(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(SESSIONS_FILE):
            try:
                with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                    self.sessions = json.load(f)
                logger.info(f"Loaded {len(self.sessions)} RAG chat sessions from disk.")
            except Exception as e:
                logger.error(f"Failed to load RAG chat sessions: {e}")
                self.sessions = {}

    def _save_sessions(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(self.sessions, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save RAG chat sessions: {e}")

    def create_session(
        self,
        session_id: Optional[str] = None,
        search_strategy: str = "HNSW",
        top_k: int = 4,
        doc_filter: Optional[str] = None,
        enable_agentic_flow: bool = True,
        enable_evaluations: bool = True
    ) -> Dict[str, Any]:
        sid = session_id or f"session_{uuid.uuid4().hex[:8]}"
        session = {
            "session_id": sid,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "messages": [],
            "memory_summary": "Session initialized. Awaiting user multi-modal RAG query.",
            "search_strategy": search_strategy,
            "top_k": top_k,
            "doc_filter": doc_filter,
            "enable_agentic_flow": enable_agentic_flow,
            "enable_evaluations": enable_evaluations
        }
        self.sessions[sid] = session
        self._save_sessions()
        return session

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            self._save_sessions()
            return True
        return False

    def list_sessions(self) -> List[Dict[str, Any]]:
        result = []
        for sid, sess in self.sessions.items():
            result.append({
                "session_id": sid,
                "created_at": sess.get("created_at", ""),
                "message_count": len(sess.get("messages", [])),
                "memory_summary": sess.get("memory_summary", ""),
                "search_strategy": sess.get("search_strategy", "HNSW"),
                "doc_filter": sess.get("doc_filter", None)
            })
        return sorted(result, key=lambda x: x["created_at"], reverse=True)

    def process_chat_message(
        self,
        session_id: Optional[str],
        user_message: str,
        search_strategy: str = "HNSW",
        top_k: int = 4,
        doc_filter: Optional[str] = None,
        enable_agentic_flow: bool = True,
        enable_evaluations: bool = True,
        api_config: Optional[llm_service.APIKeyConfig] = None
    ) -> Dict[str, Any]:
        """
        Executes a multi-turn Conversational RAG session using Google ADK memory patterns.
        """
        if not session_id or session_id not in self.sessions:
            session = self.create_session(
                session_id=session_id,
                search_strategy=search_strategy,
                top_k=top_k,
                doc_filter=doc_filter,
                enable_agentic_flow=enable_agentic_flow,
                enable_evaluations=enable_evaluations
            )
        else:
            session = self.sessions[session_id]
            # Update active settings
            session["search_strategy"] = search_strategy
            session["top_k"] = top_k
            session["doc_filter"] = doc_filter
            session["enable_agentic_flow"] = enable_agentic_flow
            session["enable_evaluations"] = enable_evaluations

        agent_logs = []
        
        # Step 1: Add User Message to History
        user_msg_obj = {
            "id": f"msg_{uuid.uuid4().hex[:8]}",
            "role": "user",
            "content": user_message,
            "timestamp": time.strftime("%H:%M:%S")
        }
        session["messages"].append(user_msg_obj)

        agent_logs.append(f"💬 [ADK Agent]: Processing multi-turn turn #{len(session['messages'])} in session '{session['session_id']}'.")
        agent_logs.append(f"🧠 [Agent Memory]: Active Context Summary: \"{session.get('memory_summary', 'None')}\"")
        if doc_filter:
            agent_logs.append(f"🎯 [ADK Artifact Filter]: Restricting retrieval scope exclusively to artifact '{doc_filter}'.")

        # Step 2: History-Aware Query Formulation & Sub-Query Decomposition
        recent_history = session["messages"][-6:-1] # Past turns excluding current user message
        history_context_str = ""
        if recent_history:
            history_lines = [f"{m['role'].upper()}: {m['content']}" for m in recent_history]
            history_context_str = "\n".join(history_lines)

        search_query = user_message
        if history_context_str and ("it" in user_message.lower() or "that" in user_message.lower() or "this" in user_message.lower() or "they" in user_message.lower()):
            agent_logs.append("🔍 [ADK Memory Tool]: Resolving pronouns and coreferences from past conversation turns.")
            search_query = f"{user_message} (Context from previous chat turns: {session.get('memory_summary', '')})"

        # Decompose if multi-part query
        sub_queries = [search_query]
        if enable_agentic_flow and ("compare" in user_message.lower() or "and" in user_message.lower()):
            agent_logs.append("🤖 [ADK Decomposer]: Decomposing multi-part user question into sub-queries.")
            parts = user_message.lower().split(" and ")
            if len(parts) > 1:
                sub_queries = [p.strip() for p in parts if p.strip()]

        # Step 3: Execute RAG Retrieval
        all_retrieved = []
        for sq in sub_queries:
            filter_str = f" (Artifact Filter: '{doc_filter}')" if doc_filter else ""
            agent_logs.append(f"⚙️ [ADK Retrieval Tool]: Executing strategy '{search_strategy}' (Top-K={top_k}){filter_str} for sub-query: '{sq}'")
            res = self.tools.execute_search(query=sq, strategy=search_strategy, top_k=top_k, doc_filter=doc_filter)
            all_retrieved.extend(res)

        # Deduplicate retrieved chunks
        unique_chunks = {}
        for r in all_retrieved:
            cid = r["chunk"]["chunk_id"]
            if cid not in unique_chunks:
                unique_chunks[cid] = r
        final_retrieved = list(unique_chunks.values())
        agent_logs.append(f"📦 [ADK Evidence Manager]: Retrieved {len(final_retrieved)} multi-modal chunks from vector/graph memory.")

        # Step 4: Multi-turn Synthesis with google-genai SDK
        context_str = self.tools.summarize_context(final_retrieved) if final_retrieved else "No document context found."

        system_instruction = (
            "You are an expert Multi-Modal Conversational RAG Assistant powered by Google ADK. "
            "You maintain an ongoing conversation with the user. Answer using the retrieved document evidence "
            "and active conversation memory. Be precise, helpful, structured, and cite relevant sections."
        )

        prompt = f"""
=== AGENT ROLLING MEMORY SUMMARY ===
{session.get('memory_summary', 'No prior memory.')}

=== RECENT CONVERSATION HISTORY ===
{history_context_str if history_context_str else 'No previous conversation turns.'}

=== RETRIEVED DOCUMENT EVIDENCE ({search_strategy} SEARCH) ===
{context_str}

=== USER QUESTION ===
{user_message}

Answer the user question accurately based on the retrieved document evidence and chat context.
"""
        cfg = api_config or llm_service.APIKeyConfig()
        model_used = cfg.model or "gemini-2.5-flash"
        turn_telemetry = llm_service.TokenTelemetry(input_tokens=0, output_tokens=0)
        
        try:
            response_text, turn_telemetry = llm_service.call_llm_text(
                config=cfg,
                prompt=prompt,
                system_instruction=system_instruction
            )
            agent_logs.append("✅ [ADK Synthesizer]: Successfully generated history-grounded response via Gemini LLM.")
        except Exception as e:
            logger.warning(f"ADK Chat LLM call error: {e}")
            if final_retrieved:
                response_text = f"Based on retrieved document context:\n\n" + "\n\n".join([f"• {c['chunk']['content']}" for c in final_retrieved[:3]])
            else:
                response_text = "I apologize, but I could not find relevant context in RAG memory for your query."
            agent_logs.append(f"⚠️ [ADK Fallback]: Used local context extraction due to API warning: {e}")

        # Compute turn pricing based on Gemini model rates
        cost_usd = llm_service.calculate_gemini_cost(model_used, turn_telemetry.input_tokens, turn_telemetry.output_tokens)
        agent_logs.append(f"💰 [ADK Telemetry]: Consumed {turn_telemetry.input_tokens} input + {turn_telemetry.output_tokens} output tokens (~${cost_usd:.6f} USD, Model: {model_used}).")

        # Step 5: Dual Evaluations (RAGAS + Code-driven)
        eval_results = {}
        if enable_evaluations:
            retrieved_texts = [c["chunk"]["content"] for c in final_retrieved]
            c_evals = code_evaluator.evaluate_response(user_message, response_text, final_retrieved)
            r_evals = ragas_evaluator.evaluate_ragas_metrics(user_message, response_text, retrieved_texts)
            eval_results = {**c_evals, **r_evals}
            agent_logs.append("📊 [ADK Evaluator]: Evaluated response with RAGAS + Code metrics.")

        # Step 6: Update Agent Rolling Memory
        if len(session["messages"]) >= 3:
            # Compress rolling memory
            summary_prompt = f"""
Summarize the core topics, facts, and key context established in this conversation into 2 concise sentences for memory storage.

Memory History:
{session.get('memory_summary', '')}
User: {user_message}
Assistant: {response_text[:300]}
"""
            try:
                new_summary, mem_telem = llm_service.call_llm_text(
                    config=cfg,
                    prompt=summary_prompt,
                    system_instruction="Create a ultra-concise 2-sentence summary of the conversation state."
                )
                session["memory_summary"] = new_summary.strip()
                turn_telemetry.input_tokens += mem_telem.input_tokens
                turn_telemetry.output_tokens += mem_telem.output_tokens
                cost_usd = llm_service.calculate_gemini_cost(model_used, turn_telemetry.input_tokens, turn_telemetry.output_tokens)
                agent_logs.append(f"🧠 [ADK Memory Compression]: Updated session rolling memory summary.")
            except Exception as me:
                logger.warning(f"Failed to compress memory: {me}")
                session["memory_summary"] = f"Ongoing chat about: '{user_message[:40]}...'"

        # Step 7: Record Assistant Message in Session History
        assistant_msg_obj = {
            "id": f"msg_{uuid.uuid4().hex[:8]}",
            "role": "assistant",
            "content": response_text,
            "timestamp": time.strftime("%H:%M:%S"),
            "agent_logs": agent_logs,
            "retrieved_chunks": final_retrieved,
            "evaluations": eval_results,
            "search_strategy": search_strategy,
            "tokens": turn_telemetry.model_dump(),
            "cost_usd": cost_usd
        }
        session["messages"].append(assistant_msg_obj)
        self._save_sessions()

        return {
            "session_id": session["session_id"],
            "message": assistant_msg_obj,
            "memory_summary": session["memory_summary"],
            "evaluations": eval_results
        }

    def run_agentic_flow(
        self,
        user_query: str,
        search_strategy: str = "HNSW",
        enable_evals: bool = True,
        api_config: Optional[llm_service.APIKeyConfig] = None
    ) -> Dict[str, Any]:
        """Backward compatible single-turn agent call."""
        res = self.process_chat_message(
            session_id=None,
            user_message=user_query,
            search_strategy=search_strategy,
            top_k=4,
            enable_agentic_flow=True,
            enable_evaluations=enable_evals,
            api_config=api_config
        )
        return {
            "query": user_query,
            "response": res["message"]["content"],
            "retrieved_chunks": res["message"]["retrieved_chunks"],
            "agent_logs": res["message"]["agent_logs"],
            "evaluations": res["evaluations"]
        }

agentic_rag_orchestrator = AgenticRAGOrchestrator()

