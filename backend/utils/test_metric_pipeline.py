from metrics_pipeline import effieciency_metric
from metrics_pipeline import linguistic_metric
import pytest



#Testing Effiency metrics 

#Checks token_count method is counting the tokens correctly give tokens as input
def test_token_count():
    metric = effieciency_metric()
    result = metric.token_count([1, 2, 3, 4])

    assert result == 4

#Checks token_count method is counting the words correctly given a list of sentences as input
def test_word_counter():
    metric = effieciency_metric()
    sentence = ["My name is lesego wubet"]
    result = metric.word_counter(sentence)

    assert result == 5
#Checks if fertility is calculated correctly given token count and word count as input
def test_fertility():
    metric = effieciency_metric()
    result = metric.fertility(4,4)

    assert result == 1

#Checks if compression is calculated correctly given token count and language corpus as input
def test_compression():
    metric = effieciency_metric()
    sentence = ["My name is Lesego wubet"]
    result = metric.compression(sentence, 5)
    #gets the byte count of sentence
    byte_size = len(sentence[0].encode("utf-8"))

    assert result == byte_size / 5

#Checks if fertility is calculated correctly given token count and word count as 0 as input
def test_fertility_zero():
    metric = effieciency_metric()
    result = metric.fertility(4, 0)

    assert result == 0
#Checks if compression is calculated correctly given token count as 0 and language corpus as input
def test_compression_zero():
    metric = effieciency_metric()
    result = metric.compression(["hello"], 0)

    assert result == 0

#Checks if tokenise interacts with the tokenizer object correctly and tokenizes correctly
def test_tokenize():
    metric = effieciency_metric()
    #Makes a fake tokenizer method to call instead of the actual object
    def fake_tokenizer(sentence, add_special_tokens = False):
        return {"input_ids": [[1, 2], [3, 4]]}
    result = metric.tokenize(fake_tokenizer, ["My name", "is Lesego"])

    assert result == [1,2,3,4]

def test_metrics():
    metric = effieciency_metric() 
    #Makes a fake registry class that is used to test the metrics method, purpose is to emulated te get tokenizer method to be used
    class FakeRegistry: 
        def get_tokenizer(self, model_id): 
            return fake_tokenizer 
    #Makes a fake tokenizer method to call instead of the actual object
    def fake_tokenizer(sentence, add_special_tokens=False): 
            return { "input_ids": [ [1, 2], [3, 4] ] } 
    
    registry = FakeRegistry() 
    #returns a json
    result = metric.metrics( ["My name", "is Lesego"], "fake-model", registry ) 
    assert result["token_count"] == 4 
    assert result["fertility"] == 1 
    assert result["compression"] > 0

#Testing Linguistic metrics

#Test the morpheme boundry method if it correctly assigns a boundry map of 0 and 1s to the morphome
def test_get_morpheme_boundaries():
    metric = linguistic_metric()
    result = metric.get_morpheme_boundaries("unhappy","un_happy")

    assert result == [0, 1, 0, 0, 0, 0]

#Test the tokenized boundry method if it correctly assigns a boundry map of 0 and 1s to the token
def test_get_tokenized_boundaries():
    metric = linguistic_metric()
    result = metric.get_tokenized_boundaries("hello",["he", "llo"])

    assert result == [0, 1, 0, 0]

#Test if the classifying method assigns tru positive, true negatives, false negative and false positive correctly
def test_classifying():
    metric = linguistic_metric()
    actual = [1, 0, 1, 0]
    predicted = [1, 1, 0, 0]
    result = metric.classifying(actual, predicted)

    assert result == (1, 1, 1, 1)

#Check if the precision is calculated correctly given by the precision method as true positive and false positives as input
def test_precision():
    metric = linguistic_metric()
    result = metric.get_precision(8, 2)

    assert result == 0.8

#Checks if the recall is calculated correctly as true positves and false negatives given as input
def test_recall():
    metric = linguistic_metric()
    result = metric.get_recall(8, 2)

    assert result == 0.8


def test_f1():
    metric = linguistic_metric()
    result = metric.get_F1(0.8, 0.8)

    assert result == pytest.approx(0.8)

#Check if the precision is calculated correctly given by the precision method as true positive being 0 and also false positives being 0  as input
def test_precision_zero():
    metric = linguistic_metric()
    result = metric.get_precision(0, 0)

    assert result == 0.0

#Checks if the recall is calculated correctly as true positves being 0 and false negatives being 0 given as input
def test_recall_zero():
    metric = linguistic_metric()
    result = metric.get_recall(0, 0)

    assert result == 0.0


def test_f1_zero():
    metric = linguistic_metric()
    result = metric.get_F1(0, 0)

    assert result == 0.0

def test_linguistic_metrics():
    metric = linguistic_metric()
    #Makes a fake registry class that is used to test the metrics method, purpose is to emulated te get tokenizer method to be used
    class FakeTokenizer:
        def __call__(self, words, add_special_tokens=False):
            return {"input_ids": [[1, 2]]}

        def convert_ids_to_tokens(self, token_ids):
            return ["he", "llo"]

    class FakeRegistry:
        def get_tokenizer(self, model_id):
            return FakeTokenizer()

    registry = FakeRegistry()
    result = metric.metrics(
        ["hello he_llo"],
        "fake-model",
        registry
    )

    assert result["precision"] == 1.0
    assert result["recall"] == 1.0
    assert result["f1"] == 1.0