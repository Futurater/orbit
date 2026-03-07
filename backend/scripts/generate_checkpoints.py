"""
Orbit Curriculum Generator — Automated AI Pipeline
Reads video transcripts (from S3 or local .txt files) and uses Amazon Bedrock
Nova Pro to generate perfectly-timed, non-abrupt coding checkpoints.

Usage:
    python scripts/generate_checkpoints.py
"""
import sys, os, json, glob
import boto3
from dotenv import load_dotenv

load_dotenv()

client = boto3.client("bedrock-runtime", region_name="us-east-1")

PROMPT = """You are an expert Java DSA curriculum designer building an interactive learning platform.

Given the following YouTube video transcript of a Java programming lecture, generate exactly 3 interactive coding checkpoints.

A checkpoint is a moment where the video PAUSES and the student must write code to prove they understood what was just taught.

CRITICAL RULES FOR TIMESTAMP PLACEMENT:
1. NEVER place a checkpoint in the middle of a sentence. Only place it AFTER the instructor finishes explaining a concept and takes a natural pause.
2. Add 2-3 extra seconds AFTER the instructor's last word so the transition feels smooth and not abrupt.
3. Space checkpoints evenly across the video so students code every 7-12 minutes.
4. Place checkpoints at CRITICAL conceptual turning points — moments where a new skill is introduced that builds on the previous one.

CHECKPOINT DESIGN RULES:
1. Checkpoint 1 (Early): Test the foundational syntax or basic concept. Build student confidence.
2. Checkpoint 2 (Middle): Test data manipulation or applying the concept with logic (e.g., loops, conditions).
3. Checkpoint 3 (Late — Boss Battle): Test a real algorithm or multi-step problem that combines everything taught.

STARTER CODE RULES:
- Must be complete, compilable Java with `public class Main` and `public static void main(String[] args)`.
- Include `import java.util.*;` at the top.
- Place a single clear `// TODO:` comment where the student writes their code.
- Provide enough scaffolding so the student focuses only on the key concept.

OUTPUT FORMAT:
Return strictly valid JSON matching this exact schema. No markdown fences, no extra text outside the JSON.
{
    "video_title": "Title of the lecture",
    "checkpoints": [
        {
            "checkpoint_id": "cp_XX_short_topic_name",
            "timestamp_seconds": 120,
            "topic": "Short Topic Title",
            "context_summary": "What the instructor just explained before this checkpoint, in 1-2 sentences.",
            "starter_code": "import java.util.*;\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        // TODO: ...\\n    }\\n}",
            "expected_concept": "What the student needs to write to pass, described clearly."
        }
    ]
}

TRANSCRIPT:
"""

# Map of day_id -> (video_id, transcript filename pattern)
DAYS = {
    "day_1": ("NTHVTY6w2Co", "day_1_*"),
    "day_2": ("oAja8-Ulz6o", "day_2_*"),
    "day_3": ("7m1DMYAbdiY", "day_3_*"),
}


def find_transcript(pattern: str) -> str:
    """Find and read a transcript file matching the given pattern."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    matches = glob.glob(os.path.join(script_dir, pattern))
    txt_matches = [m for m in matches if m.endswith(".txt")]
    if not txt_matches:
        raise FileNotFoundError(f"No transcript file found matching '{pattern}' in {script_dir}")
    with open(txt_matches[0], "r", encoding="utf-8") as f:
        return f.read()


def generate_checkpoints(day_id: str, video_id: str, transcript: str) -> dict:
    """Send transcript to Bedrock Nova Pro and get back 3 clean checkpoints."""
    prompt = PROMPT + transcript

    body = json.dumps({
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {"maxTokens": 4096},
    })

    print(f"  Calling Amazon Bedrock Nova Pro for {day_id} ({video_id})...")
    resp = client.invoke_model(modelId="us.amazon.nova-pro-v1:0", body=body)
    raw = json.loads(resp["body"].read())
    text = raw["output"]["message"]["content"][0]["text"]

    # Strip markdown fences if the model adds them
    if text.strip().startswith("```"):
        text = text.strip().split("\n", 1)[1]
    if text.strip().endswith("```"):
        text = text.strip().rsplit("```", 1)[0]

    result = json.loads(text.strip())

    # Inject the video_id into the result
    result["video_id"] = video_id
    return result


def main():
    print("=" * 60)
    print("  Orbit AI Curriculum Pipeline")
    print("  Generating 3 smooth checkpoints per video via Bedrock")
    print("=" * 60)

    curriculum = {}

    for day_id, (video_id, pattern) in DAYS.items():
        print(f"\n[{day_id}] Reading transcript...")
        try:
            transcript = find_transcript(pattern)
        except FileNotFoundError as e:
            print(f"  SKIPPED: {e}")
            continue

        result = generate_checkpoints(day_id, video_id, transcript)
        curriculum[day_id] = result
        print(f"  ✅ Generated {len(result.get('checkpoints', []))} checkpoints for {day_id}")

    # Write the final merged curriculum.json
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "curriculum.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(curriculum, f, indent=4, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"  ✅ Saved merged curriculum to: {out_path}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
