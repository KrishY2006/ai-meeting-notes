const { getExtractionPrompt } = require('./prompts');

const DEFAULT_OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function extractJson(raw) {
  const trimmed = String(raw).trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }

    throw new Error(`Model returned unparseable JSON: ${error.message}`);
  }
}

async function generateNotes(transcriptText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.CHAT_MODEL;
  const endpoint = process.env.OPENROUTER_URL || DEFAULT_OPENROUTER_URL;
  const referer = process.env.APP_URL || 'http://localhost';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set. Add it to your .env file.');
  }

  if (!transcriptText || !String(transcriptText).trim()) {
    throw new Error('transcriptText is required and cannot be empty.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': referer,
      'X-Title': process.env.APP_NAME || 'AI Meeting Notes',
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: getExtractionPrompt() },
        { role: 'user', content: String(transcriptText) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenRouter returned an empty response.');
  }

  return extractJson(content);
}

module.exports = { generateNotes };
