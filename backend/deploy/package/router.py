"""
Multi-Agent Router for Project Orbit.

Matched exactly to the architecture diagram:
  POST /submit-code  →  handle_code_submit()
  GET  /get-viva     →  handle_get_viva()
  POST /verify-viva  →  handle_verify_viva()
  POST /ask-mentor   →  handle_ask_mentor()

AI Agents:
  • Strict Didi  — Attempts 1-2, tough love, Hinglish hints
  • Mentor       — Attempts 3+, empathetic, uses RAG from video transcript
  • Viva Grader  — Evaluates explanations, filtered through Guardrails

All Bedrock calls have graceful fallbacks for the 29s API Gateway timeout.
"""
import boto3
import json

from schemas import (
    CodeSubmitRequest, CodeEvalResponse,
    VivaStartResponse, VivaSubmitRequest, VivaResultResponse,
    MentorQuery, MentorResponse,
)
from config import (
    AWS_REGION, MODEL_FAST, MODEL_REASONING,
    STRICT_DIDI_MAX_ATTEMPTS, MENTOR_VIVA_THRESHOLD,
    KNOWLEDGE_BASE_ID, GUARDRAIL_ID, GUARDRAIL_VERSION,
)
import db


# ═══════════════════════════════════════════════════════════
# FALLBACK RESPONSES
# ═══════════════════════════════════════════════════════════

FALLBACK_CODE = {
    "is_correct": False,
    "feedback_text": "Arre yaar, humara AI tutor chai break pe hai ☕. Ek baar phir try karo!",
    "mermaid_diagram": None,
}

FALLBACK_VIVA = {
    "viva_passed": False,
    "feedback_text": "Oops! Humara AI abhi busy hai. Please apna answer dubara submit karo 🙏",
}


# ═══════════════════════════════════════════════════════════
# RAG — BEDROCK KNOWLEDGE BASE RETRIEVAL
# ═══════════════════════════════════════════════════════════

def retrieve_from_kb(query: str) -> str:
    """
    Query the Bedrock Knowledge Base (S3 transcripts) and return
    relevant context. Returns empty string if KB is not configured
    or retrieval fails.
    """
    if not KNOWLEDGE_BASE_ID:
        return ""

    try:
        client = boto3.client("bedrock-agent-runtime", region_name=AWS_REGION)
        response = client.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={"text": query},
            retrievalConfiguration={
                "vectorSearchConfiguration": {
                    "numberOfResults": 3,
                }
            },
        )

        # Extract text chunks from retrieval results
        chunks = []
        for result in response.get("retrievalResults", []):
            text = result.get("content", {}).get("text", "")
            if text:
                chunks.append(text)

        return "\n\n---\n\n".join(chunks) if chunks else ""

    except Exception as e:
        print(f"⚠️ Knowledge Base retrieval failed: {e}")
        return ""


# ═══════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════

def _build_strict_didi_prompt(code: str, checkpoint_id: str, expected_concept: str, lang: str, name: str = "Student") -> str:
    return f"""You are "Strict Didi" — a tough but caring elder sister who teaches coding.
You speak in {lang}. If the language is "hinglish", you must write in the Latin alphabet (English characters), NOT in Devanagari script. Mix Hindi and English words naturally, but spell everything using English letters.
The student's name is {name} — address them by name occasionally.

RULES:
- If the code is WRONG: Act like a strict compiler. Point out the exact error or missing logic in 1 short sentence (e.g., "Syntax error", or "You forgot to initialize the array"). Give ONE tiny hint, but NEVER reveal the correct code or answer. Let them struggle a bit.
- If the code is CORRECT: say exactly "Great job! That's perfectly correct." Keep it under 10 words. Do not explain anything.

CHECKPOINT: {checkpoint_id}
EXPECTED CONCEPT: {expected_concept}

STUDENT CODE:
```
{code}
```

Respond STRICTLY in this JSON format (no markdown fences, no extra text):
{{
  "is_correct": true or false,
  "feedback_text": "your strict hint in {lang}"
}}"""


def _build_mentor_prompt(code: str, checkpoint_id: str, expected_concept: str, lang: str, rag_context: str, name: str = "Student") -> str:
    context_block = ""
    if rag_context:
        context_block = f"""
VIDEO TRANSCRIPT CONTEXT (from the lecture the student is watching):
{rag_context}

Use this context to explain the concept in the way the instructor explained it.
"""

    return f"""You are an empathetic coding mentor helping a student who has been struggling.
You speak in {lang}. If the language is "hinglish", you must write in the Latin alphabet (English characters), NOT in Devanagari script. Mix Hindi and English words naturally, but spell everything using English letters.
The student's name is {name} — address them by name to be encouraging.

RULES:
- Explain what they are doing wrong in simple, encouraging terms.
- Use well-structured Markdown (headers `##`, bold text, bullet points) to make the explanation easy to read.
- Include a clean ```java code block with examples, but leave the final logic as a TODO.
- If the code is CORRECT: say exactly "Great job! That's perfectly correct." Keep it under 10 words. Do not explain anything.

CHECKPOINT: {checkpoint_id}
EXPECTED CONCEPT: {expected_concept}
{context_block}
STUDENT CODE:
```
{code}
```

Respond STRICTLY in this JSON format (no markdown fences, no extra text):
{{
  "is_correct": true or false,
  "feedback_text": "your warm, helpful explanation in {lang}"
}}"""


def _build_viva_generate_prompt(code: str, checkpoint_id: str, expected_concept: str, lang: str, name: str = "Student") -> str:
    return f"""You are a strict technical examiner. The student {name} has written correct code.
Now generate ONE sharp conceptual follow-up question to test if they truly understand what they wrote.

CHECKPOINT: {checkpoint_id}
EXPECTED CONCEPT: {expected_concept}
STUDENT CODE:
```
{code}
```

The question should test WHY the code works, not just WHAT it does (e.g., "Why did you use this approach?", "What happens if we change X?").
Ask a conceptual question that allows for multiple correct phrasings. Do NOT ask for exact definitions.
Ask in {lang}. If the language is "hinglish", you must write in the Latin alphabet (English characters), NOT in Devanagari script.

Respond STRICTLY in this JSON format (no markdown fences, no extra text):
{{
  "viva_question": "your conceptual question in {lang}"
}}"""


def _build_viva_grade_prompt(question: str, answer: str, viva_attempt: int, lang: str, name: str = "Student") -> str:
    if viva_attempt < MENTOR_VIVA_THRESHOLD:
        persona = "Evaluate fairly. Do NOT look for exact terminology. If the student demonstrates the core concept in their own words, they PASS (viva_passed: true). Only fail if the answer is completely wrong or blank."
    else:
        persona = "The student struggled previously. Be extremely lenient. If they are somewhat close, PASS them. HOWEVER, if they say 'I don't know' or their answer is completely wrong, you MUST FAIL them (viva_passed: false) and give a very clear HINT about the correct answer. Do not give them a free pass for zero effort."

    return f"""You are evaluating a student's conceptual understanding in an oral viva.
You speak in {lang}. If the language is "hinglish", you must write in the Latin alphabet (English characters), NOT in Devanagari script.
The student's name is {name}.

VIVA QUESTION: {question}
STUDENT'S ANSWER: {answer}

{persona}

Respond STRICTLY in this JSON format (no markdown fences, no extra text):
{{
  "viva_passed": true or false,
  "feedback_text": "your evaluation and guidance in {lang}"
}}"""


def _build_mentor_chat_prompt(question: str, checkpoint_id: str, lang: str, rag_context: str, name: str = "Student") -> str:
    context_block = ""
    if rag_context:
        context_block = f"""
VIDEO TRANSCRIPT CONTEXT (from the lecture):
{rag_context}

Answer using this context. Reference what the instructor said when helpful.
"""

    return f"""You are a warm, empathetic coding mentor. A student is watching a coding lecture
and has a doubt. Help them understand.

You speak in {lang}. If the language is "hinglish", you must write in the Latin alphabet (English characters), NOT in Devanagari script. Mix Hindi and English words naturally, but spell everything using English letters.

CHECKPOINT TOPIC: {checkpoint_id}
{context_block}
STUDENT'S QUESTION: {question}

RULES:
- Address the student as {name}.
- Use rich, well-structured Markdown format (headers `##`, bullet points, bold text).
- Use emojis to make the response visually neat and engaging!
- Use a real-world analogy to make the concept stick.
- Use ```java code blocks if explaining code (do NOT give final answers for assignment questions).
- Reference what the instructor explained if it relates to the video content.
- Be highly encouraging and supportive.

Respond STRICTLY in this JSON format (no markdown fences, no extra text):
{{
  "answer": "your fully markdown-formatted helpful response in {lang}",
  "sources": ["relevant excerpt 1 from transcript", "relevant excerpt 2"]
}}"""


# ═══════════════════════════════════════════════════════════
# BEDROCK CALLER
# ═══════════════════════════════════════════════════════════

def call_bedrock(prompt: str, model_id: str = MODEL_FAST, use_guardrails: bool = False) -> dict | None:
    """
    Send a prompt to Amazon Bedrock and parse JSON response.
    Optionally applies Guardrails for anti-cheat filtering.
    Returns parsed dict on success, None on failure.
    """
    try:
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)

        body_dict = {
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": 1024},
        }

        kwargs = {"modelId": model_id, "body": json.dumps(body_dict)}

        # Attach Guardrails if configured and requested
        if use_guardrails and GUARDRAIL_ID:
            kwargs["guardrailIdentifier"] = GUARDRAIL_ID
            kwargs["guardrailVersion"] = GUARDRAIL_VERSION

        response = client.invoke_model(**kwargs)
        response_body = json.loads(response["body"].read())

        # Check if Guardrail blocked the request (Amazon Nova format differs from Claude)
        stop_reason = response_body.get("stopReason")
        guardrail_action = response_body.get("amazon-bedrock-guardrailAction")
        
        if stop_reason == "guardrail_intervened" or guardrail_action == "INTERVENED":
            return {
                "viva_passed": False,
                "feedback_text": "🚫 Your answer was flagged by our anti-cheat system. Please provide a genuine explanation of the concept.",
            }

        # Amazon Nova response format
        raw_text = response_body["output"]["message"]["content"][0]["text"]

        # Strip markdown fences if model wraps JSON in ```json ... ```
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

        return json.loads(cleaned)

    except Exception as e:
        print(f"⚠️ Bedrock call failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════
# HANDLER: POST /submit-code
# ═══════════════════════════════════════════════════════════

def handle_code_submit(request: CodeSubmitRequest, expected_concept: str) -> CodeEvalResponse:
    """
    Evaluate code: increment attempt, pick Strict Didi or Mentor,
    call Bedrock (Mentor uses RAG), return evaluation.
    """
    sid = request.student_id
    cid = request.checkpoint_id

    # 1. Increment attempt server-side (anti-cheat)
    attempt = db.increment_attempt(sid, cid)

    # 2. Pick persona and build prompt
    if attempt < STRICT_DIDI_MAX_ATTEMPTS:
        persona = "strict_didi"
        prompt = _build_strict_didi_prompt(
            request.user_code, cid, expected_concept, request.language_preference, request.student_name
        )
    else:
        persona = "mentor"
        rag_context = retrieve_from_kb(f"{cid} {expected_concept}")
        prompt = _build_mentor_prompt(
            request.user_code, cid, expected_concept, request.language_preference, rag_context, request.student_name
        )

    # 3. Call Bedrock
    result = call_bedrock(prompt, MODEL_FAST)
    if result is None:
        result = FALLBACK_CODE

    return CodeEvalResponse(
        checkpoint_id=cid,
        persona_used=persona,
        attempt_count=attempt,
        is_correct=result.get("is_correct", False),
        feedback_text=result.get("feedback_text", ""),
        mermaid_diagram=result.get("mermaid_diagram"),
    )


# ═══════════════════════════════════════════════════════════
# HANDLER: GET /get-viva
# ═══════════════════════════════════════════════════════════

def handle_get_viva(student_id: str, checkpoint_id: str, user_code: str, expected_concept: str, language_preference: str = "hinglish") -> VivaStartResponse:
    """
    Generate a viva question after code is correct.
    Locks the session in DynamoDB.
    """
    # Check if already locked
    session = db.get_session(student_id, checkpoint_id)
    if session.get("viva_status") == "LOCKED" and session.get("viva_question"):
        return VivaStartResponse(
            checkpoint_id=checkpoint_id,
            viva_question=session["viva_question"],
            viva_status="LOCKED",
        )

    # Generate viva question via Bedrock
    prompt = _build_viva_generate_prompt(user_code, checkpoint_id, expected_concept, language_preference, "Student")
    result = call_bedrock(prompt, MODEL_FAST)

    if result is None or "viva_question" not in result:
        viva_q = "Explain why your code works. What is the core concept behind your solution?"
    else:
        viva_q = result["viva_question"]

    # Lock viva in DynamoDB
    db.lock_viva(student_id, checkpoint_id, viva_q)

    return VivaStartResponse(
        checkpoint_id=checkpoint_id,
        viva_question=viva_q,
        viva_status="LOCKED",
    )


# ═══════════════════════════════════════════════════════════
# HANDLER: POST /verify-viva
# ═══════════════════════════════════════════════════════════

def handle_verify_viva(request: VivaSubmitRequest) -> VivaResultResponse:
    """
    Grade the student's viva explanation.
    Every attempt goes through Bedrock AI for fair evaluation.
    """
    sid = request.student_id
    cid = request.checkpoint_id

    # 1. Increment viva attempt
    viva_attempt = db.increment_viva_attempt(sid, cid)

    # 2. Get stored viva question
    session = db.get_session(sid, cid)
    viva_question = session.get("viva_question", "")

    # 3. Pick persona based on attempt count
    persona = "strict_didi" if viva_attempt < MENTOR_VIVA_THRESHOLD else "mentor"

    # 4. Call Bedrock to evaluate the student's answer
    #    The prompt already has built-in leniency for higher attempts
    prompt = _build_viva_grade_prompt(
        viva_question, request.transcribed_text, viva_attempt, request.language_preference, request.student_name
    )
    result = call_bedrock(prompt, MODEL_REASONING, use_guardrails=False)
    if result is None:
        result = FALLBACK_VIVA

    # 5. If viva passed → complete session
    viva_passed = result.get("viva_passed", False)
    if viva_passed:
        db.complete_session(sid, cid)

    return VivaResultResponse(
        checkpoint_id=cid,
        persona_used=persona,
        viva_passed=viva_passed,
        feedback_text=result.get("feedback_text", ""),
        video_can_resume=viva_passed,
    )


# ═══════════════════════════════════════════════════════════
# HANDLER: POST /ask-mentor
# ═══════════════════════════════════════════════════════════

def handle_ask_mentor(request: MentorQuery) -> MentorResponse:
    """
    Anytime doubt clearing via RAG.
    Retrieves relevant transcript context and answers the question.
    """
    # 1. RAG: retrieve context from Knowledge Base
    rag_context = retrieve_from_kb(request.question)

    # 2. Build prompt with context
    prompt = _build_mentor_chat_prompt(
        request.question, request.checkpoint_id, request.language_preference, rag_context, request.student_name
    )

    # 3. Call Bedrock
    result = call_bedrock(prompt, MODEL_FAST)
    if result is None:
        return MentorResponse(
            answer="Maaf karo yaar, abhi mentor available nahi hai. Thodi der baad try karo! 🙏",
            sources=[],
        )

    return MentorResponse(
        answer=result.get("answer", ""),
        sources=result.get("sources", []),
    )
