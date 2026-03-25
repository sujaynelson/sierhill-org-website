const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';

async function getEmbedding(text) {
    // Truncate to ~8000 tokens worth of text (~32000 chars) to stay within model limits
    const truncated = text.slice(0, 32000);

    const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            input: truncated,
            model: MODEL,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.data[0].embedding;
}

module.exports = { getEmbedding };
