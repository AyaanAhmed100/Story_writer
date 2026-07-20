// app.js
import { GroqAPI } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const promptInput = document.getElementById('prompt-input');
    const actionBtn = document.getElementById('action-btn');
    const sendIcon = document.getElementById('send-icon');
    const stopIcon = document.getElementById('stop-icon');
    const storyContainer = document.getElementById('story-container');
    const apiKeyInput = document.getElementById('api-key-input');
    const welcomeScreen = document.getElementById('welcome-screen');
    
    let isGenerating = false;
    
    // Initialize API (Lightweight client-side setup)
    const storedKey = localStorage.getItem('groq_api_key') || "";
    if (storedKey) apiKeyInput.value = storedKey;
    const api = new GroqAPI(storedKey);

    // Auto-resize prompt box up to a maximum height
    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
    });

    // Save API key on change
    apiKeyInput.addEventListener('change', (e) => {
        const key = e.target.value.trim();
        localStorage.setItem('groq_api_key', key);
        api.setApiKey(key);
    });

    // Handle Enter to submit (Shift+Enter for new line)
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAction();
        }
    });

    actionBtn.addEventListener('click', handleAction);

    function toggleState(generating) {
        isGenerating = generating;
        if (generating) {
            sendIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
            actionBtn.classList.replace('bg-indigo-600', 'bg-red-500');
            actionBtn.classList.replace('hover:bg-indigo-500', 'hover:bg-red-600');
        } else {
            sendIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
            actionBtn.classList.replace('bg-red-500', 'bg-indigo-600');
            actionBtn.classList.replace('hover:bg-red-600', 'hover:bg-indigo-500');
        }
    }

    async function handleAction() {
        if (isGenerating) {
            api.abort();
            toggleState(false);
            return;
        }

        const prompt = promptInput.value.trim();
        if (!prompt) return;
        if (!api.apiKey) {
            alert("Please enter your Groq API Key in the top navigation.");
            return;
        }

        // Setup UI for new generation
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        promptInput.value = '';
        promptInput.style.height = 'auto';
        toggleState(true);
        
        // Append user prompt
        appendMessage('user', prompt);
        
        // Create AI response container
        const responseElement = appendMessage('assistant', '<span class="animate-pulse text-zinc-500">Formulating narrative...</span>');
        let currentText = "";
        
        // Master system prompt for storytelling
        const systemPrompt = "You are a master AI story writer. Create immersive, structurally sound narratives with compelling character arcs and rich sensory details. Break your text into clean, readable paragraphs.";

        try {
            const stream = api.streamStory(prompt, systemPrompt);
            responseElement.innerHTML = ""; // Clear the loader text
            
            for await (const chunk of stream) {
                currentText += chunk;
                // Live rendering with basic double-newline to paragraph formatting
                responseElement.innerHTML = currentText.split('\n\n').map(p => `<p class="mb-4 last:mb-0">${p.replace(/\n/g, '<br>')}</p>`).join('');
                
                // Auto-scroll to the bottom of the document as it writes
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                responseElement.innerHTML += `<div class="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-md mt-2">Error: ${error.message}</div>`;
            } else {
                responseElement.innerHTML += `<div class="text-zinc-500 mt-4 text-xs font-mono uppercase tracking-widest border-t border-zinc-800 pt-3">[ Sequence Terminated ]</div>`;
            }
        } finally {
            toggleState(false);
        }
    }

    function appendMessage(role, content) {
        const wrapper = document.createElement('div');
        wrapper.className = `w-full max-w-4xl mx-auto flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-8 px-4`;
        
        const bubble = document.createElement('div');
        bubble.className = `p-6 rounded-2xl max-w-[85%] text-zinc-200 leading-relaxed text-[15px] ${
            role === 'user' 
            ? 'bg-zinc-800 rounded-br-sm' 
            : 'bg-transparent border border-zinc-800 rounded-bl-sm'
        }`;
        
        bubble.innerHTML = role === 'user' ? `<p>${content}</p>` : content;
        wrapper.appendChild(bubble);
        storyContainer.appendChild(wrapper);
        return bubble;
    }
});
