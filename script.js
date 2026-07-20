const promptInput = document.getElementById('promptInput');
const actionButton = document.getElementById('actionButton');
const storyDisplay = document.getElementById('storyDisplay');
const placeholder = document.getElementById('placeholder');

let isGenerating = false;
let abortController = null;

// Auto-grow textarea functionality
promptInput.addEventListener('input', () => {
  promptInput.style.height = 'auto';
  promptInput.style.height = `${promptInput.scrollHeight}px`;
});

actionButton.addEventListener('click', handleAction);

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAction();
  }
});

async function handleAction() {
  if (isGenerating) {
    stopGeneration();
    return;
  }

  const promptText = promptInput.value.trim();
  if (!promptText) return;

  startGeneration(promptText);
}

function startGeneration(prompt) {
  isGenerating = true;
  abortController = new AbortController();
  
  // UI State Transition
  actionButton.className = 'stop-state';
  promptInput.value = '';
  promptInput.style.height = 'auto';
  promptInput.disabled = true;
  
  if (placeholder) placeholder.remove();
  storyDisplay.textContent = ''; // Clear prior generation

  executeStreamFetch(prompt);
}

function stopGeneration() {
  if (abortController) {
    abortController.abort();
  }
  finalizeGenerationState();
}

function finalizeGenerationState() {
  isGenerating = false;
  actionButton.className = 'send-state';
  promptInput.disabled = false;
  promptInput.focus();
}

async function executeStreamFetch(prompt) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: abortController.signal
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Server error occurred.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process lines emitted by Groq SSE chunk format
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Retain incomplete line context

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine || cleanedLine === 'data: [DONE]') continue;

        if (cleanedLine.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(cleanedLine.replace(/^data: /, ''));
            const textChunk = parsed.choices[0]?.delta?.content || '';
            storyDisplay.textContent += textChunk;
            
            // Lock window scroll position to tracking baseline
            storyDisplay.scrollTop = storyDisplay.scrollHeight;
          } catch (e) {
            // Silence fragment parsing anomalies safely
          }
        }
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      storyDisplay.innerHTML += `\n\n<span style="color: var(--accent-stop)">[System Error: ${error.message}]</span>`;
    }
  } finally {
    finalizeGenerationState();
  }
}
