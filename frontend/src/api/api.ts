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

export async function getMetrics(model_id: string) {
    // Get all efficiency + linguistic metrics for a speific tokenizer.
    try {
        const res = await fetch(`${BASE_URL}/tokenizer/metrics`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: model_id })});

        if (!res.ok) {
            throw new Error("Failed to fetch all metrics: " +res.status);
        }

        const data = await res.json();

        return data;
    } catch (error) {
        console.error("An error occurred when fetching the metrics: " + error);
        throw error;
        
    }
    
}