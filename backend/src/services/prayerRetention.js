/**
 * Retention of PUBLIC prayer requests.
 *   - unpublished (is_approved not true): deleted when created_at < now - unpublishedDays (default 30)
 *   - published (is_approved true): deleted when end_date < today(Helsinki) - publishedDays (default 14)
 * Staff, pastor and bishop prayers (type <> 'public') are never touched.
 *
 * Before a row is deleted, its counts are added to prayer_retention_stats (per Helsinki day and
 * tenant). Stats hold counts only: by redaction status and by finding type. Prayer text is never
 * read into this module and never logged. moderation_decisions rows go with the prayer (ON DELETE CASCADE).
 */

import { query, getClient } from '../db/index.js';
import { helsinkiParts } from './mailingService.js';

export const DEFAULT_UNPUBLISHED_DAYS = 30;
export const DEFAULT_PUBLISHED_DAYS = 14;
export const RETENTION_TICK_MS = 60 * 60 * 1000;
/** The purge runs once per Helsinki day, at or after this hour. */
export const RETENTION_RUN_HOUR = 3;
export const STATS_DEFAULT_DAYS = 90;
export const STATS_MAX_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

function assertDays(days) {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('Retention days must be an integer >= 1');
  }
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/** Shifts a YYYY-MM-DD calendar date by whole days. */
function shiftDate(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Parses a day count from the environment. Missing or invalid values fall back to the default.
 * @param {unknown} value
 * @param {number} fallback
 */
export function parseRetentionDays(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const n = Number(String(value).trim());
  if (Number.isInteger(n) && n >= 1) return n;
  console.warn(`Prayer retention: invalid day count in configuration, using ${fallback}`);
  return fallback;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ enabled: boolean, unpublishedDays: number, publishedDays: number }}
 */
export function retentionConfig(env = process.env) {
  const flag = typeof env.RETENTION_ENABLED === 'string' ? env.RETENTION_ENABLED.trim().toLowerCase() : '';
  return {
    enabled: flag !== 'false',
    unpublishedDays: parseRetentionDays(env.RETENTION_UNPUBLISHED_DAYS, DEFAULT_UNPUBLISHED_DAYS),
    publishedDays: parseRetentionDays(env.RETENTION_PUBLISHED_DAYS, DEFAULT_PUBLISHED_DAYS),
  };
}

/**
 * Cutoffs for a retention window of `days`. Pure.
 *  createdBefore: a Date; unpublished prayers created before it are expired.
 *  endedBefore:   a YYYY-MM-DD Helsinki date; published prayers whose end_date is before it are expired.
 * @param {Date|string|number} now
 * @param {number} days integer >= 1
 */
export function computeCutoffs(now, days) {
  assertDays(days);
  const at = toDate(now);
  return {
    createdBefore: new Date(at.getTime() - days * DAY_MS),
    endedBefore: shiftDate(helsinkiParts(at).date, -days),
  };
}

/**
 * Parses the ?days query of the stats endpoint. Default 90, integers 1 to 365 only.
 * @param {unknown} raw
 * @returns {{ days: number } | { error: string }}
 */
export function parseStatsDays(raw) {
  if (raw === undefined) return { days: STATS_DEFAULT_DAYS };
  const text = String(raw).trim();
  if (!/^\d{1,3}$/.test(text)) return { error: 'days must be an integer from 1 to 365' };
  const days = Number(text);
  if (days < 1 || days > STATS_MAX_DAYS) return { error: 'days must be an integer from 1 to 365' };
  return { days };
}

// ---------------------------------------------------------------------------
// SQL builders (pure)
// ---------------------------------------------------------------------------

/** Expired public prayers. $1 = createdBefore (timestamptz), $2 = endedBefore (date). */
const EXPIRED_PUBLIC = `
  p.type = 'public'
  AND (
    (p.is_approved IS NOT TRUE AND p.created_at < $1)
    OR (p.is_approved IS TRUE AND p.end_date < $2::date)
  )`;

/** Tenant groups that have expired public prayers. Params: [createdBefore, endedBefore]. */
export function buildGroupsSql() {
  return `SELECT DISTINCT p.tenant_id FROM prayer_requests p WHERE ${EXPIRED_PUBLIC}`;
}

/** Ids of one tenant group, locked for the purge. Params: [createdBefore, endedBefore, tenantId|null]. */
export function buildSelectIdsSql() {
  return `SELECT p.id FROM prayer_requests p
    WHERE ${EXPIRED_PUBLIC}
      AND p.tenant_id IS NOT DISTINCT FROM $3::uuid
    ORDER BY p.id
    FOR UPDATE OF p`;
}

/** Counts by publication and redaction status, for ids. Params: [ids]. Never reads text columns. */
export function buildStatusCountSql() {
  return `SELECT (p.is_approved IS TRUE) AS published,
      COALESCE(p.redaction_status, 'none') AS status,
      COUNT(*)::int AS n
    FROM prayer_requests p
    WHERE p.id = ANY($1::uuid[])
    GROUP BY 1, 2`;
}

/** Number of prayers per finding type, for ids. Params: [ids]. Finding offsets and text are not selected. */
export function buildReasonCountSql() {
  return `SELECT f->>'type' AS reason, COUNT(DISTINCT p.id)::int AS n
    FROM prayer_requests p
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.moderation_findings) = 'array' THEN p.moderation_findings ELSE '[]'::jsonb END
    ) AS f
    WHERE p.id = ANY($1::uuid[])
      AND f->>'type' IS NOT NULL
    GROUP BY 1`;
}

/**
 * Adds one purge run to the stats row of (day, tenant). Maps are summed key by key.
 * @param {string} day YYYY-MM-DD (Helsinki)
 * @param {string|null} tenantId
 * @param {number} unpublished
 * @param {number} published
 * @param {Record<string, number>} byStatus
 * @param {Record<string, number>} byReason
 */
export function buildStatsUpsert(day, tenantId, unpublished, published, byStatus, byReason) {
  const mergeMap = (column) => `(
      SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
      FROM (
        SELECT key AS k, SUM(value::int) AS v
        FROM (
          SELECT key, value FROM jsonb_each_text(prayer_retention_stats.${column})
          UNION ALL
          SELECT key, value FROM jsonb_each_text(EXCLUDED.${column})
        ) merged
        GROUP BY key
      ) totals
    )`;
  const text = `
    INSERT INTO prayer_retention_stats (day, tenant_id, purged_unpublished, purged_published, by_status, by_reason)
    VALUES ($1::date, $2::uuid, $3::int, $4::int, $5::jsonb, $6::jsonb)
    ON CONFLICT (day, tenant_id) DO UPDATE SET
      purged_unpublished = prayer_retention_stats.purged_unpublished + EXCLUDED.purged_unpublished,
      purged_published = prayer_retention_stats.purged_published + EXCLUDED.purged_published,
      by_status = ${mergeMap('by_status')},
      by_reason = ${mergeMap('by_reason')}`;
  return {
    text,
    values: [day, tenantId ?? null, unpublished, published, JSON.stringify(byStatus), JSON.stringify(byReason)],
  };
}

// ---------------------------------------------------------------------------
// Purge
// ---------------------------------------------------------------------------

/**
 * Purges one tenant group inside the caller's transaction.
 * @returns {Promise<{ unpublished: number, published: number }>}
 */
async function purgeGroup(client, tenantId, cutoffs, day) {
  const idRows = (await client.query(buildSelectIdsSql(), [cutoffs.createdBefore, cutoffs.endedBefore, tenantId])).rows;
  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) return { unpublished: 0, published: 0 };

  const statusRows = (await client.query(buildStatusCountSql(), [ids])).rows;
  const reasonRows = (await client.query(buildReasonCountSql(), [ids])).rows;

  let unpublished = 0;
  let published = 0;
  const byStatus = {};
  for (const row of statusRows) {
    if (row.published) published += row.n;
    else unpublished += row.n;
    byStatus[row.status] = (byStatus[row.status] || 0) + row.n;
  }
  const byReason = {};
  for (const row of reasonRows) {
    byReason[row.reason] = row.n;
  }

  const upsert = buildStatsUpsert(day, tenantId, unpublished, published, byStatus, byReason);
  await client.query(upsert.text, upsert.values);
  await client.query('DELETE FROM prayer_requests WHERE id = ANY($1::uuid[])', [ids]);
  return { unpublished, published };
}

/**
 * Deletes expired public prayers, one transaction per tenant group, and records their counts.
 * `db` must provide query(text, params) and getClient() (a pooled client with release()).
 * @returns {Promise<{ unpublished: number, published: number }>}
 */
export async function purgeExpiredPrayers({
  now = new Date(),
  unpublishedDays = DEFAULT_UNPUBLISHED_DAYS,
  publishedDays = DEFAULT_PUBLISHED_DAYS,
  db = { query, getClient },
} = {}) {
  assertDays(unpublishedDays);
  assertDays(publishedDays);
  const at = toDate(now);
  const day = helsinkiParts(at).date;
  const createdBefore = computeCutoffs(at, unpublishedDays).createdBefore;
  const endedBefore = computeCutoffs(at, publishedDays).endedBefore;
  const cutoffs = { createdBefore, endedBefore };

  const groupRows = (await db.query(buildGroupsSql(), [createdBefore, endedBefore])).rows;
  const tenantIds = groupRows.map((r) => r.tenant_id ?? null);

  let unpublished = 0;
  let published = 0;
  for (const tenantId of tenantIds) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const counts = await purgeGroup(client, tenantId, cutoffs, day);
      await client.query('COMMIT');
      unpublished += counts.unpublished;
      published += counts.published;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Marks the day as done, so a restart later the same day does not purge again.
  await db.query(
    `INSERT INTO prayer_retention_stats (day, tenant_id) VALUES ($1::date, NULL)
     ON CONFLICT (day, tenant_id) DO NOTHING`,
    [day]
  );

  return { unpublished, published };
}

// ---------------------------------------------------------------------------
// Stats (read)
// ---------------------------------------------------------------------------

/**
 * Stats for the last `days` Helsinki days (today included), summed over tenants. Counts only.
 * @returns {Promise<{ days: number, from: string, to: string, totals: object, byDay: object[] }>}
 */
export async function getRetentionStats({ days = STATS_DEFAULT_DAYS, now = new Date(), db = { query } } = {}) {
  assertDays(days);
  const to = helsinkiParts(toDate(now)).date;
  const from = shiftDate(to, -(days - 1));
  const { rows } = await db.query(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, purged_unpublished, purged_published, by_status, by_reason
     FROM prayer_retention_stats
     WHERE day >= $1::date AND day <= $2::date
     ORDER BY day`,
    [from, to]
  );

  const totals = { unpublished: 0, published: 0, byStatus: {}, byReason: {} };
  const byDayMap = new Map();
  const addMap = (target, source) => {
    for (const [key, value] of Object.entries(source || {})) {
      target[key] = (target[key] || 0) + Number(value);
    }
  };
  for (const row of rows) {
    totals.unpublished += row.purged_unpublished;
    totals.published += row.purged_published;
    addMap(totals.byStatus, row.by_status);
    addMap(totals.byReason, row.by_reason);
    const entry = byDayMap.get(row.day) || { day: row.day, unpublished: 0, published: 0 };
    entry.unpublished += row.purged_unpublished;
    entry.published += row.purged_published;
    byDayMap.set(row.day, entry);
  }

  return { days, from, to, totals, byDay: [...byDayMap.values()] };
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Pure: should the purge run now? Once per Helsinki day, at or after RETENTION_RUN_HOUR.
 * @param {Date} now
 * @param {string|null} lastRunDay Helsinki date of the last run in this process
 */
export function shouldRunRetention(now, lastRunDay) {
  const parts = helsinkiParts(toDate(now));
  return parts.hour >= RETENTION_RUN_HOUR && parts.date !== lastRunDay;
}

/**
 * Starts the hourly check. Does nothing when RETENTION_ENABLED=false.
 * A day already in prayer_retention_stats (from an earlier run, possibly before a restart) is not purged again.
 * @returns {{ stop: () => void } | null}
 */
export function startRetentionScheduler(env = process.env, { db = { query, getClient } } = {}) {
  const config = retentionConfig(env);
  if (!config.enabled) {
    console.log('Prayer retention disabled (RETENTION_ENABLED=false)');
    return null;
  }

  let lastRunDay = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    const now = new Date();
    if (!shouldRunRetention(now, lastRunDay)) return;
    const day = helsinkiParts(now).date;
    running = true;
    try {
      const { rows } = await db.query('SELECT 1 FROM prayer_retention_stats WHERE day = $1::date LIMIT 1', [day]);
      if (rows.length > 0) {
        lastRunDay = day;
        return;
      }
      const result = await purgeExpiredPrayers({
        now,
        unpublishedDays: config.unpublishedDays,
        publishedDays: config.publishedDays,
        db,
      });
      lastRunDay = day;
      console.log(`Prayer retention: removed ${result.unpublished} unpublished and ${result.published} published public prayers`);
    } catch (err) {
      console.error(`Prayer retention failed: ${err.message}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => { tick(); }, RETENTION_TICK_MS);
  tick();
  console.log(`Prayer retention scheduler started (hourly check, runs from ${RETENTION_RUN_HOUR}:00 Helsinki time)`);
  return { stop: () => clearInterval(timer) };
}
