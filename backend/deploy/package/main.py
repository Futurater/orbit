"""
Project Orbit — FastAPI Application
Matching the architecture diagram exactly.

Endpoints:
  GET  /health                                → Health check
  GET  /api/curriculum/{day_id}               → Serve checkpoints to React
  GET  /api/session/{student_id}/{checkpoint_id} → Fetch student state (page refresh recovery)
  POST /submit-code                           → Evaluate student code (Strict Didi or Mentor)
  GET  /get-viva/{student_id}/{checkpoint_id} → Generate viva question + lock session
  POST /verify-viva                           → Grade viva answer (with Guardrails)
  POST /ask-mentor                            → Anytime doubt clearing via RAG

Deployment:
  Local  → uvicorn main:app --reload --port 8000
  Lambda → handler = Mangum(app, api_gateway_base_path="/default")
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

import json

from config import CORS_ORIGINS
from schemas import (
    CurriculumResponse, SessionState,
    CodeSubmitRequest, CodeEvalResponse,
    VivaStartResponse, VivaSubmitRequest, VivaResultResponse,
    MentorQuery, MentorResponse,
    DayProgress, ProgressResponse,
)
from router import handle_code_submit, handle_get_viva, handle_verify_viva, handle_ask_mentor
import db

# ─── LOAD CURRICULUM DATA ───────────────────────────────────
with open("curriculum.json") as f:
    raw_data = json.load(f)
    curriculum_data = raw_data.get("curriculum", raw_data)

# ─── APP ────────────────────────────────────────────────────
app = FastAPI(
    title="Project Orbit API",
    description="AI-powered coding arena — The Inescapable Arena",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── HELPER ─────────────────────────────────────────────────

def _find_checkpoint(checkpoint_id: str) -> dict:
    """Look up checkpoint data across all days."""
    for day_key in curriculum_data:
        for cp in curriculum_data[day_key].get("checkpoints", []):
            if cp["checkpoint_id"] == checkpoint_id:
                return cp
    return {}


# ═══════════════════════════════════════════════════════════
# ENDPOINTS — matching the architecture diagram
# ═══════════════════════════════════════════════════════════

@app.get("/health")
def health_check():
    return {"status": "ok", "project": "orbit"}


@app.get("/api/curriculum/{day_id}", response_model=CurriculumResponse)
def get_curriculum(day_id: str):
    """Serve checkpoint data to the React frontend."""
    if day_id not in curriculum_data:
        raise HTTPException(status_code=404, detail=f"Day '{day_id}' not found")
    day = curriculum_data[day_id]
    return CurriculumResponse(
        video_id=day["video_id"],
        video_title=day["video_title"],
        checkpoints=day["checkpoints"],
    )


@app.get("/api/session/{student_id}/{checkpoint_id}", response_model=SessionState)
def get_session(student_id: str, checkpoint_id: str):
    """Fetch student's current progress. Used by frontend to restore state on refresh."""
    session = db.get_session(student_id, checkpoint_id)
    return SessionState(**session)


@app.get("/api/progress/{student_id}", response_model=ProgressResponse)
def get_progress(student_id: str):
    """
    Day-unlock system: checks which days are accessible.
    Day 1 = always unlocked.
    Day N = unlocked only when ALL checkpoints of Day N-1 are COMPLETED.
    """
    day_keys = sorted(curriculum_data.keys())     # ["day_1", "day_2", "day_3"]
    days = []
    prev_day_complete = True                       # Day 1 is always unlocked

    for day_id in day_keys:
        day = curriculum_data[day_id]
        checkpoint_ids = [cp["checkpoint_id"] for cp in day["checkpoints"]]
        sessions = db.get_all_sessions(student_id, checkpoint_ids)

        completed = sum(1 for s in sessions.values() if s.get("viva_status") == "COMPLETED")
        total = len(checkpoint_ids)

        days.append(DayProgress(
            day_id=day_id,
            video_title=day["video_title"],
            is_unlocked=prev_day_complete,
            checkpoints_total=total,
            checkpoints_completed=completed,
        ))

        # Next day unlocks only if THIS day is fully complete
        prev_day_complete = (completed == total)

    return ProgressResponse(student_id=student_id, days=days)


# ─── DIAGRAM ENDPOINT: POST /submit-code ────────────────────

@app.post("/submit-code", response_model=CodeEvalResponse)
def submit_code(request: CodeSubmitRequest):
    """
    Student submits code → Strict Didi or Mentor evaluates.
    Attempt count tracked server-side (anti-cheat).
    """
    cp = _find_checkpoint(request.checkpoint_id)
    expected_concept = cp.get("expected_concept", "")
    return handle_code_submit(request, expected_concept)


# ─── DIAGRAM ENDPOINT: GET /get-viva ────────────────────────

@app.get("/get-viva/{student_id}/{checkpoint_id}", response_model=VivaStartResponse)
def get_viva(student_id: str, checkpoint_id: str, user_code: str = "", language_preference: str = "hinglish"):
    """
    After code is correct — generates a viva question and locks the session.
    If already locked, returns the stored question.
    """
    cp = _find_checkpoint(checkpoint_id)
    expected_concept = cp.get("expected_concept", "")
    return handle_get_viva(student_id, checkpoint_id, user_code, expected_concept, language_preference)


# ─── DIAGRAM ENDPOINT: POST /verify-viva ────────────────────

@app.post("/verify-viva", response_model=VivaResultResponse)
def verify_viva(request: VivaSubmitRequest):
    """
    Student submits explanation → graded by AI with Guardrails anti-cheat.
    If passed → session COMPLETED, video unlocks.
    """
    return handle_verify_viva(request)


# ─── DIAGRAM ENDPOINT: POST /ask-mentor ─────────────────────

@app.post("/ask-mentor", response_model=MentorResponse)
def ask_mentor(request: MentorQuery):
    """
    Anytime doubt clearing. Uses RAG from video transcript.
    Available at any point during the student's journey.
    """
    return handle_ask_mentor(request)


# ─── LAMBDA HANDLER ─────────────────────────────────────────
handler = Mangum(app, api_gateway_base_path="/default")

