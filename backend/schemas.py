from pydantic import BaseModel

class SubmitRequest(BaseModel):
    checkpoint_id:str
    submission_type:str
    attempt_count:int
    language_preference:str
    user_code:str | None = None
    transcribed_text:str | None = None
    viva_question:str | None = None
    viva_attempt_count: int = 0   # tracks viva retries separately
    
class EvaluationResponse(BaseModel):
    checkpoint_id:str
    submission_type:str
    persona_used:str
    is_correct:bool | None = None
    feedback_text:str 
    mermaid_diagram:str | None = None
    viva_question:str | None =None
    viva_passed: bool | None = None
    video_can_resume:bool=False  

class Checkpoint(BaseModel):
    checkpoint_id:str
    timestamp_seconds:int
    topic:str
    context_summary:str
    starter_code:str
    expected_concept:str
   
class CurriculumResponse(BaseModel):
    video_id:str
    video_title:str
    checkpoints:list[Checkpoint]
