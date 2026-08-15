from transformers import AutoTokenizer
from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError
from requests.exceptions import RequestException

class Tokenizer:
    def __init__(self, model_id_or_path):
        self.model_id = model_id_or_path
        

    def _load_tokenizer(self):
        try:
            tokenizer = AutoTokenizer.from_pretained(self.model_id)
            return tokenizer
        except  Exception as e:
            return None

    def save(self, path):
        if self.tokenizer:
            self.tokenizer.save_pretrained(path)
        else:
            print()
    def encode(self, text):
        if self.tokenizer:
            return self.tokenizer.encode(text)
        print("errrror")
        return None
        
  
    