// api.js
export class GroqAPI {
    constructor() {
        // IMPORTANT: Replace this string with your actual Groq API key
        this.apiKey = "gsk_YOUR_ACTUAL_API_KEY_HERE"; 
        this.baseURL = "https://api.groq.com/openai/v1/chat/completions";
        this.abortController = null;
    }

    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    async *streamStory(prompt, systemPrompt) {
        this.abortController = new AbortController();
        
        const payload = {
            model: "llama3-70b-8192", // Excellent Groq model for story writing
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            stream: true,
            temperature: 0.75,
            max_tokens: 4096
        };

        const response = await fetch(this.baseURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(payload),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;
                
                if (trimmed.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const chunk = data.choices[0]?.delta?.content;
                        if (chunk) yield chunk;
                    } catch (e) {
                        console.warn("Could not parse stream chunk", trimmed);
                    }
                }
            }
        }
    }
}
