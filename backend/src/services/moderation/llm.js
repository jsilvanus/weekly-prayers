/**
 * Optional second gate: a classifier served by a self-hosted Ollama instance.
 *
 * Only a self-hosted Ollama is supported. The prayer text is sent to OLLAMA_URL and nowhere else.
 * The model never rewrites or quotes the text; it only answers a fixed JSON shape, and every
 * unexpected answer, error or timeout yields null (no signal). Neither the text nor the model
 * answer is logged. Errors are logged by name only, because some parser errors echo input.
 *
 * Enabled only when OLLAMA_URL is set (http or https) and OLLAMA_MODEL is set.
 *   OLLAMA_TIMEOUT_MS   request timeout in milliseconds (default 8000)
 */

export const LLM_REASONS = Object.freeze([
  'name',
  'relationship_detail',
  'location',
  'health_detail_about_identifiable_person',
  'workplace_or_role',
  'other',
]);

const REASON_SET = new Set(LLM_REASONS);
export const DEFAULT_OLLAMA_TIMEOUT_MS = 8000;

export const SYSTEM_PROMPT = [
  'You are a privacy classifier for church prayer requests written in Finnish, Swedish or English.',
  'You NEVER rewrite, correct or quote the text.',
  'Answer ONLY with a JSON object of this shape:',
  '{"identifies_person": boolean, "personal_data": boolean, "reasons": [...]}',
  'Reasons may only be taken from this fixed set: name, relationship_detail, location,',
  'health_detail_about_identifiable_person, workplace_or_role, other.',
  'General intercession for unnamed groups is NOT personal data.',
  'identifies_person is true only when a specific individual can be identified from the text.',
  'personal_data is true when the text reveals personal data about such an individual.',
].join(' ');

const warned = new Set();

/** Logs a configuration problem once per process. Never includes the URL, the model name or the text. */
function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

/**
 * Reads the Ollama settings from the environment. Returns null when the gate is off.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ baseUrl: string, model: string, timeoutMs: number } | null}
 */
export function resolveOllamaConfig(env = process.env) {
  const raw = typeof env.OLLAMA_URL === 'string' ? env.OLLAMA_URL.trim() : '';
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    warnOnce('url', 'Ollama moderation disabled: OLLAMA_URL is not a valid URL');
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    warnOnce('url', 'Ollama moderation disabled: OLLAMA_URL must be http or https');
    return null;
  }

  const model = typeof env.OLLAMA_MODEL === 'string' ? env.OLLAMA_MODEL.trim() : '';
  if (!model) {
    warnOnce('model', 'Ollama moderation disabled: OLLAMA_MODEL is not set');
    return null;
  }

  const timeoutMs = Number(env.OLLAMA_TIMEOUT_MS);
  return {
    baseUrl: raw.replace(/\/+$/, ''),
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_OLLAMA_TIMEOUT_MS,
  };
}

/**
 * Turns the model's parsed answer into a signal. Unknown reason values are dropped.
 * Returns null when the answer does not have the expected shape.
 * @param {unknown} obj
 * @returns {{ flagged: boolean, reasons: string[] } | null}
 */
export function parseLlmVerdict(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (typeof obj.identifies_person !== 'boolean' || typeof obj.personal_data !== 'boolean') return null;
  if (!Array.isArray(obj.reasons)) return null;
  const reasons = [...new Set(obj.reasons.filter((r) => typeof r === 'string' && REASON_SET.has(r)))];
  return { flagged: obj.identifies_person || obj.personal_data, reasons };
}

/** The chat request body. The text appears only in the user message, never in the system prompt. */
export function buildChatRequest(model, text, lang) {
  return {
    model,
    stream: false,
    format: 'json',
    options: { temperature: 0 },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Language: ${lang}\nText:\n${text}` },
    ],
  };
}

/**
 * Asks the local Ollama for a privacy signal on one public prayer request.
 * Never throws. Returns null on every failure, so the caller keeps the rule-based result.
 * @param {string} text
 * @param {'fi'|'sv'|'en'} [lang='fi']
 * @param {{ fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<{ flagged: boolean, reasons: string[] } | null>}
 */
export async function llmReview(text, lang = 'fi', { fetchImpl = globalThis.fetch } = {}) {
  const config = resolveOllamaConfig();
  if (!config) return null;
  if (typeof text !== 'string' || text.trim().length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetchImpl(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildChatRequest(config.model, text, lang)),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`Ollama moderation skipped: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const content = data?.message?.content;
    if (typeof content !== 'string') return null;
    return parseLlmVerdict(JSON.parse(content));
  } catch (err) {
    console.warn(`Ollama moderation skipped: ${err?.name || 'error'}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
