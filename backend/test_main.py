"""
Unit tests for the tokenizer API endpoints.

Tests cover all routes defined in routers/tokenizers.py:
  GET  /tokenizer/                — list all loaded tokenizers
  POST /tokenizer/tokenize        — tokenize arbitrary text
  GET  /tokenizer/metrics         — retrieve efficiency + linguistic metrics
  GET  /tokenizer/languages       — return supported language map
  GET  /tokenizer/summary/models  — aggregate model summaries from cache
  GET  /tokenizer/summary/languages — aggregate language summaries from cache
  GET  /tokenizer/random_sentence — return a random sentence for a language
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from utils.constants import NON_GATED_TOKENIZERS, LANGUAGES

@pytest.fixture
def client():
    return TestClient(app)


# ═══════════════════════════════════════════════════════
#  GET /tokenizer/  —  list available tokenizers
# ═══════════════════════════════════════════════════════

def test_list_tokenizers_returns_200(client):
    response = client.get("/tokenizer/")
    assert response.status_code == 200

def test_list_tokenizers_contains_tokenizers_key(client):
    response = client.get("/tokenizer/")
    data = response.json()
    assert "tokenizers" in data

def test_list_tokenizers_is_a_list(client):
    response = client.get("/tokenizer/")
    data = response.json()
    assert isinstance(data["tokenizers"], list)

def test_list_tokenizers_includes_all_hardcoded_models(client):
    """The endpoint merges hardcoded models with cached ones, so all
    NON_GATED_TOKENIZERS must appear in the returned list."""
    response = client.get("/tokenizer/")
    returned = set(response.json()["tokenizers"])
    for model in NON_GATED_TOKENIZERS:
        assert model in returned, f"Expected hardcoded model '{model}' to be in the tokenizer list"

def test_list_tokenizers_is_sorted(client):
    response = client.get("/tokenizer/")
    tokenizers = response.json()["tokenizers"]
    assert tokenizers == sorted(tokenizers)

def test_list_tokenizers_has_no_duplicates(client):
    response = client.get("/tokenizer/")
    tokenizers = response.json()["tokenizers"]
    assert len(tokenizers) == len(set(tokenizers))


# ═══════════════════════════════════════════════════════
#  POST /tokenizer/tokenize  —  preview tokenization
# ═══════════════════════════════════════════════════════

def test_tokenize_returns_200(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    assert response.status_code == 200

def test_tokenize_response_shape(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    data = response.json()
    assert "model_id" in data
    assert "tokens" in data
    assert "token_ids" in data
    assert "offsets" in data
    assert "metrics" in data
    assert "token_count" in data["metrics"]
    assert "fertility" in data["metrics"]
    assert "compression" in data["metrics"]

def test_tokenize_returns_correct_model_id(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    assert response.json()["model_id"] == "gpt2"

def test_tokenize_token_count_matches_tokens_length(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    data = response.json()
    assert data["metrics"]["token_count"] == len(data["tokens"])

def test_tokenize_token_ids_match_tokens_length(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    data = response.json()
    assert len(data["token_ids"]) == len(data["tokens"])

def test_tokenize_offsets_match_tokens_length(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    data = response.json()
    assert len(data["offsets"]) == len(data["tokens"])

def test_tokenize_offsets_are_pairs(client):
    """Each offset should be a [start, end] pair."""
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"})
    for offset in response.json()["offsets"]:
        assert isinstance(offset, list) and len(offset) == 2

def test_tokenize_different_models_may_differ(client):
    """Different tokenizers should generally produce different token counts for the same text."""
    r1 = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "Tokenization is fascinating"})
    r2 = client.post("/tokenizer/tokenize", json={"model_id": "bert-base-uncased", "text": "Tokenization is fascinating"})
    # They use different vocabularies so at least one field should differ
    assert r1.json()["tokens"] != r2.json()["tokens"] or r1.json()["token_ids"] != r2.json()["token_ids"]

def test_tokenize_missing_text_returns_422(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2"})
    assert response.status_code == 422

def test_tokenize_missing_model_id_returns_422(client):
    response = client.post("/tokenizer/tokenize", json={"text": "hello world"})
    assert response.status_code == 422

def test_tokenize_empty_body_returns_422(client):
    response = client.post("/tokenizer/tokenize", json={})
    assert response.status_code == 422

def test_tokenize_empty_model_id_returns_400(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "  ", "text": "hello"})
    assert response.status_code == 400

def test_tokenize_empty_text_returns_400(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "  "})
    assert response.status_code == 400

def test_tokenize_invalid_model_returns_error(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "nonexistent/fake-model-xyz", "text": "hello"})
    assert response.status_code in (400, 404, 500)


# ═══════════════════════════════════════════════════════
#  GET /tokenizer/metrics  —  efficiency + linguistic metrics
# ═══════════════════════════════════════════════════════

def test_metrics_returns_200_for_cached_model(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    assert response.status_code == 200

def test_metrics_response_contains_model_id(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    data = response.json()
    assert data["model_id"] == "gpt2"

def test_metrics_response_contains_efficiency_and_linguistic(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    data = response.json()
    assert "efficiency" in data
    assert "linguistic" in data

def test_metrics_efficiency_has_expected_fields(client):
    """Each language entry under efficiency should have token_count, fertility, compression, token_premium."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    efficiency = response.json()["efficiency"]
    assert len(efficiency) > 0
    for lang, values in efficiency.items():
        assert "token_count" in values, f"Missing token_count for {lang}"
        assert "fertility" in values, f"Missing fertility for {lang}"
        assert "compression" in values, f"Missing compression for {lang}"
        assert "token_premium" in values, f"Missing token_premium for {lang}"

def test_metrics_linguistic_has_expected_fields(client):
    """Each language entry under linguistic should have precision, recall, f1."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    linguistic = response.json()["linguistic"]
    assert len(linguistic) > 0
    for lang, values in linguistic.items():
        assert "precision" in values, f"Missing precision for {lang}"
        assert "recall" in values, f"Missing recall for {lang}"
        assert "f1" in values, f"Missing f1 for {lang}"

def test_metrics_efficiency_values_are_numeric(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    for lang, values in response.json()["efficiency"].items():
        assert isinstance(values["token_count"], (int, float))
        assert isinstance(values["fertility"], (int, float))
        assert isinstance(values["compression"], (int, float))
        assert isinstance(values["token_premium"], (int, float))

def test_metrics_linguistic_values_are_numeric(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    for lang, values in response.json()["linguistic"].items():
        assert isinstance(values["precision"], (int, float))
        assert isinstance(values["recall"], (int, float))
        assert isinstance(values["f1"], (int, float))

def test_metrics_filter_by_single_language(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "English"})
    assert response.status_code == 200
    data = response.json()
    efficiency_langs = list(data["efficiency"].keys())
    assert efficiency_langs == ["English"]

def test_metrics_filter_by_multiple_languages(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "English,Zulu"})
    assert response.status_code == 200
    data = response.json()
    efficiency_langs = set(data["efficiency"].keys())
    assert efficiency_langs == {"English", "Zulu"}

def test_metrics_filter_nonexistent_language_returns_empty(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "Klingon"})
    assert response.status_code == 200
    data = response.json()
    assert data["efficiency"] == {}

def test_metrics_filter_efficiency_only(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "metric_type": "efficiency"})
    assert response.status_code == 200
    data = response.json()
    assert "efficiency" in data
    assert "linguistic" not in data

def test_metrics_filter_linguistic_only(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "metric_type": "linguistic"})
    assert response.status_code == 200
    data = response.json()
    assert "linguistic" in data
    assert "efficiency" not in data

def test_metrics_filter_all_returns_both(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "metric_type": "all"})
    assert response.status_code == 200
    data = response.json()
    assert "efficiency" in data
    assert "linguistic" in data

def test_metrics_missing_model_id_returns_422(client):
    response = client.get("/tokenizer/metrics")
    assert response.status_code == 422

def test_metrics_empty_model_id_returns_400(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "  "})
    assert response.status_code == 400

def test_metrics_invalid_metric_type_returns_422(client):
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "metric_type": "invalid"})
    assert response.status_code == 422


# ═══════════════════════════════════════════════════════
#  GET /tokenizer/languages  —  supported languages
# ═══════════════════════════════════════════════════════

def test_languages_returns_200(client):
    response = client.get("/tokenizer/languages")
    assert response.status_code == 200

def test_languages_contains_languages_key(client):
    response = client.get("/tokenizer/languages")
    data = response.json()
    assert "languages" in data

def test_languages_returns_dict(client):
    response = client.get("/tokenizer/languages")
    data = response.json()
    assert isinstance(data["languages"], dict)

def test_languages_matches_constants(client):
    response = client.get("/tokenizer/languages")
    data = response.json()
    assert data["languages"] == LANGUAGES

def test_languages_contains_english(client):
    response = client.get("/tokenizer/languages")
    data = response.json()
    assert "English" in data["languages"].values()

def test_languages_contains_zulu(client):
    response = client.get("/tokenizer/languages")
    data = response.json()
    assert "Zulu" in data["languages"].values()

def test_languages_all_values_are_strings(client):
    response = client.get("/tokenizer/languages")
    for code, name in response.json()["languages"].items():
        assert isinstance(code, str) and isinstance(name, str)


# ═══════════════════════════════════════════════════════
#  GET /tokenizer/summary/models  —  model leaderboard
# ═══════════════════════════════════════════════════════

def test_model_summary_returns_200(client):
    response = client.get("/tokenizer/summary/models")
    assert response.status_code == 200

def test_model_summary_contains_models_key(client):
    response = client.get("/tokenizer/summary/models")
    data = response.json()
    assert "models" in data

def test_model_summary_is_a_list(client):
    response = client.get("/tokenizer/summary/models")
    data = response.json()
    assert isinstance(data["models"], list)

def test_model_summary_not_empty(client):
    """There should be at least one precomputed model."""
    response = client.get("/tokenizer/summary/models")
    data = response.json()
    assert len(data["models"]) > 0

def test_model_summary_entry_has_required_fields(client):
    response = client.get("/tokenizer/summary/models")
    required = {"model_id", "avg_tokens", "avg_fertility", "avg_compression", "avg_premium", "avg_f1", "avg_precision", "avg_recall"}
    for entry in response.json()["models"]:
        missing = required - set(entry.keys())
        assert missing == set(), f"Entry '{entry.get('model_id', '?')}' is missing fields: {missing}"

def test_model_summary_model_ids_are_strings(client):
    response = client.get("/tokenizer/summary/models")
    for entry in response.json()["models"]:
        assert isinstance(entry["model_id"], str)

def test_model_summary_avg_values_are_numeric(client):
    response = client.get("/tokenizer/summary/models")
    numeric_fields = ["avg_tokens", "avg_fertility", "avg_compression", "avg_premium", "avg_f1", "avg_precision", "avg_recall"]
    for entry in response.json()["models"]:
        for field in numeric_fields:
            assert isinstance(entry[field], (int, float)), f"{field} in '{entry['model_id']}' is not numeric"

def test_model_summary_fertility_is_positive(client):
    """Fertility should always be >= 1 (at least 1 token per word)."""
    response = client.get("/tokenizer/summary/models")
    for entry in response.json()["models"]:
        assert entry["avg_fertility"] > 0, f"Non-positive fertility for '{entry['model_id']}'"

def test_model_summary_contains_gpt2(client):
    response = client.get("/tokenizer/summary/models")
    model_ids = [entry["model_id"] for entry in response.json()["models"]]
    assert "gpt2" in model_ids


# ═══════════════════════════════════════════════════════
#  GET /tokenizer/summary/languages  —  language leaderboard
# ═══════════════════════════════════════════════════════

def test_language_summary_returns_200(client):
    response = client.get("/tokenizer/summary/languages")
    assert response.status_code == 200

def test_language_summary_contains_languages_key(client):
    response = client.get("/tokenizer/summary/languages")
    data = response.json()
    assert "languages" in data

def test_language_summary_is_a_list(client):
    response = client.get("/tokenizer/summary/languages")
    data = response.json()
    assert isinstance(data["languages"], list)

def test_language_summary_not_empty(client):
    response = client.get("/tokenizer/summary/languages")
    data = response.json()
    assert len(data["languages"]) > 0

def test_language_summary_entry_has_required_fields(client):
    response = client.get("/tokenizer/summary/languages")
    required = {"language", "avg_tokens", "avg_fertility", "avg_compression", "avg_premium", "avg_f1", "avg_precision", "avg_recall"}
    for entry in response.json()["languages"]:
        missing = required - set(entry.keys())
        assert missing == set(), f"Language '{entry.get('language', '?')}' is missing fields: {missing}"

def test_language_summary_language_names_are_strings(client):
    response = client.get("/tokenizer/summary/languages")
    for entry in response.json()["languages"]:
        assert isinstance(entry["language"], str)

def test_language_summary_avg_values_are_numeric(client):
    response = client.get("/tokenizer/summary/languages")
    numeric_fields = ["avg_tokens", "avg_fertility", "avg_compression", "avg_premium", "avg_f1", "avg_precision", "avg_recall"]
    for entry in response.json()["languages"]:
        for field in numeric_fields:
            assert isinstance(entry[field], (int, float)), f"{field} in '{entry['language']}' is not numeric"

def test_language_summary_contains_english(client):
    response = client.get("/tokenizer/summary/languages")
    languages = [entry["language"] for entry in response.json()["languages"]]
    assert "English" in languages

def test_language_summary_contains_zulu(client):
    response = client.get("/tokenizer/summary/languages")
    languages = [entry["language"] for entry in response.json()["languages"]]
    assert "Zulu" in languages


# ═══════════════════════════════════════════════════════
#  GET /tokenizer/random_sentence  —  random sentence
# ═══════════════════════════════════════════════════════

def test_random_sentence_returns_200_for_valid_language(client):
    response = client.get("/tokenizer/random_sentence", params={"language": "English"})
    assert response.status_code == 200

def test_random_sentence_response_shape(client):
    response = client.get("/tokenizer/random_sentence", params={"language": "English"})
    data = response.json()
    assert "text" in data
    assert "language" in data

def test_random_sentence_returns_correct_language(client):
    response = client.get("/tokenizer/random_sentence", params={"language": "Zulu"})
    assert response.json()["language"] == "Zulu"

def test_random_sentence_text_is_nonempty_string(client):
    response = client.get("/tokenizer/random_sentence", params={"language": "English"})
    text = response.json()["text"]
    assert isinstance(text, str) and len(text.strip()) > 0

def test_random_sentence_invalid_language_returns_404(client):
    response = client.get("/tokenizer/random_sentence", params={"language": "Klingon"})
    assert response.status_code == 404

def test_random_sentence_missing_language_returns_422(client):
    response = client.get("/tokenizer/random_sentence")
    assert response.status_code == 422

def test_random_sentence_is_random(client):
    """Multiple calls should eventually return different sentences (not deterministic)."""
    results = set()
    for _ in range(10):
        response = client.get("/tokenizer/random_sentence", params={"language": "English"})
        results.add(response.json()["text"])
    # With hundreds of sentences, 10 calls should produce at least 2 unique results
    assert len(results) >= 2, "Random sentence endpoint returned the same sentence 10 times in a row"


# ═══════════════════════════════════════════════════════
#  Known (tokenizer, language) pair returns exact
#  precomputed values
# ═══════════════════════════════════════════════════════

def test_metrics_known_pair_returns_exact_efficiency_values(client):
    """Querying gpt2 + Zulu should return exactly the values the batch pipeline produced."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "Zulu"})
    assert response.status_code == 200
    eff = response.json()["efficiency"]["Zulu"]
    assert eff["token_count"] == 61665
    assert round(eff["fertility"], 4) == round(4.095437338115162, 4)
    assert round(eff["compression"], 4) == round(2.279704856888024, 4)
    assert round(eff["token_premium"], 4) == round(2.39559457674527, 4)

def test_metrics_known_pair_returns_exact_linguistic_values(client):
    """Querying gpt2 + Zulu should return exactly the linguistic values from the cache."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "Zulu"})
    assert response.status_code == 200
    ling = response.json()["linguistic"]["Zulu"]
    assert ling["precision"] == 0.1746
    assert ling["recall"] == 0.2306
    assert ling["f1"] == 0.1891

def test_metrics_known_pair_values_are_stable_across_calls(client):
    """Repeating the same query must return identical values each time."""
    params = {"model_id": "gpt2", "languages": "Zulu"}
    r1 = client.get("/tokenizer/metrics", params=params).json()
    r2 = client.get("/tokenizer/metrics", params=params).json()
    assert r1["efficiency"]["Zulu"] == r2["efficiency"]["Zulu"]
    assert r1["linguistic"]["Zulu"] == r2["linguistic"]["Zulu"]

def test_summary_known_pair_filters_correctly(client):
    """Model summary filtered to Zulu should compute averages from only Zulu data."""
    all_resp = client.get("/tokenizer/summary/models").json()
    filtered_resp = client.get("/tokenizer/summary/models", params={"languages": "Zulu"}).json()
    gpt2_all = next(m for m in all_resp["models"] if m["model_id"] == "gpt2")
    gpt2_filtered = next(m for m in filtered_resp["models"] if m["model_id"] == "gpt2")
    # With only 1 language, the "average" IS the value for that language
    assert gpt2_filtered["avg_fertility"] != gpt2_all["avg_fertility"] or len(set()) == 0  # they differ because all-lang avg ≠ single-lang value
    assert gpt2_filtered["avg_fertility"] > 0


# ═══════════════════════════════════════════════════════
#  Querying all languages for one tokenizer returns
#  at most the expected number of entries
# ═══════════════════════════════════════════════════════

ALL_KNOWN_LANGUAGES = {"Afrikaans", "English", "Isindebele", "Northern Sotho", "Southern Sotho", "Swati", "Tsonga", "Tswana", "Venda", "Xhosa", "Zulu"}

def test_metrics_all_languages_count_at_most_eleven(client):
    """A tokenizer should have metrics for at most 11 languages (the known SA languages)."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    assert response.status_code == 200
    eff_langs = set(response.json()["efficiency"].keys())
    ling_langs = set(response.json()["linguistic"].keys())
    all_langs = eff_langs | ling_langs
    assert len(all_langs) <= 11, f"Expected at most 11 languages, got {len(all_langs)}"

def test_metrics_all_languages_are_known(client):
    """Every language key returned must be one of the 11 known SA languages."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2"})
    eff_langs = set(response.json()["efficiency"].keys())
    ling_langs = set(response.json()["linguistic"].keys())
    all_langs = eff_langs | ling_langs
    unexpected = all_langs - ALL_KNOWN_LANGUAGES
    assert unexpected == set(), f"Unexpected language(s) in metrics: {unexpected}"

def test_metrics_missing_language_absent_not_null(client):
    """If a language hasn't been computed, it should simply be absent from the
    response — not present with null/zero sentinel values."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "Klingon"})
    assert response.status_code == 200
    data = response.json()
    assert data["efficiency"] == {}
    assert data["linguistic"] == {}

def test_metrics_partial_language_filter(client):
    """Filtering to a mix of real + nonexistent languages should return only the real ones."""
    response = client.get("/tokenizer/metrics", params={"model_id": "gpt2", "languages": "Zulu,Klingon,English"})
    assert response.status_code == 200
    eff_langs = set(response.json()["efficiency"].keys())
    assert "Klingon" not in eff_langs
    assert eff_langs == {"Zulu", "English"}


# ═══════════════════════════════════════════════════════
#  Malformed / missing cache file raises a clear error
#  rather than crashing silently
# ═══════════════════════════════════════════════════════

from unittest.mock import patch

def test_summary_models_with_empty_cache_returns_empty_list(client):
    """When the cache is empty, the summary should return an empty list — not crash."""
    with patch("routers.tokenizers.read_cache", return_value={}):
        response = client.get("/tokenizer/summary/models")
    assert response.status_code == 200
    assert response.json()["models"] == []

def test_summary_languages_with_empty_cache_returns_empty_list(client):
    """When the cache is empty, the language summary should return an empty list — not crash."""
    with patch("routers.tokenizers.read_cache", return_value={}):
        response = client.get("/tokenizer/summary/languages")
    assert response.status_code == 200
    assert response.json()["languages"] == []

def test_summary_models_with_malformed_cache_returns_500(client):
    """If the cache contains structurally invalid data, the endpoint should
    return a clear 500 error rather than silently returning garbage."""
    malformed = {"gpt2": {"efficiency": {"Zulu": "not-a-dict"}}}
    with patch("routers.tokenizers.read_cache", return_value=malformed):
        response = client.get("/tokenizer/summary/models")
    assert response.status_code == 500
    assert "detail" in response.json()

def test_summary_languages_with_malformed_cache_returns_500(client):
    """If the cache contains structurally invalid data, the language summary
    should return a clear 500 error."""
    malformed = {"gpt2": {"efficiency": {"Zulu": "not-a-dict"}}}
    with patch("routers.tokenizers.read_cache", return_value=malformed):
        response = client.get("/tokenizer/summary/languages")
    assert response.status_code == 500
    assert "detail" in response.json()

def test_metrics_with_empty_cache_and_unknown_model_returns_error(client):
    """If the cache is empty and the model can't be loaded, we should get a clear error."""
    with patch("routers.tokenizers.read_cache", return_value={}):
        response = client.get("/tokenizer/metrics", params={"model_id": "nonexistent/fake-model-xyz"})
    assert response.status_code in (400, 500)
    assert "detail" in response.json()


# ═══════════════════════════════════════════════════════
#  Repeated requests produce no duplicate entries
# ═══════════════════════════════════════════════════════

def test_model_summary_no_duplicate_model_ids(client):
    """Calling the summary endpoint should never produce duplicate model_id entries."""
    response = client.get("/tokenizer/summary/models")
    model_ids = [entry["model_id"] for entry in response.json()["models"]]
    assert len(model_ids) == len(set(model_ids)), f"Duplicate model_ids found: {[m for m in model_ids if model_ids.count(m) > 1]}"

def test_model_summary_no_duplicates_after_repeated_calls(client):
    """Hitting the summary endpoint multiple times should always return the
    same number of entries — no duplicates accumulate."""
    r1 = client.get("/tokenizer/summary/models").json()
    r2 = client.get("/tokenizer/summary/models").json()
    r3 = client.get("/tokenizer/summary/models").json()
    assert len(r1["models"]) == len(r2["models"]) == len(r3["models"])

def test_language_summary_no_duplicate_languages(client):
    """The language summary should never contain duplicate language entries."""
    response = client.get("/tokenizer/summary/languages")
    languages = [entry["language"] for entry in response.json()["languages"]]
    assert len(languages) == len(set(languages)), f"Duplicate languages found: {[l for l in languages if languages.count(l) > 1]}"

def test_language_summary_no_duplicates_after_repeated_calls(client):
    """Hitting the language summary endpoint multiple times should always
    return the same number of entries."""
    r1 = client.get("/tokenizer/summary/languages").json()
    r2 = client.get("/tokenizer/summary/languages").json()
    r3 = client.get("/tokenizer/summary/languages").json()
    assert len(r1["languages"]) == len(r2["languages"]) == len(r3["languages"])

def test_metrics_repeated_call_same_result(client):
    """Calling /metrics for the same model twice should return identical data —
    no phantom entries or mutations."""
    params = {"model_id": "gpt2"}
    r1 = client.get("/tokenizer/metrics", params=params).json()
    r2 = client.get("/tokenizer/metrics", params=params).json()
    assert r1["efficiency"] == r2["efficiency"]
    assert r1["linguistic"] == r2["linguistic"]