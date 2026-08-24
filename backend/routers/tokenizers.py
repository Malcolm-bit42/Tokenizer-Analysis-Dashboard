from fastapi import APIRouter, HTTPException
from utils.tokenizer_registry import Tokenizer
from pydantic import BaseModel
from utils.metrics_pipeline import load_flores, load_NCHLT, tokenizer_metrics
from pathlib import Path


# Create a router instance instead of an app instance
router = APIRouter(prefix="/tokenizer", tags=["tokenizer"])

tokenizer_registry = Tokenizer(cache_capacity=50)

class TokenizeRequest(BaseModel):
    model_id: str
    text: str


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


# Load data files once on startup
# get absoulte path relative to teh container or physical machine - wherever the program is running
DEV_DIR = Path(__file__).resolve().parent.parent / "dev"

flores_data = load_flores(str(DEV_DIR))
nchlt_data = load_NCHLT(str(DEV_DIR))


class MetricRequest(BaseModel):
    model_id: str

# this is to get getting all the efficiency + linguistic metrics for all the langaues
@router.post("/metrics")
def get_metrics(request: MetricRequest):
    try:
        runner = tokenizer_metrics(
            model_id=request.model_id,
            registry=tokenizer_registry,
            efficiency_data=flores_data,
            linguistic_data=nchlt_data
        )
        return {
            "model_id": request.model_id,
            "efficiency": runner.tokenizer_language_efficiency(),
            "linguistic": runner.tokenizer_language_linguistic()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))