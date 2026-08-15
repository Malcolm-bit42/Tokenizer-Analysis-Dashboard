from fastapi import APIRouter
from utils.tokenizer_registry import Tokenizer


# Create a router instance instead of an app instance
router = APIRouter(prefix="/tokenizer", tags=["tokenizer"])

tokenizer = Tokenizer(cache_capacity=50)

@router.get("/")
def read_tokenizers():
    t = tokenizer.get_all_tokenizers()
    return {
        "tokenizers": t
    }
