# ◢ Candidate_screener.ai ◣
### Agentic Candidate Assessment Console // ver. 1.0.4

<p align="center">
  <img src="frontend/src/assets/logo.png" alt="Candidate_screener.ai Logo" width="600" />
</p>

> [!IMPORTANT]
> **Candidate_screener.ai** is a high-speed, token-efficient candidate assessment console. Crafted in a **Neo-Retro Glassmorphic** theme, the interface features dynamic theme switching (Retro UI vs. Modern UI), interactive token telemetry, a live CLI execution log, and a real-time leaderboard showing ranked candidate screen verdicts.

---

## ⚙️ Core Diagnostics & Features

* **`[X] Unified Console Branding & Mini-Logo Box`**: Displays a custom retro console logo container (`◢ Candidate_screener.ai ◣`) in a centered layout on the boot screen and integrates a compact, glowing version of this console box in the header banner on all subsequent screening steps.
* **`[X] JD Ingestion & Library Dropdown`**: Load JDs from library or write custom ones. Includes single-click JD deletion.
* **`[X] Dynamic Weighting Card Matrix`**: Prioritize job dimensions (*High, Medium, Low, Ignore*).
* **`[X] Zero-LLM Rubric Compiler`**: Automatically compiles priority weights into a strict JSON-evaluation system prompt locally, saving tokens.
* **`[X] Local Resume Parser`**: Ingest PDF and DOCX documents locally using binary stream parsing.
* **`[X] Resume Context Map Cache`**: Caches parsed resume texts and mappings under `(candidate_name, jd_id)`. Re-selecting a candidate skips model requests entirely.
* **`[X] High-Speed Batch Agent Evaluation`**: Groups all dimension evaluations into a single concurrent model request (`POST /api/agent/evaluate_batch`). This reduces $N$ API hits to $1$, saving input tokens and cutting latency to ~1.5 seconds.
* **`[X] Mathematical Verdict Enforcer`**: Programmatically calculates candidate fit based on weighted average score thresholds ($\ge 6.5$) and critical gaps ($\le 3$ on High-priority verticals), backed by an LLM-synthesized summary.
* **`[X] Real-Time Leaderboard`**: Automatic candidate ranking sorted by total scorecard score (descending) with active delete mechanics.
* **`[X] Fail-safe DB Persistence`**: Connects to Redis and tracks leaderboard rankings in sorted sets. If Redis is unavailable, it automatically falls back to local JSON files (`data/jds.json`, `data/candidates.json`, `data/resumes.json`) with zero service interruption.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend UI** | **React + Vite** | Neo-retro glassmorphic styling, progress bars, interactive token telemetry. |
| **Backend API** | **FastAPI + Uvicorn** | Fast, asynchronous web server exposing pipeline endpoints. |
| **Language Model** | **Gemini 2.5/1.5** | Utilizes official `google-genai` SDK with forced function calling (`mode="ANY"`). |
| **DB Persistence** | **Redis / JSON fallback** | Redis database with auto-fallback to local JSON store. |
| **Doc Parsers** | **PyPDF + Python-Docx** | Fast local document parsers. |

---

## 🚀 Boot Sequence & Installation

Follow these steps to initialize the application pipeline:

### 1. Prerequisites
Ensure you have Python 3.10+ and Node.js 18+ installed on your system.

### 2. Backend Boot Sequence
```bash
# Navigate to the backend directory
cd backend

# Initialize Virtual Environment (if not done already)
python -m venv ../venv
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

# Boot the FastAPI Server (Port 8000)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Boot Sequence
```bash
# Navigate to the frontend directory
cd frontend

# Install Node Dependencies
npm install

# Boot Vite Dev Server (Port 5173)
npm run dev
```

---

## 📡 API Endpoints Directory

The backend exposes the following REST endpoints:

* **JD Library**:
  * `GET /api/jds` - Fetch all saved JDs.
  * `POST /api/jds` - Save a new JD.
  * `DELETE /api/jds/{id}` - Delete a single pre-saved JD.
  * `POST /api/jds/clear` - Clear all pre-saved JDs from library.
* **Resume Engine**:
  * `POST /api/resume/parse` - Extract raw text from uploaded PDF/DOCX.
  * `POST /api/resume/map` - Segment raw resume sections into JD verticals.
  * `GET /api/resumes` - List all cached candidate resume files.
  * `GET /api/resumes/cache` - Fetch cached text/mappings for a candidate.
  * `POST /api/resumes/cache` - Cache parsed resume text/mappings.
  * `POST /api/resumes/clear` - Clear the resume cache.
* **Evaluation Core**:
  * `POST /api/agent/evaluate_batch` - Evaluate all active verticals in a single model call.
  * `POST /api/agent/synthesize` - Programmatically calculate verdict and synthesize executive summary.
* **Candidates Leaderboard**:
  * `GET /api/candidates` - Get candidates registry, sorted by score descending.
  * `POST /api/candidates` - Save candidate verdict report.
  * `DELETE /api/candidates/{id}` - Delete candidate record from leaderboard.

---

> [!TIP]
> Make sure to add your **Google Gemini API Key** under the `[SHOW_CONFIG]` control panel in the top header menu to authorize the agentic workflows.
