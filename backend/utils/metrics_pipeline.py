import json
import os
from pathlib import Path

languages_efficiency = {"afr_Latn": "Afrikaans","eng_Latn": "English","nso_Latn": "Northern Sotho","sot_Latn": "Southern Sotho","ssw_Latn": "Swati","tsn_Latn": "Tswana","tso_Latn": "Tsonga","xho_Latn": "Xhosa","zul_Latn": "Zulu"}
languages_linguistic = {"nbl": "Isindebele", "nso": "Northern Sotho","sot": "Southern Sotho","ssw": "Swati","tsn": "Tswana","tso": "Tsonga","ven" : "Venda", "xho": "Xhosa","zul": "Zulu"}

#Loads the flores dataset in a list
def load_flores(directory):
    data = {}

    for language in languages_efficiency:
        path = directory+"/"+language+".dev"

        with open(path, "r") as file:
            data[languages_efficiency[language]] = [
                line.strip()
                for line in file
                if line.strip()
            ]
    return data

#load the NCHLT dataset into a list
def load_NCHLT(directory):
    data = {}

    for language in languages_linguistic:
        path = directory+"/"+language+".txt"

        with open(path, "r") as file:
            data[languages_linguistic[language]] = [
                line.strip()
                for line in file
                if line.strip()
            ]
    return data

# BASE_DIR = Path(__file__).resolve().parent.parent  # /app (or ./backend)
# DEV_DIR = str(BASE_DIR / "dev")


# if __name__ == "__main__":
#     print(load_flores(DEV_DIR))
#     print(load_NCHLT(DEV_DIR))

#This is the effieciency metric class that calculate effiecncy metric components using the components
class effieciency_metric:

    #Uses the tokenizer object to tokenize each sentence and returns it 
    def tokenize(self, tokenizer,language_corpus):
        tokens = []
        for sentence in language_corpus:
            tokens.extend(tokenizer.tokenize(sentence))
        return tokens

    #Counts tokens
    def token_count(self, tokens):
        return len(tokens)
    
    #Counts words in the data for fertility calculation
    def word_counter(self, language_corpus):
        count = 0
        for sentence in language_corpus:
            count += len(sentence.split())
        return count
    
    #Calculates the fertility 
    def fertility(self, number_of_tokens, number_of_words):
        return number_of_tokens/number_of_words if number_of_words != 0 else 0
    
    #returns compresion
    def compression(self, language_corpus,token_count):
        byte_count = 0
        #calculates the total byte of the data
        for sentence in language_corpus:
            byte_count += len(sentence.encode("utf-8"))
        compression = byte_count / token_count
        return compression

    #Calculates and returns the metrics data for the given language corpus and tokenezer in a json format
    def metrics(self, language_corpus, model_id: str, registry) :
            tok = registry.get_tokenizer(model_id)

            # Batch tokenization: tokenizes all 997 sentences in one Rust call
            encoded_batch = tok(language_corpus, add_special_tokens=False)
            total_tokens = sum(len(ids) for ids in encoded_batch["input_ids"])

            word_count = self.word_counter(language_corpus)
            fertility = self.fertility(total_tokens, word_count)
            comp = self.compression(language_corpus, total_tokens)

            return {
                "token_count": total_tokens,
                "fertility": fertility,
                "compression": comp,
            } 

class linguistic_metric:

    #Creates a boundy map for a word in a data set in a format of 1s and 0s
    def get_morpheme_boundaries(self, word, morphemed_word):
        morphemes = morphemed_word.split("_")    
        binary_boundry = [0] * (len(word) - 1)
        position = 0

        for morpheme in morphemes[:-1]:
            position += len(morpheme)
            binary_boundry[position - 1] = 1
        return binary_boundry
    #Creates a boundy map for the tokenized word in a format of 1s and 0s
    def get_tokenized_boundaries(self, word, tokens):
        ignored_characters = ["-", "##", "&", "Ġ"]
        binary_boundry = [0] * (len(word) - 1)
        position = 0

        for token in tokens[:-1]:
            for prefix in ignored_characters:
                if token.startswith(prefix):
                    token = token[len(prefix):]
            position += len(token)
            binary_boundry[position - 1] = 1
        return binary_boundry
    
    #for each actual and predictions of boundries, which are true positives, true negatives , false negatives and false positives
    def classifying(self, actual, predicted):
        tp = 0
        fp = 0
        fn = 0
        tn = 0
        for g, p in zip(actual, predicted):

            if g == 1 and p == 1:
                tp += 1
            elif g == 0 and p == 1:
                fp += 1
            elif g == 1 and p == 0:
                fn += 1
            elif g == 0 and p == 0:
                tn += 1

        return tp, fp, fn, tn
    
    def get_precision(self, tp,fp):
        if tp + fp > 0:
            return tp / (tp + fp)
        else:
            return 0.0
        
    def get_recall(self, tp,fn):
        if tp + fn > 0:
            return tp / (tp + fn)
        else:
            return 0.0
        
    def get_F1(self, precision, recall):
        if precision + recall > 0:
            return (2 * precision * recall/ (precision + recall))
        else:
            return 0.0
        
    def metrics(self, language_morpheme, model_id: str, registry) :
            tok = registry.get_tokenizer(model_id)
            
            words = []
            morphemed_words = []
            for line in language_morpheme:
                parts = line.strip().split(maxsplit=1)
                if len(parts) == 2:
                    words.append(parts[0])
                    morphemed_words.append(parts[1])

            if not words:
                return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

            # Batch tokenize all words in this language at once
            encoded_batch = tok(words, add_special_tokens=False)
            
            precisions, recalls, f1s = [], [], []

            for i, word in enumerate(words):
                token_ids = encoded_batch["input_ids"][i]
                tokens = tok.convert_ids_to_tokens(token_ids)

                actual = self.get_morpheme_boundaries(word, morphemed_words[i])
                pred = self.get_tokenized_boundaries(word, tokens)

                tp = sum(1 for a, p in zip(actual, pred) if a == 1 and p == 1)
                fp = sum(1 for a, p in zip(actual, pred) if a == 0 and p == 1)
                fn = sum(1 for a, p in zip(actual, pred) if a == 1 and p == 0)

                p = tp / (tp + fp) if (tp + fp) > 0 else 0.0
                r = tp / (tp + fn) if (tp + fn) > 0 else 0.0
                f1 = (2 * p * r) / (p + r) if (p + r) > 0 else 0.0

                precisions.append(p)
                recalls.append(r)
                f1s.append(f1)

            n = len(precisions) or 1
            return {
                "precision": round(sum(precisions) / n, 4),
                "recall": round(sum(recalls) / n, 4),
                "f1": round(sum(f1s) / n, 4),
            }
        
    
#This class recieves the tokenizer and language data, to compute metrics. 
class tokenizer_metrics:
        
        #initialises the tokenizer_metrics class with different data for different metrics
        def __init__(self, model_id, registry, efficiency_data, linguistic_data):
            self.registry = registry
            self.model_id = model_id
            self.efficiency_data = efficiency_data
            self.linguistic_data = linguistic_data

        #This returns a json format of effiency metric data for the default languages corpora(token count, fertility, compression, premium)
        def tokenizer_language_efficiency(self):
            effiency_calculator = effieciency_metric()
            tokenizer_efficiency = {}

            #Loops over every language and computes the metric data for the tokenizer
            for language in self.efficiency_data:
                language_corpus = self.efficiency_data[language]
                tokenizer_efficiency[language] = effiency_calculator.metrics(language_corpus, self.model_id, self.registry)
            english_token_count = tokenizer_efficiency["English"]["token_count"]

            #Loops over every language to calculate the premium for each language
            for language in self.efficiency_data:
                tokenizer_efficiency[language]["token_premium"] = tokenizer_efficiency[language]["token_count"] / english_token_count
            return tokenizer_efficiency
        
        #This returns a json format of linguistic metric data for the default languages corpora data (precision, recall, F1_score)
        def tokenizer_language_linguistic(self):
            linguistic_calculator = linguistic_metric()
            tokenizer_linguistic = {}

            #Loops over every language and computes the metric data for the tokenizer
            for language in self.linguistic_data:
                language_morpheme = self.linguistic_data[language]
                tokenizer_linguistic[language] = linguistic_calculator.metrics(language_morpheme, self.model_id, self.registry)
            return tokenizer_linguistic
        
        #Many more features coming soon
        


        
