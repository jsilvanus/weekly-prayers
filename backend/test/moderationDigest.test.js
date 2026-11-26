import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import moderationDigestRouter from '../src/routes/moderationDigest.js';
import {
  normalizeRejectReasons,
  buildRejectUpsert,
  renderDigestText,
  isEmptyDigest,
  selectDueSubscriptions,
  validateSubscriptionInput,
  DIGEST_PERIOD_MS,
} from '../src/services/moderationDigest.js';
import { digestHourKey } from '../src/services/mailingScheduler.js';

// Synthetic digests only: counts and finding types, no prayer text.
const DIGEST = {
  period: { since: '2026-11-25T08:00:00.000Z', until: '2026-11-26T08:00:00.000Z' },
  totals: {
    autoClean: 4,
    autoReview: 2,
    rejected: 1,
    humanRedacted: 1,
    humanConfirmedAuto: 3,
    humanOverturned: 0,
  },
  byReason: { phone: 2, hetu: 1 },
  awaitingReview: 5,
  links: { review: '/admin' },
};

const EMPTY_DIGEST = {
  ...DIGEST,
  totals: Object.fromEntries(Object.keys(DIGEST.totals).map((k) => [k, 0])),
  byReason: {},
  awaitingReview: 0,
};

describe('normalizeRejectReasons', () => {
  test('keeps finding-type keys with positive integer counts only', () => {
    assert.deepEqual(
      normalizeRejectReasons({ hetu: 2, phone: 1, 'has space': 3, Email: 1, a_very_long_key_that_is_too_long_for_the_limit_here: 1, zero: 0, neg: -1, frac: 1.5, text: 'hello' }),
      { hetu: 2, phone: 1 },
    );
  });

  test('returns an empty object for non-object input', () => {
    assert.deepEqual(normalizeRejectReasons(null), {});
    assert.deepEqual(normalizeRejectReasons('hetu'), {});
    assert.deepEqual(normalizeRejectReasons(undefined), {});
  });
});

describe('buildRejectUpsert', () => {
  test('upserts one row per (day, tenant) and merges per-type counts', () => {
    const { text, values } = buildRejectUpsert(null, { hetu: 1 }, '2026-11-26');
    assert.match(text, /ON CONFLICT \(day, tenant_id\) DO UPDATE/);
    assert.match(text, /count = moderation_reject_counts\.count \+ 1/);
    assert.match(text, /jsonb_each_text\(EXCLUDED\.reasons\)/);
    assert.deepEqual(values, ['2026-11-26', null, '{"hetu":1}']);
  });

  test('passes the tenant id through and drops unexpected keys before storage', () => {
    const tenant = '6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b';
    const { values } = buildRejectUpsert(tenant, { phone: 2, 'Some text': 9 }, '2026-11-26');
    assert.equal(values[1], tenant);
    assert.equal(values[2], '{"phone":2}');
  });
});

describe('renderDigestText', () => {
  const originalBase = process.env.BASE_URL;
  before(() => { process.env.BASE_URL = 'https://example.test/rukous/'; });
  after(() => {
    if (originalBase === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = originalBase;
  });

  test('defaults to Finnish and includes the counts and the review link', () => {
    const out = renderDigestText(DIGEST);
    assert.match(out.subject, /Päätösyhteenveto/);
    assert.match(out.text, /Puhdistettu automaattisesti: 4/);
    assert.match(out.text, /Hylätty automaattisesti \(ei tallennettu\): 1/);
    assert.match(out.text, /phone 2, hetu 1/);
    assert.match(out.text, /Odottaa tarkistusta: 5/);
    assert.match(out.text, /https:\/\/example\.test\/rukous\/admin/);
    assert.match(out.html, /<a href="https:\/\/example\.test\/rukous\/admin">/);
  });

  test('renders Swedish and English labels', () => {
    assert.match(renderDigestText(DIGEST, 'sv').text, /Automatiskt avvisad/);
    assert.match(renderDigestText(DIGEST, 'en').text, /Rejected automatically/);
  });

  test('unknown language falls back to Finnish', () => {
    assert.match(renderDigestText(DIGEST, 'de').subject, /Päätösyhteenveto/);
  });

  test('escapes HTML in the rendered body', () => {
    const hostile = { ...DIGEST, byReason: { '<img>': 1 } };
    const { html } = renderDigestText(hostile, 'en');
    assert.doesNotMatch(html, /<img>/);
  });

  test('isEmptyDigest is true only when totals and awaiting review are zero', () => {
    assert.equal(isEmptyDigest(EMPTY_DIGEST), true);
    assert.equal(isEmptyDigest(DIGEST), false);
    assert.equal(isEmptyDigest({ ...EMPTY_DIGEST, awaitingReview: 1 }), false);
  });
});

describe('selectDueSubscriptions', () => {
  const NOW = new Date('2026-11-26T10:00:00.000Z');
  const DAY = DIGEST_PERIOD_MS.daily;
  const base = { id: 1, user_id: 'u', channel: 'email', enabled: true, role: 'worker', frequency: 'daily' };

  test('a daily subscription is due after 24 h since last_sent_at', () => {
    const due = selectDueSubscriptions(NOW, [
      { ...base, id: 1, last_sent_at: new Date(NOW.getTime() - DAY) },
      { ...base, id: 2, last_sent_at: new Date(NOW.getTime() - DAY + 60_000) },
    ]);
    assert.deepEqual(due.map((d) => d.row.id), [1]);
    assert.equal(due[0].untilTs.getTime(), NOW.getTime());
    assert.equal(due[0].sinceTs.getTime(), NOW.getTime() - DAY);
  });

  test('a weekly subscription needs 7 days', () => {
    const weekly = { ...base, frequency: 'weekly' };
    const sixDays = new Date(NOW.getTime() - 6 * DAY);
    const sevenDays = new Date(NOW.getTime() - 7 * DAY);
    assert.equal(selectDueSubscriptions(NOW, [{ ...weekly, last_sent_at: sixDays }]).length, 0);
    assert.equal(selectDueSubscriptions(NOW, [{ ...weekly, last_sent_at: sevenDays }]).length, 1);
  });

  test('without last_sent_at the anchor is created_at (no immediate first digest)', () => {
    const fresh = { ...base, last_sent_at: null, created_at: new Date(NOW.getTime() - 2 * 60 * 60 * 1000) };
    const old = { ...base, last_sent_at: null, created_at: new Date(NOW.getTime() - 2 * DAY) };
    assert.equal(selectDueSubscriptions(NOW, [fresh]).length, 0);
    assert.equal(selectDueSubscriptions(NOW, [old]).length, 1);
  });

  test('disabled, in-app and non-moderator subscriptions are never due', () => {
    const old = new Date(NOW.getTime() - 30 * DAY);
    const rows = [
      { ...base, id: 1, enabled: false, last_sent_at: old },
      { ...base, id: 2, channel: 'inapp', last_sent_at: old },
      { ...base, id: 3, role: 'user', last_sent_at: old },
      { ...base, id: 4, role: 'prayer_group', last_sent_at: old },
      { ...base, id: 5, role: 'coordinator', last_sent_at: old },
      { ...base, id: 6, role: 'admin', last_sent_at: old },
      { ...base, id: 7, frequency: 'monthly', last_sent_at: old },
    ];
    assert.deepEqual(selectDueSubscriptions(NOW, rows).map((d) => d.row.id), [5, 6]);
  });
});

describe('validateSubscriptionInput', () => {
  test('accepts daily and weekly with defaults for channel and enabled', () => {
    assert.deepEqual(validateSubscriptionInput({ frequency: 'daily' }), {
      errors: [],
      value: { frequency: 'daily', channel: 'email', enabled: true },
    });
    assert.equal(validateSubscriptionInput({ frequency: 'weekly', channel: 'inapp', enabled: false }).value.channel, 'inapp');
  });

  test('rejects an unknown frequency, channel or a non-boolean enabled flag', () => {
    assert.equal(validateSubscriptionInput({}).errors.length, 1);
    assert.equal(validateSubscriptionInput({ frequency: 'hourly' }).errors.length, 1);
    assert.equal(validateSubscriptionInput({ frequency: 'daily', channel: 'sms' }).errors.length, 1);
    assert.equal(validateSubscriptionInput({ frequency: 'daily', enabled: 'yes' }).errors.length, 1);
  });
});

describe('digestHourKey', () => {
  test('keys an instant by its Helsinki date and hour', () => {
    // 2026-11-26 08:20 Helsinki (UTC+2 in November) is 06:20 UTC.
    assert.equal(digestHourKey(new Date('2026-11-26T06:20:00.000Z')), '2026-11-26T08');
    assert.equal(digestHourKey(new Date('2026-11-26T06:59:59.000Z')), '2026-11-26T08');
    assert.equal(digestHourKey(new Date('2026-11-26T07:00:00.000Z')), '2026-11-26T09');
  });
});

describe('moderation digest routes (no session)', () => {
  let server;
  let base;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/moderation/digest', moderationDigestRouter);
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}/api/moderation/digest`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('every endpoint requires authentication', async () => {
    const cases = [
      ['GET', '/subscription'],
      ['PUT', '/subscription'],
      ['GET', '/preview?days=1'],
      ['PUT', '/subscription/6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b'],
    ];
    for (const [method, path] of cases) {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'PUT' ? JSON.stringify({ frequency: 'daily' }) : undefined,
      });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });
});
