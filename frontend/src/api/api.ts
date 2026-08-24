import type { languages_t, metric_t } from "../utils/types";

const BASE_URL: string = 'http://localhost:8000';

export async function getTokenizers() {
    // this is a method to get all tokenizers predownloaded (fixed number)
    try {
        const response: Response = await fetch(`${BASE_URL}/tokenizer`);

        if (!response.ok) {
            throw new Error("There was an error fetching the tokenizers. Please try again: " + response.status);
        }

        const data = await response.json() as any;

        return data.tokenizers;

    } catch (error: any) {
        console.error("Error fetching tokenizers: " + error);
        throw error;
    }
}

export async function getMetrics(model_id: string, languages?: languages_t, metric_type?: metric_t) {
    // Get all efficiency + linguistic metrics for a speific tokenizer.
    try {

        const params = new URLSearchParams({ model_id });
        if (languages && languages.length > 0) {
            params.set('languages', languages.join(','));
        }
        if (metric_type && metric_type !== 'all') {
            params.set('metric_type', metric_type);
        }
        const res = await fetch(`${BASE_URL}/tokenizer/metrics?${params.toString()}`);
        

        if (!res || !res.ok) {
            throw new Error("Failed to fetch all metrics: " +res.status);
        }

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("An error occurred when fetching the metrics: " + error);
        throw error;
        
    }
    
}

export async function getLanguages() {
    try {

        const res = await fetch(`${BASE_URL}/tokenizer/languages`);

        if (!res || !res.ok) {
            console.error(res);
            throw new Error("Failed to fetch all metrics: " +res.status);

        }

        const data = await res.json();

        return data;
        
    } catch (error) {
        console.error("Error getting the langues: "+error);
        throw error;
    }
    
}

export async function tokeniseText(model_id: string, text: string) {
    try {
        const res = await fetch(`${BASE_URL}/tokenizer/preview`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model_id: model_id,
                text: text
            })
        });

        if (!res.ok || !res) {
            console.error("Error trying to tokenize text: " +res);
            throw new Error("Error trying to tokenize text: " + res);
        }

        const data = await res.json();
        return data;
        
    } catch (error) {   
        console.error("Error tokenizing text: " +error);
        throw error;
        
    }
    
}