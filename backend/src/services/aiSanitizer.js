import { aiConfig, sanitizerPrompt } from '../config/ai.js';

/**
 * Sanitize prayer content using AI
 * @param {string} content - The original prayer content
 * @returns {Promise<{ sanitizedContent: string|null, flagged: boolean, flagReason: string|null, appropriate: boolean }>}
 */
export async function sanitizePrayerContent(content) {
  if (!aiConfig.enabled) {
    // AI disabled - return content as-is
    return {
      sanitizedContent: content,
      flagged: false,
      flagReason: null,
      appropriate: true
    };
  }

  try {
    if (aiConfig.provider === 'openai') {
      return await sanitizeWithOpenAI(content);
    } else if (aiConfig.provider === 'anthropic') {
      return await sanitizeWithAnthropic(content);
    } else {
      console.warn(`Unknown AI provider: ${aiConfig.provider}, returning content as-is`);
      return {
        sanitizedContent: content,
        flagged: false,
        flagReason: null,
        appropriate: true
      };
    }
  } catch (error) {
    console.error('AI sanitization error:', error);
    // On error, flag for manual review
    return {
      sanitizedContent: null,
      flagged: true,
      flagReason: `AI processing error: ${error.message}`,
      appropriate: false
    };
  }
}

async function sanitizeWithOpenAI(content) {
  const apiKey = aiConfig.openai.apiKey;

  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    return {
      sanitizedContent: content,
      flagged: true,
      flagReason: 'AI not configured - requires manual review',
      appropriate: false
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.openai.model,
      messages: [
        { role: 'system', content: sanitizerPrompt },
        { role: 'user', content: `Prayer request to review:\n\n${content}` }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  return parseAIResponse(aiResponse);
}

async function sanitizeWithAnthropic(content) {
  const apiKey = aiConfig.anthropic.apiKey;

  if (!apiKey) {
    console.warn('Anthropic API key not configured');
    return {
      sanitizedContent: content,
      flagged: true,
      flagReason: 'AI not configured - requires manual review',
      appropriate: false
    };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: aiConfig.anthropic.model,
      max_tokens: 1000,
      system: sanitizerPrompt,
      messages: [
        { role: 'user', content: `Prayer request to review:\n\n${content}` }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.content[0].text;

  return parseAIResponse(aiResponse);
}

function parseAIResponse(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      sanitizedContent: parsed.sanitizedContent || null,
      flagged: Boolean(parsed.flagged),
      flagReason: parsed.flagReason || null,
      appropriate: Boolean(parsed.appropriate)
    };
  } catch (error) {
    console.error('Failed to parse AI response:', responseText);
    return {
      sanitizedContent: null,
      flagged: true,
      flagReason: 'Failed to parse AI response',
      appropriate: false
    };
  }
}
