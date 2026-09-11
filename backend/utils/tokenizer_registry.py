from transformers import AutoTokenizer, logging
from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError
from utils.constants import NON_GATED_TOKENIZERS
from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError, GatedRepoError
from collections import OrderedDict
from typing import Dict, Optional
import gc
import os

logging.set_verbosity_error()


class TokenizerRegistry:
    def __init__(self, cache_capacity: int = 3, preload: bool = True):
        # self.model_id = model_id_or_path
        self.cache_capacity: int = cache_capacity
        self.preloaded: Dict[str, any] = {}
        self.LRU_cache: OrderedDict[str, any] = OrderedDict()

        if preload and not os.getenv("PYTEST_CURRENT_TEST"):
            self._load_tokenizer()

        

    def _load_tokenizer(self):
    
        for model_id in NON_GATED_TOKENIZERS:
            try:

                tokenizer = AutoTokenizer.from_pretrained(
                    use_fast=True, 
                    # Forces HF to load strictly from disk without pinging the web, speeds up the operations. 
                    # # Without this, it'll take ~1-3mins to get up and running when we change a file
                    local_files_only=True,  
                    trust_remote_code=False,
                    pretrained_model_name_or_path=model_id
                )

                self.preloaded[model_id] = tokenizer
            except  Exception as e:
                    tokenizer = AutoTokenizer.from_pretrained(
                        use_fast=True, 
                        # Forces HF to load strictly from disk without pinging the web, speeds up the operations. 
                        # # Without this, it'll take ~1-3mins to get up and running when we change a file
                        local_files_only=False,
                        trust_remote_code=False,
                        pretrained_model_name_or_path=model_id
                    )

                    self.preloaded[model_id] = tokenizer
                        
                    continue
                    
    def get_all_tokenizers(self):

        # join the LUR cahce and the preloaed tokenizers and add all yhe keys to the set
        model_ids = set(self.preloaded.keys()).union(set(self.LRU_cache.keys()))

        return sorted(list(model_ids))

    def get_tokenizer(self, model_id: str)->Optional[any]:

        if model_id in self.preloaded:
            return self.preloaded[model_id]

        if model_id in self.LRU_cache:
            self.LRU_cache.move_to_end(model_id)
            return self.LRU_cache[model_id]  

        # if the tokenizer being requested has not been downloaded, download it on the fly and then add it to the LRU cache
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_id, 
                use_fast=True, 
                trust_remote_code=False
            )


        except (RepositoryNotFoundError, EntryNotFoundError):
            raise ValueError(f"Model repository or tokenizer files not found for: " + model_id)
        except GatedRepoError:
            # we'll return to gated models. We'll have to allow the user to send an API key to access the repo
            # complexities - request may take a while to be granted. how will we mitigate this?
            # how will we eventually let the user know one the request has been granted - we'll return to this at a ;later stahe
            raise PermissionError("Model" + model_id + " is gated and requires authentication.")
        except Exception as e:
            raise RuntimeError("Unable to load tokenizer  "+ model_id +": " + str(e))


        # remove oldest item from the LRU cache once it has exceeded its capacity
        if len(self.LRU_cache) >= self.cache_capacity:
            evicted_tokenizer = self.LRU_cache.popitem(last=False)

            del evicted_tokenizer
    
            gc.collect()     

        # insert the new item into the LRU cache
        self.LRU_cache[model_id] = tokenizer

        return tokenizer
    
    def tokenize_text(self, model_id: str, text: str) -> Dict[str, any]:
            # Tokenises text and returns standard results: 
            # token strings, IDs, count, and character offsets.
            # Also computes live efficiency metrics on the input text
            from utils.metrics_pipeline import effieciency_metric

            tokenizer = self.get_tokenizer(model_id)
            
            # Check if fast tokeniser (supporting offset mapping) is available
            if tokenizer.is_fast:
                encoded = tokenizer(text, return_offsets_mapping=True, add_special_tokens=False)
                token_ids = encoded["input_ids"]
                offsets = encoded["offset_mapping"]
            else:
                token_ids = tokenizer.encode(text, add_special_tokens=False)
                offsets = []  # Fallback for slow SentencePiece tokenizers

            tokens = tokenizer.convert_ids_to_tokens(token_ids)

            # Live efficiency metrics on the input text
            # Wrap the text in a list to match the corpus format expected by the metrics pipeline
            eff = effieciency_metric()
            eff_metrics = eff.metrics([text], model_id, self)

            return {
                "model_id": model_id,
                "tokens": tokens,
                "token_ids": token_ids,
                "offsets": offsets,
                "metrics": {
                    "fertility": round(eff_metrics["fertility"], 3),
                    "compression": round(eff_metrics["compression"], 3),
                    "token_count":  eff_metrics["token_count"]
                }
            }