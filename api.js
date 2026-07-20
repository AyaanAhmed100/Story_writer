// api.js
export class GroqAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = "https://api.groq.com/openai/v1/chat/completions";
        this.abortController = null;
    }

    setApiKey(key) {
        this.apiKey = key;
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
            model: "qwen/qwen3.6-27b",
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

        // Standard Server-Sent Events (SSE) parsing loop
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Keep the last incomplete line in the buffer
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
