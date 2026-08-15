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