from pydantic import BaseModel


# ─── REQUEST MODELS ─────────────────────────────────────────

class CodeSubmitRequest(BaseModel):
    """POST /submit-code — Student submits code for evaluation."""
    student_id: str
    student_name: str = "Student"           # For personalized AI greetings
    checkpoint_id: str
    language_preference: str                # "english" | "hindi" | "hinglish"
    user_code: str


class VivaSubmitRequest(BaseModel):
    """POST /verify-viva — Student submits explanation for viva grading."""
    student_id: str
    student_name: str = "Student"
    checkpoint_id: str
    language_preference: str
    transcribed_text: str


class MentorQuery(BaseModel):
    """POST /ask-mentor — Student asks a doubt (anytime)."""
    student_id: str
    student_name: str = "Student"
    checkpoint_id: str
    question: str
    language_preference: str


# ─── RESPONSE MODELS ────────────────────────────────────────

class CodeEvalResponse(BaseModel):
    """Response from POST /submit-code."""
    checkpoint_id: str
    persona_used: str                       # "strict_didi" | "mentor"
    attempt_count: int
    is_correct: bool
    feedback_text: str
    mermaid_diagram: str | None = None


class VivaStartResponse(BaseModel):
    """Response from GET /get-viva — returns the viva question."""
    checkpoint_id: str
    viva_question: str
    viva_status: str                        # "LOCKED"


class VivaResultResponse(BaseModel):
    """Response from POST /verify-viva."""
    checkpoint_id: str
    persona_used: str
    viva_passed: bool
    feedback_text: str
    video_can_resume: bool


class MentorResponse(BaseModel):
    """Response from POST /ask-mentor."""
    answer: str
    sources: list[str] = []                 # RAG source excerpts


class SessionState(BaseModel):
    """Response from GET /api/session — for frontend state recovery."""
    student_id: str
    checkpoint_id: str
    attempt_count: int = 0
    viva_attempt_count: int = 0
    viva_status: str = "NOT_STARTED"        # NOT_STARTED | LOCKED | COMPLETED
    viva_question: str | None = None


# ─── CURRICULUM MODELS ──────────────────────────────────────

class Checkpoint(BaseModel):
    checkpoint_id: str
    timestamp_seconds: int
    topic: str
    context_summary: str
    starter_code: str
    expected_concept: str                   # Hidden from student — used by AI


class CurriculumResponse(BaseModel):
    video_id: str
    video_title: str
    checkpoints: list[Checkpoint]


# ─── PROGRESS MODELS ────────────────────────────────────────

class DayProgress(BaseModel):
    day_id: str
    video_title: str
    is_unlocked: bool
    checkpoints_total: int
    checkpoints_completed: int


class ProgressResponse(BaseModel):
    student_id: str
    days: list[DayProgress]

