from fastapi import APIRouter, HTTPException
from utils.tokenizer_registry import TokenizerRegistry
from pydantic import BaseModel
from utils.metrics_pipeline import load_flores, load_NCHLT, tokenizer_metrics
from pathlib import Path
from utils.constants import LANGUAGES
from typing import Optional, Literal
import json
<<<<<<< HEAD
import random
=======
import logging
import random

logger = logging.getLogger(__name__)
>>>>>>> 2b1166e953ead8105cac04799b63cfe16f48dbbe

# -------------------
# HELPERS & CONSTANTS
# -------------------

# Create a router instance instead of an app instance
router = APIRouter(prefix="/tokenizer", tags=["tokenizer"])

tokenizer_registry = TokenizerRegistry(cache_capacity=3)

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
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to read metrics cache at {CACHE_PATH}: {e}")
    return {}

def write_cache(data: dict):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

@router.get("/")
def read_tokenizers():
    try:
        t = tokenizer_registry.get_all_tokenizers()
        return {"tokenizers": t}
    except Exception as e:
        logger.error(f"Failed to list tokenizers: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve the list of available tokenizers.")

@router.post("/tokenize")
def preview_tokenization(request: TokenizeRequest):
    if not request.model_id.strip():
        raise HTTPException(status_code=400, detail="model_id cannot be empty.")
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text cannot be empty.")
    try:
        return tokenizer_registry.tokenize_text(request.model_id, request.text)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"Tokenizer not found: {e}")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=f"Access denied: {e}")
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=f"Tokenization failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error tokenizing with '{request.model_id}': {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while tokenizing with '{request.model_id}'.")



# this is to get getting all the efficiency + linguistic metrics for all the langaues
# If the user just requests the /metrics endpoint, we just return the (pre)computed metrics (both) for all languages for that specific tokenizer
# If the user specifies the langues, we return the both metric types for that specifc language using the specified model
# If the user specifies the metric type, we return the specifc metrics for the specifed langues for the specified mode

# The format: GET tokenizer/metrics?languages=a,b&metric_type=all&model_id=id

@router.get("/metrics")
def get_metrics(model_id: str, languages = None, metric_type: Optional[Literal["all", "efficiency", "linguistic"]] = "all"):
    if not model_id.strip():
        raise HTTPException(status_code=400, detail="model_id query parameter is required and cannot be empty.")

    cached_data = read_cache()
    target_languages = None

    # we're extracting the langues from the url query params
    if languages:
        target_languages = [lang.strip() for lang in languages.split(",") if lang.strip()]
        if not target_languages:
            raise HTTPException(status_code=400, detail="'languages' parameter was provided but contained no valid language names.")

    # 1. HIT: Retrieve precomputed metrics from JSON cache
    # There was a bug fix here. I created a new dict as to not modify the cache in memory.
    if model_id in cached_data:
        cache =  cached_data[model_id]
        metrics ={}

        # Filter by language if requested
        if target_languages:
                    
                    for metric in ("efficiency", "linguistic"):
                        if metric in cache:
                            metrics[metric] = { lang: data for lang, data in cache[metric].items() if lang in target_languages}
        else:
            metrics = cache
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
        except (ValueError, PermissionError) as e:
            raise HTTPException(status_code=400, detail=f"Could not load tokenizer '{model_id}': {e}")
        except Exception as e:
            logger.error(f"Metrics computation failed for '{model_id}': {e}")
            raise HTTPException(status_code=500, detail=f"Failed to compute metrics for '{model_id}'. Please try again or check that the model ID is correct.")

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
        print(f"error fetching languages: " + str(e))
        raise HTTPException(status_code=400, detail="There was an error fetching the languages.")

@router.get("/summary/models")
def get_summary():
    try:
        cached_data = read_cache()
        summary = []

        for key, val in cached_data.items():
            efficieny_data = val.get("efficiency", {})
            linguistic_data = val.get("linguistic", {})

            # efficienccy
            fertilities = []
            compressions=[]
            premiums=[]
            token_count = []

            #linguistic
            f1s= []
            precisions=[]
            recalls = []


            for value in efficieny_data.values():
                fertilities.append(value["fertility"])
                compressions.append(value["compression"])
                premiums.append(value["token_premium"])
                token_count.append(value["token_count"])


            for value in linguistic_data.values():
                f1s.append(value["f1"])
                precisions.append(value["precision"])
                recalls.append(value["recall"])


            summary.append({
                "model_id": key,
                "avg_tokens": round(sum(token_count)/len(token_count), 3) if len(token_count) != 0 else 0,
                "avg_fertility": round(sum(fertilities)/len(fertilities), 3) if len(fertilities) != 0 else 0,
                "avg_compression": round(sum(compressions) /len(compressions), 3) if len(compressions) != 0 else 0,
                "avg_premium": round(sum(premiums)/ len(premiums), 3) if len(premiums) != 0 else 0,
                "avg_f1": round(sum(f1s)/len(f1s), 3) if len(f1s) != 0 else 0,
                "avg_precision": round(sum(precisions)/len(precisions), 3) if len(precisions) !=0 else 0,
                "avg_recall": round(sum(recalls)/len(recalls), 3) if len(recalls) != 0 else 0
            })

        return {"models": summary}
    except (KeyError, TypeError) as e:
        logger.error(f"Malformed data in metrics cache while building model summary: {e}")
        raise HTTPException(status_code=500, detail="The metrics cache contains malformed data. Try recomputing metrics for the affected models.")
    except Exception as e:
        logger.error(f"Failed to build model summary: {e}")
        raise HTTPException(status_code=500, detail="Could not generate model summary.")

@router.get("/summary/languages")
def get_language_summary():
    try:
        cached_data = read_cache()

        language_data = {}

        for model_id, val in cached_data.items():
            efficiency_data = val.get("efficiency", {})
            linguistic_data = val.get("linguistic", {})

            languages = set(efficiency_data.keys()) | set(linguistic_data.keys())

            for language in languages:
                if language not in language_data:
                    language_data[language] = {
                        "fertilities": [],
                        "compressions": [],
                        "f1s": [],
                        "precisions": [],
                        "recalls": [],
                        "premium": [],
                        "token_count": []
                    }

                if language in efficiency_data:
                    efficiency = efficiency_data[language]
                    language_data[language]["fertilities"].append(efficiency["fertility"])
                    language_data[language]["compressions"].append(efficiency["compression"])
                    language_data[language]["premium"].append(efficiency["token_premium"])
                    language_data[language]["token_count"].append(efficiency["token_count"])

                if language in linguistic_data:
                    linguistic = linguistic_data[language]
                    language_data[language]["f1s"].append(linguistic["f1"])
                    language_data[language]["precisions"].append(linguistic["precision"])
                    language_data[language]["recalls"].append(linguistic["recall"])

        summary = []

        for language, values in language_data.items():
            summary.append({
                "language": language,
                "avg_tokens": round(sum(values["token_count"])/len(values["token_count"]), 3) if len(values["token_count"]) != 0 else 0,
                "avg_fertility": round(sum(values["fertilities"]) / len(values["fertilities"]), 3) if len(values["fertilities"]) else 0,
                "avg_compression": round(sum(values["compressions"]) / len(values["compressions"]), 3) if len(values["compressions"]) else 0,
                "avg_f1": round(sum(values["f1s"]) / len(values["f1s"]), 3) if len(values["f1s"]) else 0,
                "avg_precision": round(sum(values["precisions"]) / len(values["precisions"]), 3) if len(values["precisions"]) else 0,
                "avg_recall": round(sum(values["recalls"]) / len(values["recalls"]), 3) if len(values["recalls"]) else 0,
                "avg_premium": round(sum(values["premium"]) / len(values["premium"]), 3) if len(values["premium"]) else 0

            })

        return {"languages": summary}
    except (KeyError, TypeError) as e:
        logger.error(f"Malformed data in metrics cache while building language summary: {e}")
        raise HTTPException(status_code=500, detail="The metrics cache contains malformed data. Try recomputing metrics for the affected models.")
    except Exception as e:
        logger.error(f"Failed to build language summary: {e}")
        raise HTTPException(status_code=500, detail="Could not generate language summary.")
