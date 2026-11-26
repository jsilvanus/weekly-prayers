import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { llmReview, resolveOllamaConfig, parseLlmVerdict, buildChatRequest, SYSTEM_PROMPT } from '../../src/services/moderation/llm.js';

// Local fake Ollama. Synthetic text only. Nothing is logged; the fake records requests in memory.

const SECRET_TEXT = 'Rukoilemme Maija Virtasen puolesta, hänen miehensä Pekan sairaudesta.';

let server;
let base;
let handler;
const requests = [];
const pendingTimers = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let parsed = null;
      try { parsed = JSON.parse(body); } catch { parsed = null; }
      requests.push({ method: req.method, url: req.url, body: parsed });
      handler(req, res, parsed);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const t of pendingTimers) clearTimeout(t);
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

const savedEnv = { OLLAMA_URL: process.env.OLLAMA_URL, OLLAMA_MODEL: process.env.OLLAMA_MODEL, OLLAMA_TIMEOUT_MS: process.env.OLLAMA_TIMEOUT_MS };

function setEnv(vars) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

afterEach(() => {
  setEnv(savedEnv);
  requests.length = 0;
  handler = null;
});

function answer(obj, status = 200) {
  return (req, res) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: { role: 'assistant', content: typeof obj === 'string' ? obj : JSON.stringify(obj) } }));
  };
}

function enable(extra = {}) {
  setEnv({ OLLAMA_URL: base, OLLAMA_MODEL: 'test-model', OLLAMA_TIMEOUT_MS: undefined, ...extra });
}

describe('llmReview against a fake Ollama', () => {
  test('flagged answer maps to flagged true with the fixed reasons', async () => {
    enable();
    handler = answer({ identifies_person: true, personal_data: true, reasons: ['name', 'location'] });
    const r = await llmReview(SECRET_TEXT, 'fi');
    assert.deepEqual(r, { flagged: true, reasons: ['name', 'location'] });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].url, '/api/chat');
  });

  test('not flagged answer maps to flagged false', async () => {
    enable();
    handler = answer({ identifies_person: false, personal_data: false, reasons: [] });
    assert.deepEqual(await llmReview('Rukoilemme seurakuntamme ja maamme puolesta.', 'fi'), { flagged: false, reasons: [] });
  });

  test('request body: stream false, json format, temperature 0, system then user', async () => {
    enable();
    handler = answer({ identifies_person: false, personal_data: false, reasons: [] });
    await llmReview(SECRET_TEXT, 'fi');
    const body = requests[0].body;
    assert.equal(body.model, 'test-model');
    assert.equal(body.stream, false);
    assert.equal(body.format, 'json');
    assert.deepEqual(body.options, { temperature: 0 });
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages[1].role, 'user');
  });

  test('the system prompt never contains the prayer text', async () => {
    enable();
    handler = answer({ identifies_person: false, personal_data: false, reasons: [] });
    await llmReview(SECRET_TEXT, 'fi');
    const system = requests[0].body.messages[0].content;
    assert.equal(system, SYSTEM_PROMPT);
    assert.equal(system.includes(SECRET_TEXT), false);
    assert.equal(system.includes('Virtasen'), false);
    assert.equal(requests[0].body.messages[1].content.includes(SECRET_TEXT), true);
  });

  test('timeout returns null', async () => {
    enable({ OLLAMA_TIMEOUT_MS: '50' });
    handler = (req, res) => {
      const t = setTimeout(() => { if (!res.destroyed) answer({ identifies_person: true, personal_data: true, reasons: [] })(req, res); }, 600);
      pendingTimers.push(t);
    };
    assert.equal(await llmReview(SECRET_TEXT, 'fi'), null);
  });

  test('invalid JSON returns null', async () => {
    enable();
    handler = answer('this is not json {');
    assert.equal(await llmReview(SECRET_TEXT, 'fi'), null);
  });

  test('HTTP 500 returns null', async () => {
    enable();
    handler = (req, res) => { res.writeHead(500); res.end('boom'); };
    assert.equal(await llmReview(SECRET_TEXT, 'fi'), null);
  });

  test('unknown reason values are filtered out', async () => {
    enable();
    handler = answer({ identifies_person: true, personal_data: false, reasons: ['name', 'made_up', 'NAME', 42, 'other', 'name'] });
    assert.deepEqual(await llmReview(SECRET_TEXT, 'fi'), { flagged: true, reasons: ['name', 'other'] });
  });

  test('a malformed answer shape returns null', async () => {
    enable();
    handler = answer({ identifies_person: 'yes', personal_data: false, reasons: [] });
    assert.equal(await llmReview(SECRET_TEXT, 'fi'), null);
    handler = answer({ identifies_person: false, personal_data: false, reasons: 'name' });
    assert.equal(await llmReview(SECRET_TEXT, 'fi'), null);
  });

  test('disabled when OLLAMA_URL is unset: no request, null', async () => {
    setEnv({ OLLAMA_URL: undefined, OLLAMA_MODEL: 'test-model' });
    let calls = 0;
    const fetchImpl = async () => { calls += 1; return new Response('{}'); };
    assert.equal(await llmReview(SECRET_TEXT, 'fi', { fetchImpl }), null);
    assert.equal(calls, 0);
  });

  test('disabled when OLLAMA_MODEL is missing: no request, null', async () => {
    setEnv({ OLLAMA_URL: base, OLLAMA_MODEL: undefined });
    let calls = 0;
    const fetchImpl = async () => { calls += 1; return new Response('{}'); };
    assert.equal(await llmReview(SECRET_TEXT, 'fi', { fetchImpl }), null);
    assert.equal(calls, 0);
  });

  test('a network error returns null', async () => {
    enable();
    const fetchImpl = async () => { throw new TypeError('fetch failed'); };
    assert.equal(await llmReview(SECRET_TEXT, 'fi', { fetchImpl }), null);
  });

  test('empty text returns null without a request', async () => {
    enable();
    let calls = 0;
    const fetchImpl = async () => { calls += 1; return new Response('{}'); };
    assert.equal(await llmReview('   ', 'fi', { fetchImpl }), null);
    assert.equal(calls, 0);
  });
});

describe('resolveOllamaConfig', () => {
  test('accepts http and https, strips trailing slashes', () => {
    const c = resolveOllamaConfig({ OLLAMA_URL: 'http://ollama.internal:11434/', OLLAMA_MODEL: 'm' });
    assert.equal(c.baseUrl, 'http://ollama.internal:11434');
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'https://x.example///', OLLAMA_MODEL: 'm' }).baseUrl, 'https://x.example');
  });

  test('rejects non-http schemes and malformed URLs', () => {
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'ftp://x.example', OLLAMA_MODEL: 'm' }), null);
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'not a url', OLLAMA_MODEL: 'm' }), null);
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'javascript:alert(1)', OLLAMA_MODEL: 'm' }), null);
  });

  test('empty URL means disabled; timeout defaults to 8000 ms', () => {
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: '   ', OLLAMA_MODEL: 'm' }), null);
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'http://a', OLLAMA_MODEL: 'm' }).timeoutMs, 8000);
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'http://a', OLLAMA_MODEL: 'm', OLLAMA_TIMEOUT_MS: '1500' }).timeoutMs, 1500);
    assert.equal(resolveOllamaConfig({ OLLAMA_URL: 'http://a', OLLAMA_MODEL: 'm', OLLAMA_TIMEOUT_MS: 'abc' }).timeoutMs, 8000);
  });
});

describe('parseLlmVerdict and request builder', () => {
  test('parses only the expected shape', () => {
    assert.equal(parseLlmVerdict(null), null);
    assert.equal(parseLlmVerdict([]), null);
    assert.deepEqual(parseLlmVerdict({ identifies_person: false, personal_data: true, reasons: ['location'] }), { flagged: true, reasons: ['location'] });
  });

  test('buildChatRequest puts the text only into the user message', () => {
    const req = buildChatRequest('m', 'abc-text', 'sv');
    assert.equal(req.messages[0].content.includes('abc-text'), false);
    assert.equal(req.messages[1].content.includes('abc-text'), true);
  });
});
