import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCutoffs,
  parseStatsDays,
  retentionConfig,
  shouldRunRetention,
  buildGroupsSql,
  buildSelectIdsSql,
  buildStatusCountSql,
  buildReasonCountSql,
  buildStatsUpsert,
  purgeExpiredPrayers,
  getRetentionStats,
} from '../src/services/prayerRetention.js';

// Pure helpers and a fake database. The SQL itself is checked against PostgreSQL in a scratch run.

describe('computeCutoffs', () => {
  test('created cutoff is now minus N days; end cutoff is the Helsinki date minus N days', () => {
    const now = new Date('2026-11-26T10:00:00Z');
    const c14 = computeCutoffs(now, 14);
    assert.equal(c14.createdBefore.toISOString(), '2026-11-12T10:00:00.000Z');
    assert.equal(c14.endedBefore, '2026-11-12');
    assert.equal(computeCutoffs(now, 30).endedBefore, '2026-10-27');
  });

  test('the end cutoff uses the Helsinki calendar date, not the UTC one', () => {
    // 23:30 UTC on 25 Nov is already 01:30 on 26 Nov in Helsinki.
    assert.equal(computeCutoffs(new Date('2026-11-25T23:30:00Z'), 14).endedBefore, '2026-11-12');
  });

  test('crosses month and year boundaries', () => {
    assert.equal(computeCutoffs(new Date('2027-01-05T12:00:00Z'), 14).endedBefore, '2026-12-22');
  });

  test('rejects days that are not integers >= 1', () => {
    const now = new Date('2026-11-26T10:00:00Z');
    for (const bad of [0, -1, 1.5, NaN, '30']) {
      assert.throws(() => computeCutoffs(now, bad), /integer/);
    }
  });
});

describe('parseStatsDays', () => {
  test('defaults to 90 and accepts 1 to 365', () => {
    assert.deepEqual(parseStatsDays(undefined), { days: 90 });
    assert.deepEqual(parseStatsDays('1'), { days: 1 });
    assert.deepEqual(parseStatsDays('365'), { days: 365 });
  });

  test('rejects 0, 366, negatives, decimals and text', () => {
    for (const bad of ['0', '366', '-3', '1.5', 'abc', '', '1000']) {
      assert.ok(parseStatsDays(bad).error, `expected error for ${JSON.stringify(bad)}`);
    }
  });
});

describe('retentionConfig', () => {
  test('defaults: enabled, 30 and 14 days', () => {
    assert.deepEqual(retentionConfig({}), { enabled: true, unpublishedDays: 30, publishedDays: 14 });
  });

  test('RETENTION_ENABLED=false disables; other values keep it on', () => {
    assert.equal(retentionConfig({ RETENTION_ENABLED: 'false' }).enabled, false);
    assert.equal(retentionConfig({ RETENTION_ENABLED: ' FALSE ' }).enabled, false);
    assert.equal(retentionConfig({ RETENTION_ENABLED: 'true' }).enabled, true);
    assert.equal(retentionConfig({ RETENTION_ENABLED: '0' }).enabled, true);
  });

  test('invalid day counts fall back to the defaults', () => {
    const cfg = retentionConfig({ RETENTION_UNPUBLISHED_DAYS: '0', RETENTION_PUBLISHED_DAYS: 'x' });
    assert.equal(cfg.unpublishedDays, 30);
    assert.equal(cfg.publishedDays, 14);
    assert.equal(retentionConfig({ RETENTION_UNPUBLISHED_DAYS: '45', RETENTION_PUBLISHED_DAYS: '7' }).unpublishedDays, 45);
  });
});

describe('shouldRunRetention', () => {
  test('runs once per Helsinki day at or after 03:00', () => {
    // 2026-11-26 is UTC+2 in Helsinki: 01:00 UTC is 03:00 local.
    assert.equal(shouldRunRetention(new Date('2026-11-26T00:59:00Z'), null), false);
    assert.equal(shouldRunRetention(new Date('2026-11-26T01:00:00Z'), null), true);
    assert.equal(shouldRunRetention(new Date('2026-11-26T20:00:00Z'), null), true);
    assert.equal(shouldRunRetention(new Date('2026-11-26T20:00:00Z'), '2026-11-26'), false);
    assert.equal(shouldRunRetention(new Date('2026-11-27T01:30:00Z'), '2026-11-26'), true);
  });
});

describe('SQL builders', () => {
  test('selection is limited to public prayers and never reads text in the counts', () => {
    assert.match(buildGroupsSql(), /p\.type = 'public'/);
    assert.match(buildSelectIdsSql(), /FOR UPDATE OF p/);
    assert.match(buildSelectIdsSql(), /IS NOT DISTINCT FROM \$3::uuid/);
    for (const sql of [buildGroupsSql(), buildSelectIdsSql(), buildStatusCountSql(), buildReasonCountSql()]) {
      assert.doesNotMatch(sql, /original_content|redacted_content|sanitized_content/);
      assert.doesNotMatch(sql, /staff|pastor|bishop/);
    }
  });

  test('the upsert carries counts and JSON maps only', () => {
    const { text, values } = buildStatsUpsert('2026-11-26', null, 2, 3, { clean: 3, needs_review: 2 }, { hetu: 1 });
    assert.match(text, /ON CONFLICT \(day, tenant_id\) DO UPDATE/);
    assert.deepEqual(values.slice(0, 4), ['2026-11-26', null, 2, 3]);
    assert.deepEqual(JSON.parse(values[4]), { clean: 3, needs_review: 2 });
    assert.deepEqual(JSON.parse(values[5]), { hetu: 1 });
  });
});

// Fake database: records every statement; enough to check transaction order, the delete and the stats write.
function fakeDb({ failOn } = {}) {
  const log = [];
  const client = {
    async query(text, params) {
      log.push({ text, params });
      if (failOn && failOn(text)) throw new Error('forced failure');
      if (/FROM prayer_requests p\s+WHERE/.test(text) && /SELECT p\.id/.test(text)) return { rows: [{ id: 'id-1' }, { id: 'id-2' }, { id: 'id-3' }] };
      if (/is_approved IS TRUE\) AS published/.test(text)) return { rows: [{ published: false, status: 'needs_review', n: 1 }, { published: true, status: 'clean', n: 2 }] };
      if (/AS reason/.test(text)) return { rows: [{ reason: 'hetu', n: 1 }] };
      return { rows: [] };
    },
    release() { log.push({ text: 'RELEASE' }); },
  };
  const db = {
    log,
    async query(text, params) {
      log.push({ text, params, pool: true });
      if (/SELECT DISTINCT p\.tenant_id/.test(text)) return { rows: [{ tenant_id: null }] };
      return { rows: [] };
    },
    async getClient() { return client; },
  };
  return db;
}

describe('purgeExpiredPrayers with a fake database', () => {
  test('one transaction per tenant group: count, record stats, delete, then mark the day', async () => {
    const db = fakeDb();
    const out = await purgeExpiredPrayers({ now: new Date('2026-11-26T10:00:00Z'), db });
    assert.deepEqual(out, { unpublished: 1, published: 2 });

    const texts = db.log.map((e) => e.text || '');
    const begin = texts.findIndex((t) => t === 'BEGIN');
    const commit = texts.findIndex((t) => t === 'COMMIT');
    const del = texts.findIndex((t) => /DELETE FROM prayer_requests/.test(t));
    assert.ok(begin >= 0 && begin < del && del < commit, 'delete happens inside the transaction');

    const deleteEntry = db.log.find((e) => /DELETE FROM prayer_requests/.test(e.text));
    assert.deepEqual(deleteEntry.params[0], ['id-1', 'id-2', 'id-3']);
    assert.ok(db.log.some((e) => /INSERT INTO prayer_retention_stats/.test(e.text) && /DO UPDATE/.test(e.text)));
    assert.ok(db.log.some((e) => e.pool && /DO NOTHING/.test(e.text)), 'day marker written');
  });

  test('a failure inside the transaction rolls back and rethrows', async () => {
    const db = fakeDb({ failOn: (t) => /DELETE FROM prayer_requests/.test(t) });
    await assert.rejects(() => purgeExpiredPrayers({ now: new Date('2026-11-26T10:00:00Z'), db }), /forced failure/);
    assert.ok(db.log.some((e) => e.text === 'ROLLBACK'));
    assert.ok(!db.log.some((e) => e.text === 'COMMIT'));
  });

  test('rejects invalid day windows before touching the database', async () => {
    const db = fakeDb();
    await assert.rejects(() => purgeExpiredPrayers({ unpublishedDays: 0, db }));
    assert.equal(db.log.length, 0);
  });
});

describe('getRetentionStats', () => {
  test('sums rows per day across tenants and never returns ids', async () => {
    const rows = [
      { day: '2026-11-25', purged_unpublished: 2, purged_published: 1, by_status: { clean: 2, needs_review: 1 }, by_reason: { hetu: 1 } },
      { day: '2026-11-25', purged_unpublished: 1, purged_published: 0, by_status: { clean: 1 }, by_reason: { email: 2 } },
      { day: '2026-11-26', purged_unpublished: 0, purged_published: 0, by_status: {}, by_reason: {} },
    ];
    const db = { async query() { return { rows }; } };
    const out = await getRetentionStats({ days: 2, now: new Date('2026-11-26T10:00:00Z'), db });
    assert.equal(out.from, '2026-11-25');
    assert.equal(out.to, '2026-11-26');
    assert.deepEqual(out.totals, { unpublished: 3, published: 1, byStatus: { clean: 3, needs_review: 1 }, byReason: { hetu: 1, email: 2 } });
    assert.deepEqual(out.byDay, [
      { day: '2026-11-25', unpublished: 3, published: 1 },
      { day: '2026-11-26', unpublished: 0, published: 0 },
    ]);
    assert.equal(JSON.stringify(out).includes('"id"'), false);
  });
});
