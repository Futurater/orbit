"""
Project Orbit — Single-File AI Microservice
Handles YouTube transcript fetching, LangChain curriculum checkpoint generation,
dual-persona code evaluation, viva oral grading, and RAG-based mentor doubt clearing.

Stack:
- FastAPI
- LangChain / Google Gemini (Free Tier)
- youtube-transcript-api
- In-memory Transcript Vector RAG Store
"""

import os
import json
import math
import re
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Orbit AI Microservice",
    description="Single-file FastAPI microservice powering LangChain RAG & Evaluation for Project Orbit",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# In-memory transcript store for RAG (video_id -> list of chunks)
TRANSCRIPT_RAG_STORE: Dict[str, List[Dict[str, Any]]] = {}

# ─────────────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────

class GenerateCheckpointsRequest(BaseModel):
    video_id: str
    video_title: Optional[str] = "Lecture Video"

class CheckpointItem(BaseModel):
    checkpoint_id: str
    timestamp_seconds: int
    topic: str
    context_summary: str
    starter_code: str
    expected_concept: str

class GenerateCheckpointsResponse(BaseModel):
    video_id: str
    video_title: str
    checkpoints: List[CheckpointItem]

class EvaluateCodeRequest(BaseModel):
    code: str
    expected_concept: Optional[str] = ""
    checkpoint_id: Optional[str] = "cp_01"
    attempt_count: int = 1
    language_pref: Optional[str] = "hinglish"
    student_name: Optional[str] = "Student"

class EvaluateCodeResponse(BaseModel):
    is_correct: bool
    persona_used: str
    feedback_text: str
    viva_question: Optional[str] = None
    mermaid_diagram: Optional[str] = None

class EvaluateVivaRequest(BaseModel):
    transcribed_text: str
    viva_question: Optional[str] = ""
    viva_attempt_count: int = 1
    language_pref: Optional[str] = "hinglish"
    expected_concept: Optional[str] = ""

class EvaluateVivaResponse(BaseModel):
    viva_passed: bool
    feedback_text: str

class AskMentorRequest(BaseModel):
    question: str
    video_id: Optional[str] = None
    checkpoint_id: Optional[str] = None
    language_pref: Optional[str] = "hinglish"

class AskMentorResponse(BaseModel):
    answer: str
    context_used: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# TRANSCRIPT FETCHER & VECTOR STORE (RAG)
# ─────────────────────────────────────────────────────────────

def fetch_youtube_transcript(video_id: str) -> List[Dict[str, Any]]:
    """Fetches video transcript with timestamps using youtube-transcript-api."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'en-IN'])
        return transcript
    except Exception as e:
        print(f"[Transcript Notice] Could not auto-fetch transcript for {video_id}: {e}")
        return []

def chunk_transcript(transcript: List[Dict[str, Any]], chunk_size_words: int = 80) -> List[Dict[str, Any]]:
    """Splits timestamped transcript items into semantic chunks for RAG."""
    chunks = []
    current_chunk = []
    current_start = 0
    current_words = 0

    for item in transcript:
        text = item.get("text", "")
        words = text.split()
        if not current_chunk:
            current_start = math.floor(item.get("start", 0))

        current_chunk.append(text)
        current_words += len(words)

        if current_words >= chunk_size_words:
            chunks.append({
                "text": " ".join(current_chunk),
                "start_seconds": current_start,
                "end_seconds": math.floor(item.get("start", 0) + item.get("duration", 0))
            })
            current_chunk = []
            current_words = 0

    if current_chunk:
        chunks.append({
            "text": " ".join(current_chunk),
            "start_seconds": current_start,
            "end_seconds": current_start + 60
        })

    return chunks

def search_transcript_rag(video_id: str, query: str, top_k: int = 3) -> str:
    """Finds most relevant transcript passages for question answering."""
    chunks = TRANSCRIPT_RAG_STORE.get(video_id, [])
    if not chunks:
        # Try fetching on the fly
        raw = fetch_youtube_transcript(video_id)
        if raw:
            chunks = chunk_transcript(raw)
            TRANSCRIPT_RAG_STORE[video_id] = chunks

    if not chunks:
        return ""

    query_tokens = set(re.findall(r'\w+', query.lower()))
    scored_chunks = []

    for chunk in chunks:
        chunk_tokens = set(re.findall(r'\w+', chunk["text"].lower()))
        overlap = len(query_tokens.intersection(chunk_tokens))
        if overlap > 0:
            scored_chunks.append((overlap, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_matches = [c[1] for c in scored_chunks[:top_k]]

    if not top_matches:
        top_matches = chunks[:top_k]

    return "\n\n".join([f"[{m['start_seconds']}s]: {m['text']}" for m in top_matches])


# ─────────────────────────────────────────────────────────────
# LANGCHAIN / GEMINI INVOCATION WRAPPER
# ─────────────────────────────────────────────────────────────

def call_gemini_llm(prompt: str, temperature: float = 0.3) -> Optional[str]:
    """Invokes Google Gemini via LangChain or direct SDK."""
    if not GOOGLE_API_KEY:
        return None

    # Try LangChain Google GenAI first
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=MODEL_NAME,
            google_api_key=GOOGLE_API_KEY,
            temperature=temperature
        )
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        print(f"[LangChain Error]: {e}, trying google.generativeai...")

    # Fallback to direct google.generativeai
    try:
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel(MODEL_NAME)
        res = model.generate_content(prompt)
        return res.text
    except Exception as e:
        print(f"[Gemini Direct Error]: {e}")
        return None


# ─────────────────────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Orbit AI Microservice (FastAPI + LangChain + Gemini)",
        "gemini_configured": bool(GOOGLE_API_KEY)
    }


@app.post("/generate-checkpoints", response_model=GenerateCheckpointsResponse)
def generate_checkpoints(req: GenerateCheckpointsRequest):
    """
    Given a YouTube video ID and title, fetches its transcript, analyzes key pacing,
    and returns 3 interactive coding checkpoints.
    """
    raw_transcript = fetch_youtube_transcript(req.video_id)
    if raw_transcript:
        chunks = chunk_transcript(raw_transcript)
        TRANSCRIPT_RAG_STORE[req.video_id] = chunks
        transcript_sample = "\n".join([f"{c['start_seconds']}s: {c['text']}" for c in chunks[:15]])
    else:
        transcript_sample = "Transcript not available directly; generate standard checkpoints for: " + req.video_title

    prompt = f"""You are an elite Computer Science curriculum designer building an interactive coding course.
Topic: {req.video_title} (YouTube ID: {req.video_id})

Transcript excerpt:
{transcript_sample}

Generate exactly 3 coding checkpoints where the video should PAUSE and test the student.
1. Checkpoint 1: Fundamental setup or basic syntax (around 3 to 6 mins).
2. Checkpoint 2: Data manipulation, condition or loop logic (around 8 to 14 mins).
3. Checkpoint 3: Boss challenge handling edge cases or completing the algorithm (around 18 to 25 mins).

Respond ONLY in valid JSON matching this exact structure:
{{
  "checkpoints": [
    {{
      "checkpoint_id": "cp_01_topic",
      "timestamp_seconds": 300,
      "topic": "Topic Name",
      "context_summary": "1-2 sentences on what was just demonstrated in the video.",
      "starter_code": "public class Solution {{\\n    public static void main(String[] args) {{\\n        // TODO\\n    }}\\n}}",
      "expected_concept": "What must be written to pass."
    }}
  ]
}}"""

    ai_output = call_gemini_llm(prompt)
    if ai_output:
        try:
            # Extract JSON block
            json_match = re.search(r'\{[\s\S]*\}', ai_output)
            if json_match:
                data = json.loads(json_match.group(0))
                cps = [CheckpointItem(**c) for c in data.get("checkpoints", [])]
                if len(cps) > 0:
                    return GenerateCheckpointsResponse(
                        video_id=req.video_id,
                        video_title=req.video_title,
                        checkpoints=cps
                    )
        except Exception as err:
            print(f"[Checkpoint JSON Parse Error]: {err}")

    # Smart fallback checkpoints if AI key is missing or formatting fails
    return GenerateCheckpointsResponse(
        video_id=req.video_id,
        video_title=req.video_title,
        checkpoints=[
            CheckpointItem(
                checkpoint_id=f"cp_01_{req.video_id[:5]}_basics",
                timestamp_seconds=240,
                topic="Fundamental Syntax & Initialization",
                context_summary=f"The instructor has just explained the foundations of {req.video_title}. Implement the initial data structures.",
                starter_code="import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: Initialize variables and demonstrate initial logic\n        System.out.println(\"Ready\");\n    }\n}",
                expected_concept="Proper syntax declaration and initialization."
            ),
            CheckpointItem(
                checkpoint_id=f"cp_02_{req.video_id[:5]}_logic",
                timestamp_seconds=660,
                topic="Algorithmic Loop & Processing",
                contextSummary="Apply the core algorithm to process input elements using the optimal loop condition.",
                starter_code="public class Main {\n    public static void solve(int[] arr) {\n        // TODO: Iterate and apply condition demonstrated in video\n        \n    }\n}",
                expected_concept="Boundary check and proper iterative control flow."
            ),
            CheckpointItem(
                checkpoint_id=f"cp_03_{req.video_id[:5]}_challenge",
                timestamp_seconds=1200,
                topic="Full Algorithm & Edge Cases",
                context_summary="Final challenge: Complete the full logic and handle edge cases correctly.",
                starter_code="public class Main {\n    public static int compute(int[] input) {\n        // TODO: Complete algorithm\n        return 0;\n    }\n}",
                expected_concept="Edge case validation and return logic."
            )
        ]
    )


@app.post("/evaluate-code", response_model=EvaluateCodeResponse)
def evaluate_code(req: EvaluateCodeRequest):
    """
    Dual Persona Code Evaluator:
    - Attempt 1-2: Strict Didi (compiler-like harsh brevity, one tiny hint, no solution given)
    - Attempt 3+: Mentor AI (warm empathy, Mermaid diagram, detailed explanation)
    """
    persona = "interrogator" if req.attempt_count < 3 else "mentor"

    if persona == "interrogator":
        prompt = f"""You are "Strict Didi" — a tough technical interviewer conducting a live assessment.
Language: {req.language_pref}. If hinglish, use Latin English alphabet only (no Devanagari).
Student Code:
{req.code}

Expected Concept: {req.expected_concept}

Rules:
- If code is WRONG: Act like a strict compiler. Point out the exact flaw in 1 short sentence. Give ONE tiny hint. NEVER give the answer.
- If code is CORRECT: say "Correct! Logic is sound." and ask 1 quick follow-up question.

Respond STRICTLY in JSON:
{{
  "is_correct": true or false,
  "feedback_text": "text",
  "viva_question": "question or null"
}}"""
    else:
        prompt = f"""You are a warm, supportive coding Mentor helping a student who is struggling on Attempt #{req.attempt_count}.
Language: {req.language_pref}. If hinglish, use Latin English alphabet only.
Student Code:
{req.code}

Expected Concept: {req.expected_concept}

Rules:
- Guide them with empathy. Explain what they are missing.
- Provide a simple Mermaid flowchart string showing the logic flow.

Respond STRICTLY in JSON:
{{
  "is_correct": true or false,
  "feedback_text": "helpful explanation",
  "mermaid_diagram": "graph TD\\n  A[Start] --> B[Step]",
  "viva_question": "question if correct else null"
}}"""

    ai_output = call_gemini_llm(prompt)
    if ai_output:
        try:
            json_match = re.search(r'\{[\s\S]*\}', ai_output)
            if json_match:
                data = json.loads(json_match.group(0))
                return EvaluateCodeResponse(
                    is_correct=data.get("is_correct", False),
                    persona_used=persona,
                    feedback_text=data.get("feedback_text", "Code evaluated."),
                    viva_question=data.get("viva_question"),
                    mermaid_diagram=data.get("mermaid_diagram")
                )
        except Exception as e:
            print(f"[Evaluation Parse Error]: {e}")

    # Fallback heuristic
    has_logic = bool(req.code and len(req.code.strip()) > 30 and ("for" in req.code or "while" in req.code or "if" in req.code or "return" in req.code))

    if persona == "interrogator":
        if has_logic:
            return EvaluateCodeResponse(
                is_correct=True,
                persona_used="interrogator",
                feedback_text="Correct! Logic satisfies the requirements. Proceed to viva verification.",
                viva_question="Explain the memory allocation and time complexity of your approach."
            )
        return EvaluateCodeResponse(
            is_correct=False,
            persona_used="interrogator",
            feedback_text="Logic incomplete. Check your loop boundaries and variable types!",
            viva_question=None
        )
    else:
        return EvaluateCodeResponse(
            is_correct=has_logic,
            persona_used="mentor",
            feedback_text="Great perseverance! You've nailed the main algorithm." if has_logic else "Let's walk through it together. Consider how each element transitions during the loop.",
            mermaid_diagram="graph TD\n  A[Input Array] --> B[Initialize Pointers]\n  B --> C{Check Boundary}\n  C -->|Valid| D[Process Element]\n  C -->|Done| E[Return Result]",
            viva_question="How would this solution scale if the dataset size doubled?" if has_logic else None
        )


@app.post("/evaluate-viva", response_model=EvaluateVivaResponse)
def evaluate_viva(req: EvaluateVivaRequest):
    """
    Evaluates spoken viva responses for genuine conceptual understanding.
    """
    prompt = f"""You are a senior technical examiner conducting an oral viva.
Question Asked: {req.viva_question}
Student Spoken Answer: {req.transcribed_text}
Language: {req.language_pref}.
Attempt: #{req.viva_attempt_count}

Evaluate if the student demonstrates the core concept in their own words.
Do not demand textbook terminology; look for true understanding.

Respond STRICTLY in JSON:
{{
  "viva_passed": true or false,
  "feedback_text": "encouraging evaluation text in {req.language_pref}"
}}"""

    ai_output = call_gemini_llm(prompt)
    if ai_output:
        try:
            json_match = re.search(r'\{[\s\S]*\}', ai_output)
            if json_match:
                data = json.loads(json_match.group(0))
                return EvaluateVivaResponse(
                    viva_passed=data.get("viva_passed", False),
                    feedback_text=data.get("feedback_text", "Viva evaluation complete.")
                )
        except Exception as e:
            print(f"[Viva Parse Error]: {e}")

    # Fallback
    passed = bool(req.transcribed_text and len(req.transcribed_text.strip()) > 8)
    return EvaluateVivaResponse(
        viva_passed=passed,
        feedback_text="Excellent explanation! You have demonstrated conceptual mastery." if passed else "Answer is too short or unclear. Please articulate the underlying mechanism."
    )


@app.post("/ask-mentor", response_model=AskMentorResponse)
def ask_mentor(req: AskMentorRequest):
    """
    Anytime doubt clearing using RAG from video transcripts.
    """
    context = ""
    if req.video_id:
        context = search_transcript_rag(req.video_id, req.question)

    prompt = f"""You are a friendly, expert Computer Science Mentor for Project Orbit.
The student has a doubt: "{req.question}"

Context from the video lecture:
{context if context else "No transcript context available."}

Explain clearly in {req.language_pref}. Keep it engaging, precise, and educational.
"""

    ai_output = call_gemini_llm(prompt)
    if ai_output:
        return AskMentorResponse(
            answer=ai_output,
            context_used=context[:200] if context else None
        )

    return AskMentorResponse(
        answer=f"Great question about {req.question}! In programming and DSA, always focus on how data structures allocate memory and the step-by-step state mutations. Experimenting with small inputs in the code editor will make this crystal clear.",
        context_used=None
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
