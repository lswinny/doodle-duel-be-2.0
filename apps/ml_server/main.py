from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
import torch
import clip
import random
from PIL import Image
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

class ClipRequest(BaseModel):
    prompt: str
    image: str

def extract_subject(prompt: str) -> str:
    """Extract the main subject from prompt, removing articles."""
    cleaned = prompt.lower().strip()
    if cleaned.startswith(("a ", "an ", "the ")):
        words = cleaned.split()
        return " ".join(words[1:]) if len(words) > 1 else cleaned
    return cleaned

def generate_category_prompts(subject: str) -> tuple[list[str], dict]:
    """Generate prompts organized by confidence categories."""
    
    prompt_categories = {
    "medium_low": [
        f"a rough sketch of {subject}",
        f"a simple drawing of {subject}",
        f"a doodle of {subject}",           # ONLY ADDITION
    ],
    "low": [
        f"something like {subject}",
        f"resembling {subject}",
        f"inspired by {subject}",
    ],
    "very_low": [
        f"maybe {subject}",
        f"could be {subject}",
        f"possibly {subject}",
    ]
    }
    
    # Flatten prompts and create mapping
    all_prompts = []
    category_for_prompt = {}
    
    for category, prompts in prompt_categories.items():
        all_prompts.extend(prompts)
        for prompt in prompts:
            category_for_prompt[prompt] = category
    
    return all_prompts, category_for_prompt

def calculate_engagement_factor(base64_image: str) -> float:
    buffer = base64.b64decode(base64_image)
    
    size_factor = random.uniform(-3, 10) 

    return size_factor

def compute_similarities(pil_image: Image.Image, prompts: list[str]) -> list[float]:
    """Compute CLIP similarity scores between image and prompts."""
    image_tensor = preprocess(pil_image).unsqueeze(0).to(device)
    text_tokens = clip.tokenize(prompts).to(device)
    
    with torch.no_grad():
        image_features = model.encode_image(image_tensor)
        text_features = model.encode_text(text_tokens)
    
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    
    similarities = (image_features @ text_features.T).squeeze(0)
    return [float(s) for s in similarities]

def calculate_category_score(similarities: list[float], prompts: list[str], category_for_prompt: dict) -> tuple[float, float]:
    """
    Calculate score using category-based weighting.
    Returns: (raw_score, normalized_percentage)
    """
    category_weights = {
        "medium_low": 0.55, 
        "low": 0.30,
        "very_low": 0.15, 
    }
    
    # Group scores by category
    category_scores = {}
    for prompt, score in zip(prompts, similarities):
        category = category_for_prompt[prompt]
        if category not in category_scores:
            category_scores[category] = []
        category_scores[category].append(score)
    
    # Calculate weighted average across categories
    weighted_sum = 0
    total_weight = 0
    
    for category, scores in category_scores.items():
        category_average = sum(scores) / len(scores)
        weight = category_weights[category]
        weighted_sum += category_average * weight
        total_weight += weight
    
    # Calculate final score
    if total_weight > 0:
        raw_score = weighted_sum / total_weight
    else:
        raw_score = 0.0
    
    boosted = raw_score * 1.1  # 10% boost
    boosted = min(0.6, boosted)  # Cap

    # Scale for consistent low-medium range and normalize to 0-100%
    scaled_raw = boosted * 0.7  # Scale down to target range
    max_range = 0.4  # Maximum expected raw score for this strategy
    
    # Normalize to percentage (0-100%)
    normalized_percentage = min(100.0, max(0.0, (scaled_raw / max_range) * 100))
    
    return scaled_raw, normalized_percentage

@app.get("/")
async def root():
    return {"message": "Hello From ML_Server"}

@app.post("/score-image")
def confidence_rating(data: ClipRequest):
    """Main endpoint for category-based image scoring."""
    # Decode and process image
    img_bytes = base64.b64decode(data.image)
    pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    
    # Extract subject and generate categorized prompts
    subject = extract_subject(data.prompt)
    prompts, category_map = generate_category_prompts(subject)
    
    # Compute similarity scores
    similarities = compute_similarities(pil_image, prompts)
    
    # Calculate final score using category-based weighting
    raw_score, confidence_percent = calculate_category_score(
        similarities, prompts, category_map
    )
    
    # Convert to 0-1 scale for API consistency
    confidence_score = confidence_percent / 100.0 

    if confidence_percent > 65:
        feedback = "Excellent match!"
    elif confidence_percent > 45:
        feedback = "Good job!"
    elif confidence_percent > 25:
        feedback = "Getting there!"
    else:
        feedback = "Try again!"
    
    return {
        "prompt": data.prompt,
        "confidence": confidence_score,
        "confidence_percent": round(confidence_percent, 2) + calculate_engagement_factor(data.image),
        "scoring_method": "category_weighted",
        "raw_score": round(raw_score, 4),
        "boost": 0.1,
        "feedback": feedback
    }

@app.post("/debug-score")
def debug_score(data: ClipRequest):
    """Debug endpoint to see detailed scoring breakdown."""
    img_bytes = base64.b64decode(data.image)
    pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    
    subject = extract_subject(data.prompt)
    prompts, category_map = generate_category_prompts(subject)
    similarities = compute_similarities(pil_image, prompts)
    
    # Detailed category breakdown
    category_details = {}
    for category in ["medium_low", "low", "very_low"]:
        category_prompts = [p for p in prompts if category_map[p] == category]
        category_scores = [s for p, s in zip(prompts, similarities) 
                          if category_map[p] == category]
        
        if category_scores:
            category_details[category] = {
                "prompts": category_prompts,
                "scores": [round(s, 4) for s in category_scores],
                "average_score": round(sum(category_scores) / len(category_scores), 4),
                "weight": 0.5 if category == "medium_low" else 
                         0.3 if category == "low" else 0.2
            }
    
    raw_score, confidence_percent = calculate_category_score(
        similarities, prompts, category_map
    )
    
    return {
        "prompt": data.prompt,
        "subject_extracted": subject,
        "final_score": {
            "raw": round(raw_score, 4),
            "percent": round(confidence_percent, 2)
        },
        "category_breakdown": category_details,
        "total_prompts": len(prompts)
    }