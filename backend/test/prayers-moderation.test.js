import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import prayersRouter from '../src/routes/prayers.js';

// Route-level checks that do not touch the database: validation, the 422 gate, the
// check endpoint (stores nothing), auth rejection and the rate limit on /check.
// Synthetic strings only; response bodies are inspected but never logged.

let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/prayers', prayersRouter);
  app.use((err, req, res, _next) => {
    res.status(500).json({ error: { message: 'internal' } });
  });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/prayers`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const HETU_TEXT = 'Hetuni on 260751-490C, ja pyydän rukousta.';
const PLAIN_TEXT = 'Rukoilemme sairaiden puolesta ja Hengen johdatusta.';
const REVIEW_TEXT = 'Pyydämme rukousta, auto ABC 12 3 on rikki.';

describe('POST /api/prayers/check', () => {
  test('rejects empty and over-long content with 400', async () => {
    assert.equal((await post('/check', { content: '   ' })).status, 400);
    assert.equal((await post('/check', {})).status, 400);
    assert.equal((await post('/check', { content: 'a'.repeat(1001) })).status, 400);
  });

  test('returns reject with type and offsets only', async () => {
    const r = await post('/check', { content: HETU_TEXT, lang: 'fi' });
    assert.equal(r.status, 200);
    assert.equal(r.body.decision, 'reject');
    assert.equal(r.body.findings[0].type, 'hetu');
    assert.equal(typeof r.body.findings[0].start, 'number');
    assert.equal('confidence' in r.body.findings[0], false);
    assert.equal('redactedSuggestion' in r.body, false);
  });

  test('returns review for a low-confidence finding', async () => {
    const r = await post('/check', { content: REVIEW_TEXT });
    assert.equal(r.status, 200);
    assert.equal(r.body.decision, 'review');
  });

  test('returns ok for a plain prayer', async () => {
    const r = await post('/check', { content: PLAIN_TEXT });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { decision: 'ok', findings: [] });
  });
});

describe('POST /api/prayers (gate 1)', () => {
  test('returns 422 PERSONAL_DATA for a deterministic hit, without storing anything', async () => {
    // Explicit dates keep this request away from the database entirely.
    const r = await post('/', {
      content: HETU_TEXT,
      startDate: '2026-11-23',
      endDate: '2026-11-29',
    });
    assert.equal(r.status, 422);
    assert.equal(r.body.error.code, 'PERSONAL_DATA');
    assert.equal(r.body.error.message, 'Prayer request contains personal data');
    assert.equal(r.body.error.findings[0].type, 'hetu');
    assert.equal('confidence' in r.body.error.findings[0], false);
    assert.equal('prayer' in r.body, false);
  });

  test('validates content before deciding', async () => {
    const r = await post('/', { content: '', startDate: '2026-11-23', endDate: '2026-11-29' });
    assert.equal(r.status, 400);
  });
});

describe('moderation endpoints require authentication', () => {
  test('redaction, confirm and decisions reject anonymous callers with 401', async () => {
    const put = await fetch(`${base}/00000000-0000-4000-8000-000000000001/redaction`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redactedContent: 'x' }),
    });
    assert.equal(put.status, 401);

    const confirm = await post('/00000000-0000-4000-8000-000000000001/redaction/confirm', {});
    assert.equal(confirm.status, 401);

    const decisions = await fetch(`${base}/00000000-0000-4000-8000-000000000001/decisions`);
    assert.equal(decisions.status, 401);
  });
});

describe('POST /api/prayers/check rate limit', () => {
  test('returns 429 after 30 requests in a minute from one address', async () => {
    // Earlier tests in this file already used some of the budget; keep sending until blocked.
    let blockedAt = -1;
    for (let i = 0; i < 40; i++) {
      const r = await post('/check', { content: PLAIN_TEXT });
      if (r.status === 429) {
        blockedAt = i;
        assert.equal(typeof r.body.error.message, 'string');
        break;
      }
      assert.equal(r.status, 200);
    }
    assert.ok(blockedAt >= 0, 'expected a 429 response');
  });
});
