from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import CurriculumResponse,SubmitRequest,EvaluationResponse
from router import route_request

import json

with open("curriculum.json") as f:
    data=json.load(f)

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
    # Look up expected_concept from curriculum for this checkpoint
    checkpoint_data = next(
        (c for c in data.get("day_1", {}).get("checkpoints", [])
         if c["checkpoint_id"] == request.checkpoint_id), {}
    )
    expected_concept = checkpoint_data.get("expected_concept", "")
    return route_request(request, expected_concept)

