import requests

BASE = "http://localhost:8000"

tests = [
    ("Attempt 1 (Interrogator)", {"checkpoint_id":"cp_01","submission_type":"code","attempt_count":1,"language_preference":"english","viva_attempt_count":0}),
    ("Attempt 3 (Mentor)", {"checkpoint_id":"cp_01","submission_type":"code","attempt_count":3,"language_preference":"english","viva_attempt_count":0}),
    ("Attempt 4 (Correct + Viva)", {"checkpoint_id":"cp_01","submission_type":"code","attempt_count":4,"language_preference":"english","viva_attempt_count":0}),
    ("Viva Fail (attempt 0)", {"checkpoint_id":"cp_01","submission_type":"viva","attempt_count":1,"language_preference":"english","viva_attempt_count":0,"transcribed_text":"i dont know"}),
    ("Viva Pass (attempt 2)", {"checkpoint_id":"cp_01","submission_type":"viva","attempt_count":1,"language_preference":"english","viva_attempt_count":2,"transcribed_text":"offset from base"}),
]

for name, body in tests:
    r = requests.post(f"{BASE}/api/submit", json=body)
    d = r.json()
    print(f"\n=== {name} ===")
    print(f"  Status: {r.status_code}")
    print(f"  persona: {d.get('persona_used')}")
    print(f"  is_correct: {d.get('is_correct')}")
    print(f"  viva_passed: {d.get('viva_passed')}")
    print(f"  video_can_resume: {d.get('video_can_resume')}")
    print(f"  feedback: {d.get('feedback_text')[:60]}...")
    if d.get("mermaid_diagram"):
        print(f"  mermaid: YES")
    if d.get("viva_question"):
        print(f"  viva_q: {d.get('viva_question')}")
