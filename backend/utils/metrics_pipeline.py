# I'm adding this comment to the topic because it kinda looks weird as hell to not have imports and shi and just start writing code from line 1
# Kinda used to languages like Java or C with some sort of imports 


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

#This is the effieciency metric class that calculate effiecncy metric components using the components
class effieciency_metric:

    # Uses the tokenizer object to batch-tokenize the corpus
    def tokenize(self, tokenizer, language_corpus):
        encoded_batch = tokenizer(language_corpus, add_special_tokens=False)
        # Flattens the batch of token IDs to count/inspect
        all_ids = []
        for ids in encoded_batch["input_ids"]:
            all_ids.extend(ids)
        return all_ids

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
        if token_count == 0:
            return 0
        
        byte_count = 0
        #calculates the total byte of the data
        for sentence in language_corpus:
            byte_count += len(sentence.encode("utf-8"))
        compression = byte_count / token_count
        return compression

    #Calculates and returns the metrics data for the given language corpus and tokenezer in a json format
    def metrics(self, language_corpus, model_id: str, registry) :
            tok = registry.get_tokenizer(model_id)
            tokens = self.tokenize(tok, language_corpus)
            token_count = self.token_count(tokens)

            word_count = self.word_counter(language_corpus)
            fertility = self.fertility(token_count, word_count)
            compression = self.compression(language_corpus, token_count)

            return {
                "token_count": token_count,
                "fertility": fertility,
                "compression": compression,
            } 

class linguistic_metric:

    #Creates a boundy map for a word in a data set in a format of 1s and 0s
    def get_morpheme_boundaries(self, word, morphemed_word):
        morphemes = morphemed_word.split("_")    
        binary_boundry = [0] * (len(word) - 1)
        position = 0

        for morpheme in morphemes[:-1]:
            position += len(morpheme)
            if 0 <= position - 1 < len(binary_boundry):
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
            if 0 <= position - 1 < len(binary_boundry):
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
        
    def metrics(self, language_morpheme, model_id: str, registry):
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

            # Fast batch tokenization
            encoded_batch = tok(words, add_special_tokens=False)
            
            precisions = []
            recalls = []
            F1_scores = []

            for i, word in enumerate(words):
                token_ids = encoded_batch["input_ids"][i]
                tokens = tok.convert_ids_to_tokens(token_ids)

                morpheme_boundary_map = self.get_morpheme_boundaries(word, morphemed_words[i])
                token_boundary_map = self.get_tokenized_boundaries(word, tokens)
                tp, fp, fn, tn = self.classifying(morpheme_boundary_map, token_boundary_map)

                precision = self.get_precision(tp, fp)
                recall = self.get_recall(tp, fn)
                F1 = self.get_F1(precision, recall)

                precisions.append(precision)
                recalls.append(recall)
                F1_scores.append(F1)

            n = len(precisions) or 1
            return {
                "precision": round(sum(precisions) / n, 4),
                "recall": round(sum(recalls) / n, 4),
                "f1": round(sum(F1_scores) / n, 4),
            }
        
#This class recieves the tokenizer and language data, to compute metrics. 
class tokenizer_metrics:
        
        #initialises the tokenizer_metrics class with different data for different metrics
        # target_languages format is an array (list) of all langauges

        def __init__(self, model_id, registry, efficiency_data, linguistic_data, target_languages = None):
            self.registry = registry
            self.model_id = model_id

            # If target languages are specified, filter the dictionaries to only compute those
            if target_languages:
                self.efficiency_data = {lang: data for lang, data in efficiency_data.items() if lang in target_languages}
                self.linguistic_data = {lang: data for lang, data in linguistic_data.items() if lang in target_languages}

                # Keep English in efficiency_data if needed for token_premium calculation
                if "English" not in self.efficiency_data and "English" in efficiency_data:
                    self.efficiency_data["English"] = efficiency_data["English"]

            else:
                # by default, we compute metrics for all languages for thats specific dataset
                self.efficiency_data = efficiency_data
                self.linguistic_data = linguistic_data

            self.target_languages = target_languages
            
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
            if english_token_count > 0:
                for language in self.efficiency_data:
                    tokenizer_efficiency[language]["token_premium"] = tokenizer_efficiency[language]["token_count"] / english_token_count
                return tokenizer_efficiency
            
            # If user did not ask for English in their filter, remove it before returning... 
            # that way, we only return a clear object of the data the user reuqested
            # this allows us to calculate the premium without actually returning the english dataset results if the user specifically did not ask for them
            if self.target_languages and "English" not in self.target_languages and "English" in tokenizer_efficiency:
                del tokenizer_efficiency["English"]

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
        


        
