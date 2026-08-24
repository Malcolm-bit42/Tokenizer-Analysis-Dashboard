from fastapi import APIRouter, HTTPException
from utils.tokenizer_registry import Tokenizer
from pydantic import BaseModel
from utils.metrics_pipeline import load_flores, load_NCHLT, tokenizer_metrics
from pathlib import Path
from utils.constants import LANGUAGES
from typing import Optional, Literal
import json

# -------------------
# HELPERS & CONSTANTS
# -------------------

# Create a router instance instead of an app instance
router = APIRouter(prefix="/tokenizer", tags=["tokenizer"])

tokenizer_registry = Tokenizer(cache_capacity=50)

# Load data files once on startup
# get absoulte path relative to teh container or physical machine - wherever the program is running
DEV_DIR = Path(__file__).resolve().parent.parent / "dev"
CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "precomputed_metrics.json"
DEV_DIR = Path(__file__).resolve().parent.parent / "dev"

flores_data = load_flores(str(DEV_DIR))
nchlt_data = load_NCHLT(str(DEV_DIR))

class TokenizeRequest(BaseModel):
    model_id: str
    text: str

def read_cache() -> dict:
    if CACHE_PATH.exists():
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def write_cache(data: dict):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

@router.get("/")
def read_tokenizers():
    t = tokenizer_registry.get_all_tokenizers()
    return {
        "tokenizers": t
    }

@router.post("/preview")
def preview_tokenization(request: TokenizeRequest):
    try:
        return tokenizer_registry.tokenize_text(request.model_id, request.text)
    except (ValueError, PermissionError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))



# this is to get getting all the efficiency + linguistic metrics for all the langaues
# If the user just requests the /metrics endpoint, we just return the (pre)computed metrics (both) for all languages for that specific tokenizer
# If the user specifies the langues, we return the both metric types for that specifc language using the specified model
# If the user specifies the metric type, we return the specifc metrics for the specifed langues for the specified mode

# The format: GET tokenizer/metrics?languages=a,b&metric_type=all&model_id=id

@router.get("/metrics")
def get_metrics(model_id: str, languages = None, metric_type: Optional[Literal["all", "efficiency", "linguistic"]] = "all"):
    cached_data = read_cache()
    target_languages = [l.strip() for l in languages.split(",")] if languages else None # we're extracting the langues from the url query params

    # 1. HIT: Retrieve precomputed metrics from JSON cache
    if model_id in cached_data:
        metrics = cached_data[model_id]

    # Filter by language if requested
    if target_languages:
                for metric in ("efficiency", "linguistic"):
                    if metric in metrics:
                        metrics[metric] = { lang: data for lang, data in metrics[metric].items() if lang in target_languages}
    else:
        # 2. MISS, ths is not in cache: Compute metrics on the fly
        try:
            runner = tokenizer_metrics(
                model_id=model_id,
                registry=tokenizer_registry,
                efficiency_data=flores_data,
                linguistic_data=nchlt_data,
                target_languages=target_languages
            )

            metrics = {
                "efficiency": runner.tokenizer_language_efficiency(),
                "linguistic": runner.tokenizer_language_linguistic()
            }

            # Cache full model runs to disk (only when all languages were computed)
            if target_languages is None:
                cached_data[model_id] = metrics
                write_cache(cached_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # filter metric_type 
    response = {"model_id": model_id}
    
    if metric_type in ("all", "efficiency"):
        response["efficiency"] = metrics.get("efficiency", {})
    if metric_type in ("all", "linguistic"):
        response["linguistic"] = metrics.get("linguistic", {})

    return response

@router.get("/languages")
def get_languages():
    try:
        return {"languages": LANGUAGES}
    except Exception as e:
        print(f"error fetching languages: " + e)
        raise HTTPException(status_code=400, detail=str(e))
