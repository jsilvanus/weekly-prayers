/**
 * Digest of the moderator's AUTOMATIC decisions, sent by email to subscribed moderators.
 *
 * Counts and finding types only. Nothing in this module reads, stores or logs prayer text.
 * Hard rejects are not stored as prayers, so they are tallied per day in moderation_reject_counts
 * (recordReject). Public prayers have tenant_id NULL and are visible to every tenant, so a tenant
 * digest counts `tenant_id = T OR tenant_id IS NULL`, the same scope the moderation list uses.
 */

import { query } from '../db/index.js';
import { roleHierarchy } from '../middleware/authorize.js';
import { deliverViaTunnus, escapeHtml, helsinkiParts, isMailingConfigured } from './mailingService.js';

export const DIGEST_FREQUENCIES = ['daily', 'weekly'];
export const DIGEST_CHANNELS = ['email', 'inapp'];
export const DIGEST_PERIOD_MS = { daily: 24 * 60 * 60 * 1000, weekly: 7 * 24 * 60 * 60 * 1000 };
/** Only moderators (worker and above) receive digests. */
export const DIGEST_MIN_ROLE = 'worker';
/** Relative path of the moderation view (PrayerManager lives under /admin). */
export const MODERATION_VIEW_PATH = '/admin';

const REASON_KEY_RE = /^[a-z_]{1,40}$/;

/** Decision value -> digest totals key. */
const DECISION_TOTAL_KEYS = {
  auto_clean: 'autoClean',
  auto_review: 'autoReview',
  human_redacted: 'humanRedacted',
  human_confirmed_auto: 'humanConfirmedAuto',
  human_overturned: 'humanOverturned',
};

const EMPTY_TOTALS = Object.freeze({
  autoClean: 0,
  autoReview: 0,
  rejected: 0,
  humanRedacted: 0,
  humanConfirmedAuto: 0,
  humanOverturned: 0,
});

// ---------------------------------------------------------------------------
// Reject counter (writes)
// ---------------------------------------------------------------------------

/**
 * Keeps only finding-type keys and positive integer counts. Anything else is dropped, so
 * text can never reach the counter even if a caller passes it in by mistake.
 */
export function normalizeRejectReasons(reasons) {
  const out = {};
  if (!reasons || typeof reasons !== 'object') return out;
  for (const [key, value] of Object.entries(reasons)) {
    const n = Number(value);
    if (REASON_KEY_RE.test(key) && Number.isInteger(n) && n > 0) out[key] = n;
  }
  return out;
}

/**
 * SQL for one reject event: inserts today's row or adds 1 to its count and merges the
 * per-type counts. Pure, so it can be tested without a database.
 * @param {string|null} tenantId
 * @param {Record<string, number>} reasons
 * @param {string} day YYYY-MM-DD (Helsinki date)
 */
export function buildRejectUpsert(tenantId, reasons, day) {
  const text = `
    INSERT INTO moderation_reject_counts (day, tenant_id, reasons, count)
    VALUES ($1, $2, $3::jsonb, 1)
    ON CONFLICT (day, tenant_id) DO UPDATE SET
      count = moderation_reject_counts.count + 1,
      reasons = (
        SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb)
        FROM (
          SELECT key AS k, SUM(value::int) AS v
          FROM (
            SELECT key, value FROM jsonb_each_text(moderation_reject_counts.reasons)
            UNION ALL
            SELECT key, value FROM jsonb_each_text(EXCLUDED.reasons)
          ) merged
          GROUP BY key
        ) totals
      )`;
  const values = [day, tenantId ?? null, JSON.stringify(normalizeRejectReasons(reasons))];
  return { text, values };
}

/**
 * Counts one hard reject for today (Helsinki date). Throws on database errors; callers decide
 * whether a counter failure may block the response (the routes log it and carry on).
 * @param {string|null} tenantId public prayers are stored with tenant NULL, so pass null there
 * @param {Record<string, number>} reasons finding-type counts from the policy verdict
 * @param {Date} [now]
 */
export async function recordReject(tenantId, reasons, now = new Date()) {
  const day = helsinkiParts(now).date;
  const { text, values } = buildRejectUpsert(tenantId, reasons, day);
  await query(text, values);
}

// ---------------------------------------------------------------------------
// Digest (reads)
// ---------------------------------------------------------------------------

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Builds the digest for [sinceTs, untilTs). `tenantId` null/undefined means all tenants.
 * Reject counts are day-granular, so the reject figures cover whole Helsinki days from the
 * day of `sinceTs` through the day of `untilTs`.
 * @returns {Promise<{ period: { since: string, until: string }, totals: object, byReason: Record<string, number>, awaitingReview: number, links: { review: string } }>}
 */
export async function buildDigest(sinceTs, untilTs, tenantId = null) {
  const since = toDate(sinceTs);
  const until = toDate(untilTs);
  const scope = tenantId ?? null;
  const dayFrom = helsinkiParts(since).date;
  const dayTo = helsinkiParts(until).date;

  const [decisionRows, autoReasonRows, rejectRows, awaitingRows] = await Promise.all([
    query(
      `SELECT d.decision, COUNT(*)::int AS n
       FROM moderation_decisions d
       JOIN prayer_requests p ON p.id = d.prayer_id
       WHERE d.created_at >= $1 AND d.created_at < $2
         AND ($3::uuid IS NULL OR p.tenant_id = $3 OR p.tenant_id IS NULL)
       GROUP BY d.decision`,
      [since, until, scope]
    ),
    query(
      `SELECT r.key, SUM(r.value::int)::int AS n
       FROM moderation_decisions d
       JOIN prayer_requests p ON p.id = d.prayer_id
       CROSS JOIN LATERAL jsonb_each_text(COALESCE(d.reasons, '{}'::jsonb)) r
       WHERE d.actor = 'system'
         AND d.created_at >= $1 AND d.created_at < $2
         AND ($3::uuid IS NULL OR p.tenant_id = $3 OR p.tenant_id IS NULL)
       GROUP BY r.key`,
      [since, until, scope]
    ),
    query(
      `SELECT reasons, count
       FROM moderation_reject_counts
       WHERE day >= $1::date AND day <= $2::date
         AND ($3::uuid IS NULL OR tenant_id = $3 OR tenant_id IS NULL)`,
      [dayFrom, dayTo, scope]
    ),
    query(
      `SELECT COUNT(*)::int AS n
       FROM prayer_requests p
       WHERE p.type = 'public' AND p.redaction_status = 'needs_review'
         AND ($1::uuid IS NULL OR p.tenant_id = $1 OR p.tenant_id IS NULL)`,
      [scope]
    ),
  ]);

  const totals = { ...EMPTY_TOTALS };
  for (const row of decisionRows.rows) {
    const key = DECISION_TOTAL_KEYS[row.decision];
    if (key) totals[key] += Number(row.n);
  }

  const byReason = {};
  for (const row of autoReasonRows.rows) {
    byReason[row.key] = (byReason[row.key] || 0) + Number(row.n);
  }

  for (const row of rejectRows.rows) {
    totals.rejected += Number(row.count);
    for (const [key, n] of Object.entries(normalizeRejectReasons(row.reasons))) {
      byReason[key] = (byReason[key] || 0) + n;
    }
  }

  return {
    period: { since: since.toISOString(), until: until.toISOString() },
    totals,
    byReason,
    awaitingReview: Number(awaitingRows.rows[0]?.n ?? 0),
    links: { review: MODERATION_VIEW_PATH },
  };
}

/** True when there is nothing to report and nothing waiting for review. */
export function isEmptyDigest(digest) {
  const totalsEmpty = Object.values(digest.totals).every((n) => Number(n) === 0);
  return totalsEmpty && Number(digest.awaitingReview) === 0;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const LABELS = {
  fi: {
    subject: 'Päätösyhteenveto esirukouspyynnöistä',
    intro: 'Automaattisten moderointipäätösten yhteenveto ajalta',
    sectionAuto: 'Automaattiset päätökset',
    sectionHuman: 'Ihmisen päätökset',
    sectionReasons: 'Tunnistetyypit (automaattiset)',
    awaiting: 'Odottaa tarkistusta',
    link: 'Avaa moderointinäkymä',
    none: 'ei tapahtumia',
    to: '–',
    totals: {
      autoClean: 'Puhdistettu automaattisesti',
      autoReview: 'Merkitty tarkistettavaksi',
      rejected: 'Hylätty automaattisesti (ei tallennettu)',
      humanRedacted: 'Redaktoitu käsin',
      humanConfirmedAuto: 'Automaattinen ehdotus vahvistettu',
      humanOverturned: 'Automaattinen päätös kumottu',
    },
  },
  sv: {
    subject: 'Sammanfattning av beslut om förbönsbegäran',
    intro: 'Sammanfattning av automatiska modereringsbeslut under',
    sectionAuto: 'Automatiska beslut',
    sectionHuman: 'Mänskliga beslut',
    sectionReasons: 'Identifierade typer (automatiska)',
    awaiting: 'Väntar på granskning',
    link: 'Öppna modereringsvyn',
    none: 'inga händelser',
    to: '–',
    totals: {
      autoClean: 'Rensad automatiskt',
      autoReview: 'Markerad för granskning',
      rejected: 'Automatiskt avvisad (inte sparad)',
      humanRedacted: 'Redigerad manuellt',
      humanConfirmedAuto: 'Automatiskt förslag bekräftat',
      humanOverturned: 'Automatiskt beslut underkänt',
    },
  },
  en: {
    subject: 'Decision summary for prayer requests',
    intro: 'Summary of automatic moderation decisions for',
    sectionAuto: 'Automatic decisions',
    sectionHuman: 'Human decisions',
    sectionReasons: 'Finding types (automatic)',
    awaiting: 'Awaiting review',
    link: 'Open the moderation view',
    none: 'no activity',
    to: 'to',
    totals: {
      autoClean: 'Cleaned automatically',
      autoReview: 'Flagged for review',
      rejected: 'Rejected automatically (not stored)',
      humanRedacted: 'Redacted by a person',
      humanConfirmedAuto: 'Automatic suggestion confirmed',
      humanOverturned: 'Automatic decision overturned',
    },
  },
};

function labelsFor(lang) {
  return LABELS[lang] || LABELS.fi;
}

function publicBaseUrl() {
  return (process.env.BASE_URL || '').replace(/\/+$/, '');
}

function formatPeriod(period, L) {
  const from = helsinkiParts(new Date(period.since)).date;
  const to = helsinkiParts(new Date(period.until)).date;
  return from === to ? from : `${from} ${L.to} ${to}`;
}

/**
 * Plain text and simple HTML for one digest. Counts and finding types only.
 * @param {Awaited<ReturnType<typeof buildDigest>>} digest
 * @param {'fi'|'sv'|'en'} [lang='fi']
 * @returns {{ subject: string, text: string, html: string }}
 */
export function renderDigestText(digest, lang = 'fi') {
  const L = labelsFor(lang);
  const period = formatPeriod(digest.period, L);
  const link = `${publicBaseUrl()}${digest.links?.review || MODERATION_VIEW_PATH}`;
  const reasonEntries = Object.entries(digest.byReason || {}).sort((a, b) => b[1] - a[1]);

  const text = [
    `${L.subject} (${period})`,
    '',
    `${L.intro} ${period}.`,
    '',
    `${L.sectionAuto}:`,
    ...['autoClean', 'autoReview', 'rejected'].map((k) => `- ${L.totals[k]}: ${digest.totals[k]}`),
    '',
    `${L.sectionHuman}:`,
    ...['humanRedacted', 'humanConfirmedAuto', 'humanOverturned'].map((k) => `- ${L.totals[k]}: ${digest.totals[k]}`),
    '',
    `${L.sectionReasons}: ${reasonEntries.length ? reasonEntries.map(([k, n]) => `${k} ${n}`).join(', ') : L.none}`,
    `${L.awaiting}: ${digest.awaitingReview}`,
    '',
    `${L.link}: ${link}`,
  ].join('\n');

  const rowHtml = (k) => `<tr><td style="padding:2px 12px 2px 0">${escapeHtml(L.totals[k])}</td><td style="padding:2px 0;text-align:right"><strong>${escapeHtml(digest.totals[k])}</strong></td></tr>`;
  const html = `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:640px;margin:0 auto;padding:16px">
  <h1 style="font-size:20px">${escapeHtml(L.subject)}</h1>
  <p>${escapeHtml(L.intro)} ${escapeHtml(period)}.</p>
  <h2 style="font-size:16px">${escapeHtml(L.sectionAuto)}</h2>
  <table>${['autoClean', 'autoReview', 'rejected'].map(rowHtml).join('')}</table>
  <h2 style="font-size:16px">${escapeHtml(L.sectionHuman)}</h2>
  <table>${['humanRedacted', 'humanConfirmedAuto', 'humanOverturned'].map(rowHtml).join('')}</table>
  <p><strong>${escapeHtml(L.sectionReasons)}:</strong> ${escapeHtml(reasonEntries.length ? reasonEntries.map(([k, n]) => `${k} ${n}`).join(', ') : L.none)}</p>
  <p><strong>${escapeHtml(L.awaiting)}:</strong> ${escapeHtml(digest.awaitingReview)}</p>
  <p><a href="${escapeHtml(link)}">${escapeHtml(L.link)}</a></p>
</body></html>`;

  return { subject: `${L.subject} (${period})`, text, html };
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/** @returns {{ errors: string[], value: { frequency: string, channel: string, enabled: boolean } }} */
export function validateSubscriptionInput(input = {}) {
  const errors = [];
  if (!DIGEST_FREQUENCIES.includes(input.frequency)) {
    errors.push(`frequency must be one of: ${DIGEST_FREQUENCIES.join(', ')}`);
  }
  const channel = input.channel ?? 'email';
  if (!DIGEST_CHANNELS.includes(channel)) {
    errors.push(`channel must be one of: ${DIGEST_CHANNELS.join(', ')}`);
  }
  if (input.enabled !== undefined && input.enabled !== null && typeof input.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  return {
    errors,
    value: {
      frequency: input.frequency,
      channel,
      enabled: input.enabled !== false,
    },
  };
}

export function toSubscriptionDto(row) {
  if (!row) return null;
  return {
    frequency: row.frequency,
    channel: row.channel,
    enabled: row.enabled,
    lastSentAt: row.last_sent_at ?? null,
    createdAt: row.created_at ?? null,
  };
}

const SUBSCRIPTION_COLUMNS = 'frequency, channel, enabled, last_sent_at, created_at';

export async function getSubscriptionForUser(userId) {
  const res = await query(
    `SELECT ${SUBSCRIPTION_COLUMNS} FROM moderation_digest_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return toSubscriptionDto(res.rows[0]);
}

/**
 * Creates or updates a user's subscription. Re-enabling starts a fresh window now, so a long
 * pause does not produce one oversized digest.
 */
export async function upsertSubscription(userId, value) {
  const res = await query(
    `INSERT INTO moderation_digest_subscriptions (user_id, frequency, channel, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       frequency = EXCLUDED.frequency,
       channel = EXCLUDED.channel,
       last_sent_at = CASE
         WHEN EXCLUDED.enabled AND NOT moderation_digest_subscriptions.enabled THEN NOW()
         ELSE moderation_digest_subscriptions.last_sent_at
       END,
       enabled = EXCLUDED.enabled
     RETURNING ${SUBSCRIPTION_COLUMNS}`,
    [userId, value.frequency, value.channel, value.enabled]
  );
  return toSubscriptionDto(res.rows[0]);
}

/**
 * Pure: which enabled email subscriptions are due at `now`.
 * The window of a due subscription runs from its anchor (last_sent_at, or created_at for a
 * first digest) to `now`. Rows whose owner is no longer a moderator are skipped.
 * @param {Date} now
 * @param {Array<object>} rows subscription rows joined with users (role, tenant_id, email)
 * @returns {Array<{ row: object, sinceTs: Date, untilTs: Date }>}
 */
export function selectDueSubscriptions(now, rows) {
  const nowMs = toDate(now).getTime();
  const minRank = roleHierarchy[DIGEST_MIN_ROLE];
  const due = [];
  for (const row of rows) {
    if (row.enabled === false || row.channel !== 'email') continue;
    const periodMs = DIGEST_PERIOD_MS[row.frequency];
    if (!periodMs) continue;
    if ((roleHierarchy[row.role] || 0) < minRank) continue;
    const anchor = toDate(row.last_sent_at ?? row.created_at).getTime();
    if (!Number.isFinite(anchor)) continue;
    if (nowMs - anchor >= periodMs) {
      due.push({ row, sinceTs: new Date(anchor), untilTs: new Date(nowMs) });
    }
  }
  return due;
}

/**
 * Scheduler job: sends due digests by email through the existing mail relay.
 * - Nothing to report and nothing awaiting review: no mail, last_sent_at unchanged.
 * - last_sent_at is claimed before sending (guards against two runs) and restored if sending
 *   fails, so a failed send is retried on the next run.
 * Logs subscription ids and counts only, never addresses or content.
 * @returns {Promise<{ sent: number, skipped: number, failed: number }>}
 */
export async function runDigestTick(now = new Date()) {
  const result = { sent: 0, skipped: 0, failed: 0 };
  if (!isMailingConfigured()) return result;

  const res = await query(
    `SELECT s.id, s.user_id, s.frequency, s.channel, s.enabled, s.last_sent_at, s.created_at,
            s.last_sent_at::text AS last_sent_text, u.email, u.role, u.tenant_id
     FROM moderation_digest_subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.enabled AND s.channel = 'email'`
  );

  for (const { row, sinceTs, untilTs } of selectDueSubscriptions(now, res.rows)) {
    const digest = await buildDigest(sinceTs, untilTs, row.tenant_id);
    if (isEmptyDigest(digest)) {
      result.skipped += 1;
      continue;
    }

    // Compare with the exact database text: a JS Date keeps milliseconds only, the column keeps microseconds.
    const claim = await query(
      `UPDATE moderation_digest_subscriptions SET last_sent_at = $2
       WHERE id = $1 AND last_sent_at IS NOT DISTINCT FROM $3::timestamptz
       RETURNING id`,
      [row.id, untilTs, row.last_sent_text ?? null]
    );
    if (!claim.rows[0]) continue;

    try {
      const mail = renderDigestText(digest, 'fi');
      await deliverViaTunnus({ to: row.email, subject: mail.subject, text: mail.text, html: mail.html });
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      const message = String(err.message || 'error').split(row.email).join('[address]');
      console.error(`Moderation digest: delivery failed for subscription ${row.id}: ${message}`);
      await query(
        `UPDATE moderation_digest_subscriptions SET last_sent_at = $3::timestamptz
         WHERE id = $1 AND last_sent_at = $2`,
        [row.id, untilTs, row.last_sent_text ?? null]
      );
    }
  }
  return result;
}
