from fastapi import FastAPI
from core.schemas import InstagramRequest, ReelResponse
from core.orchestrator import generate_instagram_post

app = FastAPI(title="Viral LLM API")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/instagram", response_model=ReelResponse)
def instagram(data: InstagramRequest):
    result = generate_instagram_post(
        topic=data.topic,
        audience=data.audience,
        goal=data.goal
    )
    return result
