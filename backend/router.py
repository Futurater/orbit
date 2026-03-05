import boto3
import json
from dotenv import load_dotenv
from schemas import SubmitRequest, EvaluationResponse

load_dotenv()

# ─── CONFIG — change these anytime ───────────────────────────
MODEL_ID = "amazon.nova-lite-v1:0"   # swap to any Bedrock model ID
MENTOR_CODE_THRESHOLD = 3            # attempt >= 3 → Mentor helps with code
MENTOR_VIVA_THRESHOLD = 2            # viva_attempt >= 2 → Mentor helps with viva
USE_MOCK = True                      # Set to False when AWS access is ready
# ─────────────────────────────────────────────────────────────


# ─── MOCK RESPONSES ──────────────────────────────────────────
MOCK_RESPONSES = {
    "interrogator_wrong": {
        "is_correct": False,
        "feedback_text": "Your logic is incorrect. Think about what happens at the array boundary. What is the value of i when the loop ends?",
        "viva_question": None
    },
    "mentor_wrong": {
        "is_correct": False,
        "feedback_text": "Let me help you visualize this. An array index starts at 0 and goes up to length-1. Your loop condition needs to respect this boundary.",
        "mermaid_diagram": "graph TD\n  A[Start: i=0] --> B{i < arr.length?}\n  B -->|Yes| C[Process arr-i]\n  C --> D[i++]\n  D --> B\n  B -->|No| E[End]",
        "viva_question": None
    },
    "correct": {
        "is_correct": True,
        "feedback_text": "Correct! Your solution handles the edge cases properly. Now let's test your understanding.",
        "viva_question": "Why does an array index start at 0 instead of 1 in Java?"
    },
    "viva_fail": {
        "viva_passed": False,
        "feedback_text": "Not quite. Think about how memory addressing works — the index is an offset from the base address."
    },
    "viva_pass": {
        "viva_passed": True,
        "feedback_text": "Excellent explanation! You clearly understand the concept. The zero-based indexing relates to memory offset from the base pointer."
    }
}
# ─────────────────────────────────────────────────────────────


def _build_interrogator_prompt(request: SubmitRequest, expected_concept: str) -> str:
    return f"""You are a strict Amazon technical interviewer conducting a live coding assessment.
The student is learning Java DSA and has submitted code for the following topic: {request.checkpoint_id}.

EXPECTED CONCEPT: {expected_concept}

STUDENT CODE:
{request.user_code}

LANGUAGE PREFERENCE: {request.language_preference}

Evaluate the student's code. Be strict and professional.
- If the code is WRONG: explain exactly what is wrong. Do NOT give the answer. Push them to think.
- If the code is CORRECT: say so clearly, then ask ONE sharp logical follow-up viva question.

Respond STRICTLY in this JSON format (no markdown, no extra text):
{{
  "is_correct": true or false,
  "feedback_text": "your evaluation here in {request.language_preference}",
  "viva_question": "your follow-up question if correct, else null"
}}"""


def _build_mentor_prompt(request: SubmitRequest, expected_concept: str) -> str:
    return f"""You are a warm, empathetic coding mentor helping a struggling student.
The student has attempted this Java DSA problem multiple times: {request.checkpoint_id}.

EXPECTED CONCEPT: {expected_concept}

STUDENT CODE:
{request.user_code}

LANGUAGE PREFERENCE: {request.language_preference}

Evaluate the code with empathy. Guide them, do not just give the answer.
- Explain what they are doing wrong in simple terms.
- Provide a Mermaid.js flowchart diagram that visualizes the correct algorithm.
- End with an encouraging message.

Respond STRICTLY in this JSON format (no markdown, no extra text):
{{
  "is_correct": true or false,
  "feedback_text": "your warm, helpful explanation in {request.language_preference}",
  "mermaid_diagram": "graph TD\\n  A[Start] --> B[Your diagram here]",
  "viva_question": "your follow-up question if correct, else null"
}}"""


def _build_viva_prompt(request: SubmitRequest) -> str:
    persona = "strict interviewer" if request.viva_attempt_count < MENTOR_VIVA_THRESHOLD else "empathetic mentor"
    return f"""You are a {persona} conducting an oral viva assessment.

VIVA QUESTION ASKED: {request.viva_question}
STUDENT'S SPOKEN ANSWER: {request.transcribed_text}
LANGUAGE PREFERENCE: {request.language_preference}

Evaluate whether the student genuinely understands the concept.
{"Be strict. A vague or incomplete answer fails." if request.viva_attempt_count < MENTOR_VIVA_THRESHOLD else "Be supportive. If they show partial understanding, guide them to the full answer."}

Respond STRICTLY in this JSON format (no markdown, no extra text):
{{
  "viva_passed": true or false,
  "feedback_text": "your evaluation here in {request.language_preference}"
}}"""


def call_bedrock(prompt: str) -> dict:
    """Sends a prompt to Bedrock and returns parsed JSON response."""
    try:
        client = boto3.client("bedrock-runtime", region_name="us-east-1")

        body = json.dumps({
            "messages": [{"role": "user", "content": prompt}],
            "inferenceConfig": {"max_new_tokens": 1024}
        })

        response = client.invoke_model(modelId=MODEL_ID, body=body)
        response_body = json.loads(response["body"].read())

        # Amazon Nova response format
        raw_text = response_body["output"]["message"]["content"][0]["text"]
        return json.loads(raw_text)

    except Exception as e:
        print(f"⚠️ Bedrock call failed: {e}")
        return {"error": str(e)}


def _mock_code_response(request: SubmitRequest) -> dict:
    """Returns mock response based on attempt_count."""
    if request.attempt_count < MENTOR_CODE_THRESHOLD:
        return MOCK_RESPONSES["interrogator_wrong"]
    elif request.attempt_count == MENTOR_CODE_THRESHOLD:
        return MOCK_RESPONSES["mentor_wrong"]
    else:
        return MOCK_RESPONSES["correct"]


def _mock_viva_response(request: SubmitRequest) -> dict:
    """Returns mock viva response based on viva_attempt_count."""
    if request.viva_attempt_count < MENTOR_VIVA_THRESHOLD:
        return MOCK_RESPONSES["viva_fail"]
    else:
        return MOCK_RESPONSES["viva_pass"]


def route_request(request: SubmitRequest, expected_concept: str = "") -> EvaluationResponse:
    """Main router — picks persona, builds prompt, calls Bedrock (or mock), returns EvaluationResponse."""

    # VIVA PHASE
    if request.submission_type == "viva":
        if USE_MOCK:
            result = _mock_viva_response(request)
        else:
            prompt = _build_viva_prompt(request)
            result = call_bedrock(prompt)

        persona = "interrogator" if request.viva_attempt_count < MENTOR_VIVA_THRESHOLD else "mentor"
        return EvaluationResponse(
            checkpoint_id=request.checkpoint_id,
            submission_type="viva",
            persona_used=persona,
            feedback_text=result["feedback_text"],
            viva_passed=result["viva_passed"],
            video_can_resume=result["viva_passed"]
        )

    # CODE PHASE — pick persona based on attempt count
    if request.attempt_count < MENTOR_CODE_THRESHOLD:
        persona = "interrogator"
    else:
        persona = "mentor"

    if USE_MOCK:
        result = _mock_code_response(request)
    else:
        if persona == "interrogator":
            prompt = _build_interrogator_prompt(request, expected_concept)
        else:
            prompt = _build_mentor_prompt(request, expected_concept)
        result = call_bedrock(prompt)

    return EvaluationResponse(
        checkpoint_id=request.checkpoint_id,
        submission_type="code",
        persona_used=persona,
        is_correct=result.get("is_correct"),
        feedback_text=result["feedback_text"],
        mermaid_diagram=result.get("mermaid_diagram"),
        viva_question=result.get("viva_question")
    )
