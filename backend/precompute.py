import json
import time
from pathlib import Path
from utils.tokenizer_registry import Tokenizer
from utils.metrics_pipeline import load_flores, load_NCHLT, tokenizer_metrics
from utils.constants import NON_GATED_TOKENIZERS 

BASE_DIR = Path(__file__).resolve().parent
DEV_DIR = BASE_DIR / "dev"
OUTPUT_FILE = BASE_DIR / "data" / "precomputed_metrics.json"

def run_precomputation():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    # preload=False: don't bulk-load all tokenizers into memory.
    # cache_capacity=2: only keep ~2 tokenizers in memory at a time, evicting old ones.
    # This keeps memory low so the precompute service doesn't starve the API server.
    registry = Tokenizer(cache_capacity=2, preload=False)
    flores_data = load_flores(str(DEV_DIR))
    nchlt_data = load_NCHLT(str(DEV_DIR))
    
    # Load existing cache or initialize empty dict
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)
    else:
        cache = {}

    total = len(NON_GATED_TOKENIZERS)
    skipped = sum(1 for m in NON_GATED_TOKENIZERS if m in cache)
    print(f"[precompute] Starting — {total} models total, {skipped} already cached, {total - skipped} to compute", flush=True)

    for i, model_id in enumerate(NON_GATED_TOKENIZERS, 1):
        if model_id in cache:
            print(f"[{i}/{total}] Skipping '{model_id}' (already precomputed)", flush=True)
            continue

        print(f"[{i}/{total}] Computing metrics for: {model_id}...", flush=True)
        start = time.time()
        try:
            runner = tokenizer_metrics(
                model_id=model_id,
                registry=registry,
                efficiency_data=flores_data,
                linguistic_data=nchlt_data
            )
            cache[model_id] = {
                "efficiency": runner.tokenizer_language_efficiency(),
                "linguistic": runner.tokenizer_language_linguistic()
            }
            elapsed = time.time() - start
            print(f"[{i}/{total}] ✓ {model_id} done in {elapsed:.1f}s", flush=True)
            # Write progress after each model so work isn't lost if interrupted
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(cache, f, indent=2)
        except Exception as e:
            elapsed = time.time() - start
            print(f"[{i}/{total}] ✗ Failed {model_id} after {elapsed:.1f}s: {e}", flush=True)

    print(f"[precompute] Finished — {len(cache)}/{total} models in cache", flush=True)

if __name__ == "__main__":
    run_precomputation()