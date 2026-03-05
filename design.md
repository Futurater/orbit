# Project Orbit — System Architecture Design
> **AWS Hackathon | Builder 3 — Lead Backend & AI Engineer**
> *Last updated: 2026-02-26*

---

## Part 1: System A — Simplified Ingestion Pipeline

> ⚠️ **PIVOT:** FAISS, LangChain, and Amazon Titan Embeddings have been scrapped.
> Shradha Didi's Arrays video (`NTHVTY6w2Co`) is ~26 min (~4,000 words) — fits entirely
> inside Claude 3 Haiku's 200K token context window. Full transcript → Claude in one shot.

**Script:** `backend/scripts/ingest_video.py` (runs once offline per video)

```
Step 1: fetch_transcript(video_id)
        └── Uses youtube-transcript-api v1.x
        └── Auto-detects language (Hindi, English, etc.)
        └── Returns: list[{text, start}]

Step 2: format_for_claude(transcript_list)
        └── Converts to: "[150s]: Welcome to Arrays..."
        └── Returns: one big formatted string

Step 3: generate_checkpoints(formatted_text)
        └── Sends full string to AWS Bedrock (Claude 3 Haiku) via boto3
        └── Prompt: find 3 concepts, return strict JSON array
        └── Keys: checkpoint_id, timestamp_seconds, topic,
                  context_summary, starter_code, expected_concept
        └── Returns: list[dict]

Step 4: save_curriculum(checkpoints, day_id)
        └── Writes to curriculum.json under the given day_id key
```

---

## Part 2: System B — Live Evaluation API

**Base URL:** `http://localhost:8000`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Health check |
| `GET` | `/api/curriculum/{day_id}` | Serve checkpoints to React |
| `POST` | `/api/submit` | Unified code + viva evaluation |

---

## Part 3: Multi-Agent Routing Logic

**Config constants in `router.py` (easy to tune):**
```python
MENTOR_CODE_THRESHOLD = 3   # attempt >= 3 → Mentor helps with code
MENTOR_VIVA_THRESHOLD = 2   # viva_attempt >= 2 → Mentor helps with viva
```

| Condition | Persona | Output |
|---|---|---|
| Code wrong, attempt < 3 | 🎯 The Interrogator | Strict feedback, text only |
| Code wrong, attempt ≥ 3 | 🧑‍🏫 The Mentor | Empathetic + Mermaid diagram |
| Code correct (any attempt) | 🎯 The Interrogator | Generates Viva question |
| Viva fail, viva_attempt < 2 | 🎯 The Interrogator | Gives a hint |
| Viva fail, viva_attempt ≥ 2 | 🧑‍🏫 The Mentor | Full explanation |
| Viva passed | ✅ | `video_can_resume: true` |

---

## Part 4: Pydantic Schemas

### `SubmitRequest` (Frontend → Backend)
```python
checkpoint_id: str
submission_type: str        # "code" | "viva"
attempt_count: int
viva_attempt_count: int = 0
language_preference: str    # "english" | "hindi" | "hinglish"
user_code: str | None = None
transcribed_text: str | None = None
viva_question: str | None = None
```

### `EvaluationResponse` (Backend → Frontend)
```python
checkpoint_id: str
submission_type: str
persona_used: str
is_correct: bool | None = None
feedback_text: str
mermaid_diagram: str | None = None
viva_question: str | None = None
viva_passed: bool | None = None
video_can_resume: bool = False
```

### `Checkpoint` (inside curriculum.json)
```python
checkpoint_id: str
timestamp_seconds: int
topic: str
context_summary: str
starter_code: str
expected_concept: str       # Hidden from user — used by Claude to evaluate
```

---

## Part 5: Build Order

- [x] Project structure + `requirements.txt`
- [x] `schemas.py` — all 4 Pydantic models
- [x] `main.py` — FastAPI skeleton + `/health` + `/api/curriculum/{day_id}`
- [/] `scripts/ingest_video.py` — 3-step ingestion
- [ ] `router.py` — persona routing + Bedrock calls
- [ ] `POST /api/submit` in `main.py`
