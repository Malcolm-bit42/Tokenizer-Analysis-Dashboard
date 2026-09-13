import type { languages_t, LanguageSummary, metric_t, MetricsResponse, ModelSummary, TokenizeResponse } from "../utils/types";

const BASE_URL: string = 'http://localhost:8000';

export async function getTokenizers(): Promise<string[]> {
    // this is a method to get all tokenizers predownloaded (fixed number)
    const response = await fetch(`${BASE_URL}/tokenizer`);

    if (!response.ok) throw new Error("There was an error fetching the tokenizers. Please try again: " + response.status);

    const data = await response.json();

    return data.tokenizers;

}

export async function getMetrics(model_id: string, languages?: languages_t, metric_type?: metric_t): Promise<MetricsResponse> {
    // Get all efficiency + linguistic metrics for a speific tokenizer.
    const params = new URLSearchParams({ model_id });

    if (languages && languages.length > 0) {
        params.set('languages', languages.join(','));
    }

    if (metric_type && metric_type !== 'all') {
        params.set('metric_type', metric_type);
    }

    const res = await fetch(`${BASE_URL}/tokenizer/metrics?${params.toString()}`);

    if (!res.ok) throw new Error('Failed to fetch metrics: ' + res.status);


    return res.json();
}

export async function getLanguages():Promise<Record<string, string>> {

    const res = await fetch(`${BASE_URL}/tokenizer/languages`);


    if (!res.ok) throw new Error('Failed to fetch languages: ' + res.status);

    const data = await res.json();

    return data.languages;    
}

export async function tokeniseText(model_id: string, text: string): Promise<TokenizeResponse> {

    const res = await fetch(`${BASE_URL}/tokenizer/tokenize`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id, text }),
    });


    if (!res.ok) throw new Error('Failed to tokenize text. Please try again : ' + res.status);
    
    return res.json();

}

export async function getModelSummary(): Promise<ModelSummary | any> {

    const res = await fetch(`${BASE_URL}/tokenizer/summary/models`);

    if (!res.ok) throw new Error('Failed to fetch model summary: ' + res.status);

    const data = await res.json();

    return data.models;

}

export async function getLanguageSummary(): Promise<LanguageSummary | any> {
    const res = await fetch(`${BASE_URL}/tokenizer/summary/languages`);

    if (!res.ok) throw new Error("Failed to fetch langauge summary: " + res.body);

    const data = await res.json();

    return data.languages;

}

export async function getRandomSentence(language: string): Promise<{ text: string; language: string }> {
  // TODO: point this at your real endpoint once it exists
  const res = await fetch(`${BASE_URL}/tokenizer/random_sentence?language=${language}`);

  if (!res.ok) throw new Error("Failed to fetch random sentence: " + res.status);

  const data = await res.json();

  return data;
}