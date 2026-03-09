from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import CurriculumResponse,SubmitRequest,EvaluationResponse
from router import route_request

import json

with open("curriculum.json") as f:
    raw_data = json.load(f)
    data = raw_data.get("curriculum", raw_data)

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"] ,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/curriculum/{day_id}")
def get_curriculum(day_id:str):
    try:
        day_data=data[day_id]
        return CurriculumResponse(
            video_id=day_data["video_id"],
            video_title=day_data["video_title"],
            checkpoints=day_data["checkpoints"]
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Day not found")

@app.post("/api/submit")
def submit(request: SubmitRequest):
    checkpoint_data = {}
    for day in data.values():
        found = next((c for c in day.get("checkpoints", []) if c["checkpoint_id"] == request.checkpoint_id), None)
        if found:
            checkpoint_data = found
            break
    expected_concept = checkpoint_data.get("expected_concept", "")
    return route_request(request, expected_concept)

