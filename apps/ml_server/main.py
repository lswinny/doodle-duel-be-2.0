from fastapi import FastAPI
from pydantic import BaseModel
from typing import List


app = FastAPI()


# ---------- Request / response models ----------

class ImageScore(BaseModel):
    image_index: int
    score: float


class JudgeRequest(BaseModel):
    prompt: str
    images: List[str]  # list of base64 / data URLs


class JudgeResponse(BaseModel):
    scores: List[ImageScore]
    winner_index: int


# ---------- Simple test endpoints (optional) ----------

@app.get("/")
async def root():
    return {"message": "Hello from ml_server"}


# ---------- AI judge endpoint ----------

@app.post("/score-images", response_model=JudgeResponse)
async def score_images(payload: JudgeRequest):
    """
    This is where we 'call the AI model API'.

    For now we implement a simple scoring function so the game
    logic can be wired up and tested. Later, this block can call
    a real model instead of the dummy scoring.
    """

    scores: List[ImageScore] = []

    # Very naive scoring: longer image strings get slightly higher score.
    # This is just a stand-in for real AI logic.
    for idx, img in enumerate(payload.images):
        # Using length as a fake score, scaled down
        score_value = len(img) / 1000.0
        scores.append(ImageScore(image_index=idx, score=score_value))

    # Pick the winner (highest score)
    if not scores:
        # No images provided – this shouldn't really happen
        return JudgeResponse(scores=[], winner_index=-1)

    winner_index = max(range(len(scores)), key=lambda i: scores[i].score)

    return JudgeResponse(scores=scores, winner_index=winner_index)
