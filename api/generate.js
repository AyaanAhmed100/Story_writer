import fetch from 'node-fetch';

export const config = {
  runtime: 'edge', // Using Edge runtime for ultra-low latency streaming
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Groq API Key not configured on Vercel.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // Or your preferred Groq model
        messages: [
          { role: 'system', content: 'You are a master novelist and creative story writer. Craft deeply engaging, vivid stories.' },
          { role: 'user', content: prompt }
        ],
        stream: true, // Enables real-time text streaming
      }),
    });

    // Pipe the Groq stream directly back to the frontend
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
