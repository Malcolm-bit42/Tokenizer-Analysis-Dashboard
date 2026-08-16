import json
import os

languages_efficiency = {"afr_Latn": "Afrikaans","eng_Latn": "English","nso_Latn": "Northern Sotho","sot_Latn": "Southern Sotho","ssw_Latn": "Swati","tsn_Latn": "Tswana","tso_Latn": "Tsonga","xho_Latn": "Xhosa","zul Latn": "Zulu"}
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
print(load_flores("./dev"))
print(load_NCHLT("./dev"))

#This is the effieciency metric class that calculate effiecncy metric components using the components
class effieciency_metric:

    #Uses the tokenizer object to tokenize each sentence and returns it 
    def tokenize(tokenizer,language_corpus):
        tokens = []
        for sentence in language_corpus:
            tokens.extend(tokenizer.tokenize(sentence))
        return tokens

    #Counts tokens
    def token_count(tokens):
        return len(tokens)
    
    #Counts words in the data for fertility calculation
    def word_counter(language_corpus):
        for sentence in language_corpus:
            print("yo")

    #Calculates the fertility 
    def fertility(number_of_tokens, number_of_words):
        return number_of_tokens/number_of_words
    
    #returns compresion
    def compression(language_corpus,token_count):
        byte_count = 0
        #calculates the total byte of the data
        for sentence in language_corpus:
            byte_count += len(sentence.encode("utf-8"))
        compression = byte_count / token_count
        return compression

    #Calculates and returns the metrics data for the given language corpus and tokenezer in a json format
    def metrics(self,language_corpus,tokenizer):
        tokens = self.tokenize(tokenizer,language_corpus)
        token_count = self.token_count(tokens)
        word_count = self.word_counter(language_corpus)
        fertility = self.fertility(token_count,word_count )
        compression = self.compression(language_corpus, token_count)
        return {"token_count": token_count,
            "fertility": fertility,
            "compression": compression,}

class linguistic_metric:

    #Creates a boundy map for a word in a data set in a format of 1s and 0s
    def get_morpheme_boundaries(word, morphemed_word):
        morphemes = morphemed_word.split("_")    
        binary_boundry = [0] * (len(word) - 1)
        position = 0

        for morpheme in morphemes[:-1]:
            position += len(morpheme)
            binary_boundry[position - 1] = 1
        return binary_boundry
    #Creates a boundy map for the tokenized word in a format of 1s and 0s
    def get_tokinezed_boundries(word, tokens):
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
    def classifying(actual, predicted):
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
    
    def get_precision(tp,fp):
        if tp + fp > 0:
            return tp / (tp + fp)
        else:
            return 0.0
        
    def get_recall(tp,fn):
        if tp + fn > 0:
            return tp / (tp + fn)
        else:
            return 0.0
        
    def get_F1(precision, recall):
        if precision + recall > 0:
            return (2 * precision * recall/ (precision + recall))
        else:
            return 0.0
    
    def metrics(self, language_morpheme, tokenizer):
        precisions = []
        recalls = []
        F1_scores = []
        
        #Loops over every word and each morpheme, tokenizers each word, and gets the scores in a json format
        for line in language_morpheme:
            word = line[:line.find(" ")]
            morphemed_word = line[line.find(" ")+1:-1]
            tokens = tokenizer.tokenize(word)

            #Uses the methods to get the scores
            morpheme_boundy_map = self.get_morpheme_boundaries(word, morphemed_word)
            token_boundry_map = self.get_tokinezed_boundries(word, tokens)
            tp, fp, fn, tn = self.classifying(morpheme_boundy_map, token_boundry_map)

            precision = self.get_precision(tp,fp)
            recall = self.get_recall(tp, fn)
            F1 = self.get_F1(precision, recall)

            #Stores all the scores in a list
            precisions.append(precision)
            recalls.append(recall)
            F1_scores.append(F1)

        return {
        # returns averages
        "precision": sum(precisions) / len(precisions),
        "recall": sum(recalls) / len(recalls),
        "f1": sum(F1_scores) / len(F1_scores)}

    
    
#This class recieves the tokenizer and language data, to compute metrics. 
class tokenizer_metrics:
        
        #initialises the tokenizer_metrics class with different data for different metrics
        def __init__(self, tokenizer, efficiency_data, linguistic_data):
            self.tokenizer = tokenizer
            self.efficiency_data = efficiency_data
            self.linguistic_data = linguistic_data

        #This returns a json format of effiency metric data for the default languages corpora(token count, fertility, compression, premium)
        def tokenizer_language_effeciency(self):
            effiency_calculator = effieciency_metric()
            tokenizer_efficiency = {}

            #Loops over every language and computes the metric data for the tokenizer
            for language in self.efficiency_data:
                language_corpus = self.efficiency_data[language]
                tokenizer_efficiency = {language : effiency_calculator.metrics(language_corpus, self.tokenizer)}
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
                tokenizer_linguistic = {language : linguistic_calculator.metrics(language_morpheme, self.tokenizer)}
            return tokenizer_linguistic
        
        #Many more features coming soon
        


        
