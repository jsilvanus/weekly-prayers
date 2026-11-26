import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mailingsRouter, { resetPublicRateLimit } from '../src/routes/mailings.js';
import {
  validateMailingInput,
  validateListInput,
  signMailingToken,
  verifyMailingToken,
  buildUnsubscribeUrl,
  buildOptoutUrl,
  helsinkiParts,
  computeDueMailings,
  renderMailing,
  deliverViaTunnus,
  mailRelayConfig,
  isMailingConfigured,
  ROLE_TARGETS,
} from '../src/services/mailingService.js';
import { mapWithConcurrency, startMailingScheduler } from '../src/services/mailingScheduler.js';

const LIST_ID = '6f1c2a3e-4b5d-4e6f-8a9b-0c1d2e3f4a5b';
const SUB_ID = '11111111-2222-4333-8444-555555555555';
const USER_ID = '99999999-8888-4777-8666-555555555555';

// Helpers for environment that the code reads at call time.
const ENV_KEYS = ['JWT_SECRET', 'BASE_URL', 'TUNNUS_MAIL_URL', 'TUNNUS_MAIL_RELAY_TOKEN', 'MAIL_FROM', 'MAILING_SCHEDULER'];
function withEnv(overrides, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, overrides);
  const restore = () => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  };
  let result;
  try {
    result = fn();
  } catch (err) {
    restore();
    throw err;
  }
  if (result && typeof result.then === 'function') return result.finally(restore);
  restore();
  return result;
}
const SECRET_ENV = { JWT_SECRET: 'test-secret-for-mailings', BASE_URL: 'https://example.test/rukous' };
const RELAY_ENV = {
  ...SECRET_ENV,
  TUNNUS_MAIL_URL: 'https://tunnus.example.test',
  TUNNUS_MAIL_RELAY_TOKEN: 'relay-token-123',
  MAIL_FROM: 'prayers@example.test',
};

// ---------------------------------------------------------------------------
describe('validateMailingInput', () => {
  const listTarget = { name: 'Viikon rukous', listId: LIST_ID, targetType: 'list' };

  test('week mailing requires week, year and send dates', () => {
    const { errors } = validateMailingInput({ ...listTarget, kind: 'week' });
    assert.ok(errors.some(e => e.includes('week')));
    assert.ok(errors.some(e => e.includes('year')));
    assert.ok(errors.some(e => e.includes('sendDates')));
  });

  test('week mailing with send dates is accepted, dates deduped and sorted', () => {
    const { errors, value } = validateMailingInput({
      ...listTarget, kind: 'week', week: 49, year: 2026,
      sendDates: ['2026-12-03', '2026-12-01', '2026-12-03'],
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(value.sendDates, ['2026-12-01', '2026-12-03']);
    assert.equal(value.sendHour, 8);
    assert.equal(value.includePublic, false);
    assert.equal(value.enabled, true);
  });

  test('week mailing rejects malformed or impossible dates', () => {
    const { errors } = validateMailingInput({
      ...listTarget, kind: 'week', week: 49, year: 2026, sendDates: ['2026-02-30'],
    });
    assert.ok(errors.some(e => e.includes('YYYY-MM-DD')));
  });

  test('recurring mailing requires weekday and start date', () => {
    const { errors } = validateMailingInput({ ...listTarget, kind: 'recurring' });
    assert.ok(errors.some(e => e.includes('sendWeekday')));
    assert.ok(errors.some(e => e.includes('startDate')));
  });

  test('recurring mailing rejects endDate before startDate', () => {
    const { errors } = validateMailingInput({
      ...listTarget, kind: 'recurring', sendWeekday: 0, startDate: '2026-12-01', endDate: '2026-11-01',
    });
    assert.ok(errors.some(e => e.includes('endDate')));
  });

  test('recurring mailing is accepted with weekday and start date', () => {
    const { errors, value } = validateMailingInput({
      ...listTarget, kind: 'recurring', sendWeekday: 0, startDate: '2026-12-01',
    });
    assert.deepEqual(errors, []);
    assert.equal(value.endDate, null);
    assert.equal(value.week, null);
  });

  test('exactly one target: list needs listId and no role', () => {
    assert.ok(validateMailingInput({ ...listTarget, listId: undefined, kind: 'recurring', sendWeekday: 1, startDate: '2026-12-01' }).errors.some(e => e.includes('listId')));
    assert.ok(validateMailingInput({ ...listTarget, targetRole: 'worker', kind: 'recurring', sendWeekday: 1, startDate: '2026-12-01' }).errors.some(e => e.includes('targetRole')));
  });

  test('role target needs an allowed role and no listId', () => {
    const base = { name: 'Työntekijät', kind: 'recurring', sendWeekday: 1, startDate: '2026-12-01', targetType: 'role' };
    const ok = validateMailingInput({ ...base, targetRole: 'prayer_group' });
    assert.deepEqual(ok.errors, []);
    assert.equal(ok.value.targetRole, 'prayer_group');
    assert.equal(ok.value.listId, null);

    assert.ok(validateMailingInput({ ...base, targetRole: 'admin' }).errors.some(e => e.includes('targetRole')));
    assert.ok(validateMailingInput({ ...base }).errors.some(e => e.includes('targetRole')));
    assert.ok(validateMailingInput({ ...base, targetRole: 'worker', listId: LIST_ID }).errors.some(e => e.includes('listId')));
  });

  test('ROLE_TARGETS excludes admin and includes the staff roles', () => {
    assert.ok(!ROLE_TARGETS.includes('admin'));
    for (const role of ['coordinator', 'worker', 'bishop', 'devotion', 'prayer_group', 'user']) {
      assert.ok(ROLE_TARGETS.includes(role), role);
    }
  });

  test('sendHour must be 0-23 and subject at most 200 characters', () => {
    const base = { ...listTarget, kind: 'week', week: 49, year: 2026, sendDates: ['2026-12-01'] };
    assert.ok(validateMailingInput({ ...base, sendHour: 24 }).errors.some(e => e.includes('sendHour')));
    assert.ok(validateMailingInput({ ...base, subject: 'x'.repeat(201) }).errors.some(e => e.includes('subject')));
  });
});

describe('validateListInput', () => {
  test('name is required and allowPublicSignup must be boolean', () => {
    assert.ok(validateListInput({}).errors.length > 0);
    assert.ok(validateListInput({ name: 'A', allowPublicSignup: 'yes' }).errors.length > 0);
    const { errors, value } = validateListInput({ name: '  Rukoilijat  ' });
    assert.deepEqual(errors, []);
    assert.equal(value.name, 'Rukoilijat');
    assert.equal(value.allowPublicSignup, false);
  });
});

describe('consent tokens and links', () => {
  test('round trip verifies for the same purpose and id', () => {
    withEnv(SECRET_ENV, () => {
      const token = signMailingToken('confirm', SUB_ID);
      assert.equal(verifyMailingToken('confirm', SUB_ID, token), true);
    });
  });

  test('tampered, wrong-purpose, wrong-id and malformed tokens are refused', () => {
    withEnv(SECRET_ENV, () => {
      const token = signMailingToken('unsubscribe', SUB_ID);
      assert.equal(verifyMailingToken('unsubscribe', SUB_ID, token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')), false);
      assert.equal(verifyMailingToken('confirm', SUB_ID, token), false);
      assert.equal(verifyMailingToken('unsubscribe', USER_ID, token), false);
      assert.equal(verifyMailingToken('unsubscribe', SUB_ID, undefined), false);
      assert.equal(verifyMailingToken('unsubscribe', 'not-a-uuid', token), false);
    });
  });

  test('tokens depend on JWT_SECRET and signing fails without it', () => {
    let a;
    withEnv({ ...SECRET_ENV }, () => { a = signMailingToken('confirm', SUB_ID); });
    withEnv({ ...SECRET_ENV, JWT_SECRET: 'another-secret' }, () => {
      assert.notEqual(signMailingToken('confirm', SUB_ID), a);
    });
    withEnv({}, () => {
      assert.throws(() => signMailingToken('confirm', SUB_ID), /JWT_SECRET/);
    });
  });

  test('unsubscribe and opt-out links point at the public routes with their own parameter', () => {
    withEnv(SECRET_ENV, () => {
      const unsub = new URL(buildUnsubscribeUrl(SUB_ID));
      assert.equal(unsub.origin + unsub.pathname, 'https://example.test/rukous/api/mailings/public/unsubscribe');
      assert.equal(unsub.searchParams.get('s'), SUB_ID);
      assert.equal(unsub.searchParams.get('t'), signMailingToken('unsubscribe', SUB_ID));

      const optout = new URL(buildOptoutUrl(USER_ID));
      assert.ok(optout.pathname.endsWith('/api/mailings/public/optout'));
      assert.equal(optout.searchParams.get('u'), USER_ID);
      assert.equal(optout.searchParams.get('t'), signMailingToken('optout', USER_ID));
      assert.equal(optout.searchParams.get('s'), null);
    });
  });
});

describe('helsinkiParts', () => {
  test('winter time (UTC+2) and summer time (UTC+3) give Helsinki wall-clock hour', () => {
    assert.deepEqual(
      { date: helsinkiParts(new Date('2026-12-01T06:30:00Z')).date, hour: helsinkiParts(new Date('2026-12-01T06:30:00Z')).hour },
      { date: '2026-12-01', hour: 8 }
    );
    assert.equal(helsinkiParts(new Date('2026-07-01T05:00:00Z')).hour, 8);
  });

  test('a UTC instant just after midnight can already be the next day in Helsinki', () => {
    assert.equal(helsinkiParts(new Date('2026-12-01T23:30:00Z')).date, '2026-12-02');
  });
});

describe('computeDueMailings', () => {
  const weekRow = (overrides = {}) => ({
    id: 'mail-week', kind: 'week', enabled: true, send_hour: 8,
    send_dates: ['2026-12-01'], send_weekday: null, start_date: null, end_date: null,
    ...overrides,
  });
  const recurringRow = (overrides = {}) => ({
    id: 'mail-rec', kind: 'recurring', enabled: true, send_hour: 8,
    send_dates: null, send_weekday: weekdayOf('2026-12-01'), start_date: '2026-11-01', end_date: null,
    ...overrides,
  });
  const at = (iso) => new Date(iso);

  function weekdayOf(date) {
    return new Date(`${date}T12:00:00Z`).getUTCDay();
  }

  test('week mailing is due on a send date from the send hour onwards', () => {
    const rows = [weekRow()];
    assert.equal(computeDueMailings(at('2026-12-01T06:30:00Z'), rows).length, 1); // 08:30 Helsinki
    assert.equal(computeDueMailings(at('2026-12-01T05:59:00Z'), rows).length, 0); // 07:59 Helsinki
    assert.equal(computeDueMailings(at('2026-12-02T06:30:00Z'), rows).length, 0);
  });

  test('a claimed (mailing, date) is not due again', () => {
    const rows = [weekRow()];
    const sent = new Set(['mail-week|2026-12-01']);
    assert.equal(computeDueMailings(at('2026-12-01T06:30:00Z'), rows, sent).length, 0);
  });

  test('disabled mailings are never due', () => {
    assert.equal(computeDueMailings(at('2026-12-01T06:30:00Z'), [weekRow({ enabled: false })]).length, 0);
  });

  test('recurring mailing is due on its weekday within the date range', () => {
    const rows = [recurringRow()];
    const due = computeDueMailings(at('2026-12-01T06:30:00Z'), rows);
    assert.equal(due.length, 1);
    assert.equal(due[0].sendDate, '2026-12-01');
    // Next week, same weekday, still in range.
    assert.equal(computeDueMailings(at('2026-12-08T06:30:00Z'), rows).length, 1);
    // Wrong weekday.
    assert.equal(computeDueMailings(at('2026-12-02T06:30:00Z'), rows).length, 0);
  });

  test('recurring mailing respects start and end dates', () => {
    const before = [recurringRow({ start_date: '2026-12-08' })];
    assert.equal(computeDueMailings(at('2026-12-01T06:30:00Z'), before).length, 0);
    const after = [recurringRow({ end_date: '2026-11-24' })];
    assert.equal(computeDueMailings(at('2026-12-01T06:30:00Z'), after).length, 0);
  });
});

describe('renderMailing', () => {
  const prayers = {
    bishop: [{ content: 'Piispan rukousaihe' }],
    pastor: [{ content: 'Kirkkoherran <b>rukous</b> & kiitos' }],
    staff: [{ content: 'Lapset ja nuoret' }],
    public: [{ content: 'Sairas ihminen: <script>x</script>' }],
  };

  test('escapes HTML in content and includes the unsubscribe link when given', () => {
    withEnv(SECRET_ENV, () => {
      const url = buildUnsubscribeUrl(SUB_ID);
      const out = renderMailing({ week: 49, year: 2026, prayers, tenant: { name: 'Riihimäen seurakunta' }, unsubscribeUrl: url });
      assert.ok(out.html.includes('Kirkkoherran &lt;b&gt;rukous&lt;/b&gt; &amp; kiitos'));
      assert.ok(!out.html.includes('<script>'));
      assert.ok(out.html.includes(url.replace(/&/g, '&amp;')));
      assert.ok(out.text.includes(url));
      assert.ok(out.text.includes('Lähettäjä: Riihimäen seurakunta'));
      assert.equal(out.subject, 'Esirukoukset, viikko 49 (2026)');
    });
  });

  test('public requests are left out unless includePublic is set', () => {
    const without = renderMailing({ week: 49, year: 2026, prayers, tenant: { name: 'X' } });
    assert.ok(!without.text.includes('Sairas ihminen'));
    const withPublic = renderMailing({ week: 49, year: 2026, prayers, tenant: { name: 'X' }, includePublic: true });
    assert.ok(withPublic.text.includes('Sairas ihminen'));
  });

  test('preview or test render (no unsubscribe URL) says so instead of linking', () => {
    const out = renderMailing({ week: 49, year: 2026, prayers: {}, tenant: { name: 'X' } });
    assert.ok(out.text.includes('Tälle viikolle ei ole esirukousaiheita'));
    assert.ok(out.text.includes('peruutuslinkki'));
    assert.ok(!out.text.includes('https://'));
  });
});

describe('deliverViaTunnus', () => {
  test('sends one mail through the relay with the from field added', async () => {
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return { ok: true, status: 200, statusText: 'OK', json: async () => ({ queued: true }) };
    };
    const result = await withEnv(RELAY_ENV, () => deliverViaTunnus({
      to: 'reader@example.test', subject: 'Otsikko', text: 'Teksti', html: '<p>Teksti</p>', fetchImpl: fakeFetch,
    }));
    assert.deepEqual(result, { queued: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://tunnus.example.test/api/mail');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer relay-token-123');
    assert.equal(calls[0].body.from, 'prayers@example.test');
    assert.deepEqual(calls[0].body.to, ['reader@example.test']);
    assert.equal(calls[0].body.subject, 'Otsikko');
  });

  test('relay failure rejects without putting the address in the error', async () => {
    const fakeFetch = async () => ({ ok: false, status: 400, statusText: 'Bad Request' });
    await withEnv(RELAY_ENV, async () => {
      await assert.rejects(
        deliverViaTunnus({ to: 'secret.person@example.test', subject: 's', text: 't', fetchImpl: fakeFetch }),
        (err) => {
          assert.match(err.message, /400/);
          assert.ok(!err.message.includes('secret.person'));
          return true;
        }
      );
    });
  });

  test('refuses to send when the relay is not configured', async () => {
    await withEnv(SECRET_ENV, async () => {
      assert.equal(mailRelayConfig(), null);
      assert.equal(isMailingConfigured(), false);
      await assert.rejects(deliverViaTunnus({ to: 'a@example.test', subject: 's', text: 't' }), /not configured/);
    });
  });
});

describe('startMailingScheduler', () => {
  test('returns null without starting a timer when the relay is not configured', () => {
    withEnv(SECRET_ENV, () => {
      assert.equal(startMailingScheduler(), null);
    });
  });

  test('returns null when MAILING_SCHEDULER=false even if configured', () => {
    withEnv({ ...RELAY_ENV, MAILING_SCHEDULER: 'false' }, () => {
      assert.equal(startMailingScheduler(), null);
    });
  });
});

describe('mapWithConcurrency', () => {
  test('never runs more than the limit at once and keeps result order', async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);
    const results = await mapWithConcurrency(items, 5, async (i) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, 2));
      inFlight -= 1;
      return i * 2;
    });
    assert.ok(peak <= 5, `peak ${peak}`);
    assert.deepEqual(results, items.map(i => i * 2));
  });
});

describe('mailings routes without a database', () => {
  let server;
  let base;
  let savedSecret;

  before(async () => {
    savedSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET_ENV.JWT_SECRET;
    const app = express();
    app.use(express.json());
    app.use('/api/mailings', mailingsRouter);
    await new Promise(resolve => {
      server = app.listen(0, '127.0.0.1', () => {
        base = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (savedSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedSecret;
    await new Promise(resolve => server.close(resolve));
  });

  test('staff endpoints require a token', async () => {
    resetPublicRateLimit();
    const res = await fetch(`${base}/api/mailings/lists`);
    assert.equal(res.status, 401);
  });

  test('public subscribe rejects a malformed address without touching the database', async () => {
    resetPublicRateLimit();
    const res = await fetch(`${base}/api/mailings/public/lists/${LIST_ID}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-address' }),
    });
    assert.equal(res.status, 400);
  });

  test('public confirm and unsubscribe refuse a bad token with an HTML page', async () => {
    resetPublicRateLimit();
    const confirm = await fetch(`${base}/api/mailings/public/confirm?s=${SUB_ID}&t=abc`);
    assert.equal(confirm.status, 400);
    assert.match(confirm.headers.get('content-type'), /text\/html/);
    const unsub = await fetch(`${base}/api/mailings/public/unsubscribe?s=${SUB_ID}&t=abc`);
    assert.equal(unsub.status, 400);
  });

  test('public endpoints are rate-limited per IP (10 per minute)', async () => {
    resetPublicRateLimit();
    const statuses = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await fetch(`${base}/api/mailings/public/lists/${LIST_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad' }),
      });
      statuses.push(res.status);
    }
    assert.equal(statuses.slice(0, 10).every(s => s === 400), true);
    assert.equal(statuses[10], 429);
    resetPublicRateLimit();
  });
});
