"""
Unit tests for the tokenizer API endpoints.

Tests cover all routes defined in routers/tokenizers.py:
  GET  /tokenizer/          — list all loaded tokenizers
  POST /tokenizer/tokenize  — tokenize arbitrary text
  GET  /tokenizer/metrics   — retrieve efficiency + linguistic metrics
  GET  /tokenizer/languages — return supported language map
  GET  /tokenizer/summary   — aggregate model summaries from cache
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from utils.constants import NON_GATED_TOKENIZERS

@pytest.fixture
def client():
    return TestClient(app)

# ───────────────────────────────────────────────────────
#  GET /tokenizer/  —  list available tokenizers
# ───────────────────────────────────────────────────────

def test_returns_200(client):
    response = client.get("/tokenizer/")
    assert response.status_code == 200

def test_response_contains_tokenizers_key(client):
    response = client.get("/tokenizer/")
    data = response.json()
    assert "tokenizers" in data

def test_tokenizers_is_a_list(client):
    response = client.get("/tokenizer/")
    data = response.json()
    assert isinstance(data["tokenizers"], list)

def test_returns_expected_mock_tokenizers(client):
    response = client.get("/tokenizer/")
    data = response.json()
    NON_GATED_TOKENIZERS.sort()
    assert data["tokenizers"] == NON_GATED_TOKENIZERS




# ───────────────────────────────────────────────────────
#  POST /tokenizer/tokenize  —  preview tokenization
# ───────────────────────────────────────────────────────

def test_tokenize_returns_200(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"},)
    assert response.status_code == 200


def test_tokenize_response_shape(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"},)
    data = response.json()
    assert "model_id" in data
    assert "token_count" in data
    assert "tokens" in data
    assert "token_ids" in data
    assert "offsets" in data

def test_tokenize_returns_correct_model_id(client):
     response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"},)
     assert response.json()["model_id"] == "gpt2"

def test_tokenize_token_count_matches_tokens_length(client):
    response = client.post("/tokenizer/tokenize", json={"model_id": "gpt2", "text": "hello world"},)
    data = response.json()
    assert data["token_count"] == len(data["tokens"])

def test_tokenize_missing_text_returns_422(client):
    response = client.post("/tokenizer/tokenize",json={"model_id": "gpt2"}, )
    assert response.status_code == 422

def test_tokenize_missing_model_id_returns_422(client):
    response = client.post("/tokenizer/tokenize",json={"text": "hello world"},)
    assert response.status_code == 422

def test_tokenize_empty_body_returns_422(client):
    response = client.post("/tokenizer/tokenize", json={})
    assert response.status_code == 422

def test_tokenize_invalid_model_returns_400(client):

    response = client.post("/tokenizer/tokenize",json={"model_id": "blahblahblah/model", "text": "hello"},)
    assert response.status_code == 400
    assert "Unable to load tokenizer  blahblahblah/model: blahblahblah/model is not a local folder and is not a valid model identifier listed on 'https://huggingface.co/models'\nIf this is a private repository, make sure to pass a token having permission to this repo either by logging in with `hf auth login` or by passing `token=<your_token>`" in response.json()["detail"]
    