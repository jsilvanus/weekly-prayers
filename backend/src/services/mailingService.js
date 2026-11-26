import { createHmac, timingSafeEqual } from 'crypto';
import { sendRelayEmail } from '@tunnus/notify';
import { query } from '../db/index.js';
import { getPrayersForWeek } from './prayerService.js';
import { getSetting } from './settingsService.js';
import { getCurrentWeekInfoForTenant } from '../utils/weekHelper.js';
import { roleHierarchy } from '../middleware/authorize.js';

export const MAILING_TIME_ZONE = 'Europe/Helsinki';
export const MAX_SEND_DATES = 60;
export const MAX_BATCH_EMAILS = 500;
/** Roles a mailing can target directly (every role except admin). */
export const ROLE_TARGETS = Object.keys(roleHierarchy).filter(role => role !== 'admin');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PRAYER_SECTIONS = [
  { type: 'bishop', label: 'Piispan rukousaiheet' },
  { type: 'pastor', label: 'Kirkkoherran rukousaiheet' },
  { type: 'staff', label: 'Työalojen rukousaiheet' },
  { type: 'public', label: 'Seurakuntalaisten rukouspyynnöt' },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= 255 && EMAIL_RE.test(email);
}

export function validateListInput(input = {}) {
  const errors = [];
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) errors.push('name is required');
  else if (name.length > 120) errors.push('name must be at most 120 characters');

  let description = null;
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') errors.push('description must be a string');
    else if (input.description.length > 2000) errors.push('description must be at most 2000 characters');
    else description = input.description.trim() || null;
  }

  if (input.allowPublicSignup !== undefined && typeof input.allowPublicSignup !== 'boolean') {
    errors.push('allowPublicSignup must be a boolean');
  }

  return {
    errors,
    value: {
      name,
      description,
      allowPublicSignup: input.allowPublicSignup === true,
    },
  };
}

/**
 * Validate a mailing definition. A mailing must carry its send schedule:
 * - kind 'week': week, year and at least one send date
 * - kind 'recurring': sendWeekday (0 = Sunday) and startDate (endDate optional, >= startDate)
 * @returns {{ errors: string[], value: object }}
 */
export function validateMailingInput(input = {}) {
  const errors = [];
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) errors.push('name is required');
  else if (name.length > 120) errors.push('name must be at most 120 characters');

  const targetType = input.targetType ?? 'list';
  let listId = null;
  let targetRole = null;
  if (targetType !== 'list' && targetType !== 'role') {
    errors.push("targetType must be 'list' or 'role'");
  } else if (targetType === 'list') {
    if (!isUuid(input.listId)) errors.push('listId is required for list targets');
    else listId = input.listId;
    if (input.targetRole) errors.push('targetRole must not be set for list targets');
  } else {
    if (!ROLE_TARGETS.includes(input.targetRole)) {
      errors.push(`targetRole must be one of: ${ROLE_TARGETS.join(', ')}`);
    } else {
      targetRole = input.targetRole;
    }
    if (input.listId) errors.push('listId must not be set for role targets');
  }

  const kind = input.kind;
  if (kind !== 'week' && kind !== 'recurring') {
    errors.push("kind must be 'week' or 'recurring'");
  }

  const sendHour = input.sendHour === undefined || input.sendHour === null ? 8 : input.sendHour;
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    errors.push('sendHour must be an integer from 0 to 23');
  }

  let subject = null;
  if (input.subject !== undefined && input.subject !== null && input.subject !== '') {
    if (typeof input.subject !== 'string') errors.push('subject must be a string');
    else if (input.subject.length > 200) errors.push('subject must be at most 200 characters');
    else subject = input.subject.trim() || null;
  }

  const value = {
    name,
    listId,
    targetType: targetType === 'role' ? 'role' : 'list',
    targetRole,
    kind,
    week: null,
    year: null,
    sendDates: null,
    sendWeekday: null,
    startDate: null,
    endDate: null,
    sendHour: Number.isInteger(sendHour) ? sendHour : 8,
    subject,
    includePublic: input.includePublic === true,
    enabled: input.enabled !== false,
  };

  if (kind === 'week') {
    if (!Number.isInteger(input.week) || input.week < 1 || input.week > 53) {
      errors.push('week must be an integer from 1 to 53');
    }
    if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
      errors.push('year must be an integer from 2000 to 2100');
    }
    if (!Array.isArray(input.sendDates) || input.sendDates.length === 0) {
      errors.push('sendDates must contain at least one date');
    } else if (input.sendDates.length > MAX_SEND_DATES) {
      errors.push(`sendDates may contain at most ${MAX_SEND_DATES} dates`);
    } else if (!input.sendDates.every(isValidDateString)) {
      errors.push('sendDates must be dates in YYYY-MM-DD format');
    } else {
      value.sendDates = [...new Set(input.sendDates)].sort();
    }
    value.week = input.week ?? null;
    value.year = input.year ?? null;
  } else if (kind === 'recurring') {
    if (!Number.isInteger(input.sendWeekday) || input.sendWeekday < 0 || input.sendWeekday > 6) {
      errors.push('sendWeekday must be an integer from 0 (Sunday) to 6 (Saturday)');
    }
    if (!isValidDateString(input.startDate)) {
      errors.push('startDate is required (YYYY-MM-DD)');
    }
    if (input.endDate !== undefined && input.endDate !== null && input.endDate !== '') {
      if (!isValidDateString(input.endDate)) {
        errors.push('endDate must be a date in YYYY-MM-DD format');
      } else if (isValidDateString(input.startDate) && input.endDate < input.startDate) {
        errors.push('endDate must not be before startDate');
      } else {
        value.endDate = input.endDate;
      }
    }
    value.sendWeekday = input.sendWeekday ?? null;
    value.startDate = input.startDate ?? null;
  }

  return { errors, value };
}

// ---------------------------------------------------------------------------
// Consent tokens and public links
// ---------------------------------------------------------------------------

function tokenSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

/** HMAC-SHA256(JWT_SECRET, "<purpose>:<subscriber_id>") as hex. */
export function signMailingToken(purpose, subscriberId) {
  return createHmac('sha256', tokenSecret()).update(`${purpose}:${subscriberId}`).digest('hex');
}

export function verifyMailingToken(purpose, subscriberId, token) {
  if (typeof token !== 'string' || !isUuid(subscriberId)) return false;
  const expected = Buffer.from(signMailingToken(purpose, subscriberId), 'utf8');
  const given = Buffer.from(token, 'utf8');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

function publicBaseUrl() {
  return (process.env.BASE_URL || '').replace(/\/+$/, '');
}

export function buildPublicLink(path, purpose, id, idParam = 's') {
  const params = new URLSearchParams({
    [idParam]: id,
    t: signMailingToken(purpose, id),
  });
  return `${publicBaseUrl()}/api/mailings/public/${path}?${params.toString()}`;
}

export const buildConfirmUrl = (subscriberId) => buildPublicLink('confirm', 'confirm', subscriberId);
export const buildUnsubscribeUrl = (subscriberId) => buildPublicLink('unsubscribe', 'unsubscribe', subscriberId);
/** Opt-out link for role-targeted recipients; the id is the user id, never the address. */
export const buildOptoutUrl = (userId) => buildPublicLink('optout', 'optout', userId, 'u');

// ---------------------------------------------------------------------------
// Scheduling (pure)
// ---------------------------------------------------------------------------

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const helsinkiFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: MAILING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

/** Calendar date, hour and weekday of an instant in Helsinki time. */
export function helsinkiParts(now = new Date()) {
  const parts = Object.fromEntries(helsinkiFormatter.formatToParts(now).map(p => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    weekday: WEEKDAY_INDEX[parts.weekday],
  };
}

/**
 * Which mailings should be sent at `now`.
 * Pure: no I/O. `mailings` are rows as loaded from prayer_mailings (snake_case, dates as YYYY-MM-DD text).
 * `sentKeys` holds `${mailing_id}|${send_date}` for sends that already have a claim.
 * @returns {Array<{ mailing: object, sendDate: string }>}
 */
export function computeDueMailings(now, mailings, sentKeys = new Set()) {
  const today = helsinkiParts(now);
  const due = [];

  for (const mailing of mailings) {
    if (mailing.enabled === false) continue;
    if (today.hour < Number(mailing.send_hour ?? 8)) continue;

    let isDue = false;
    if (mailing.kind === 'week') {
      isDue = Array.isArray(mailing.send_dates) && mailing.send_dates.includes(today.date);
    } else if (mailing.kind === 'recurring') {
      isDue = today.weekday === Number(mailing.send_weekday)
        && mailing.start_date <= today.date
        && (!mailing.end_date || today.date <= mailing.end_date);
    }

    if (isDue && !sentKeys.has(`${mailing.id}|${today.date}`)) {
      due.push({ mailing, sendDate: today.date });
    }
  }
  return due;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turn the grouped getPrayersForWeek() result into ordered sections, dropping public requests unless allowed. */
export function collectPrayerSections(grouped, includePublic = false) {
  return PRAYER_SECTIONS
    .filter(section => includePublic || section.type !== 'public')
    .map(section => ({
      label: section.label,
      items: (grouped?.[section.type] || [])
        .map(p => String(p.content ?? '').trim())
        .filter(Boolean),
    }))
    .filter(section => section.items.length > 0);
}

/**
 * Render one prayer mail.
 * @param {object} args
 * @param {number} args.week
 * @param {number} args.year
 * @param {object} args.prayers grouped result of getPrayersForWeek()
 * @param {{ name?: string }} [args.tenant] sender/controller name (falls back to parish_name setting)
 * @param {string | null} [args.unsubscribeUrl] per-recipient link; null (preview/test) omits it
 * @param {string} [args.subject]
 * @param {boolean} [args.includePublic=false]
 * @returns {{ subject: string, text: string, html: string }}
 */
export function renderMailing({ week, year, prayers, tenant, unsubscribeUrl = null, subject, includePublic = false }) {
  const senderName = tenant?.name || 'Seurakunta';
  const sections = collectPrayerSections(prayers, includePublic);
  const heading = `Esirukoukset, viikko ${week} (${year})`;
  const finalSubject = subject || heading;

  const footerText = [
    `Lähettäjä: ${senderName}`,
    unsubscribeUrl
      ? `Peru tilauksesi: ${unsubscribeUrl}`
      : '(Esikatselu tai testiviesti: peruutuslinkki tulee lähetettävään viestiin.)',
  ];

  const textBody = sections.length === 0
    ? ['Tälle viikolle ei ole esirukousaiheita.']
    : sections.flatMap(section => [
      section.label.toUpperCase(),
      ...section.items.map(item => `- ${item.replace(/\s*\n\s*/g, ' ')}`),
      '',
    ]);

  const text = [heading, '', ...textBody, '--', ...footerText].join('\n');

  const sectionsHtml = sections.length === 0
    ? '<p>Tälle viikolle ei ole esirukousaiheita.</p>'
    : sections.map(section => `
      <h2 style="font-size:16px;margin:20px 0 8px">${escapeHtml(section.label)}</h2>
      <ul style="padding-left:20px;margin:0">
        ${section.items.map(item => `<li style="margin-bottom:8px">${escapeHtml(item).replace(/\n/g, '<br>')}</li>`).join('')}
      </ul>`).join('');

  const footerHtml = unsubscribeUrl
    ? `<p>Lähettäjä: ${escapeHtml(senderName)}</p>
      <p>Peru tilauksesi: <a href="${escapeHtml(unsubscribeUrl)}">${escapeHtml(unsubscribeUrl)}</a></p>`
    : `<p>Lähettäjä: ${escapeHtml(senderName)}</p>
      <p><em>Esikatselu tai testiviesti: peruutuslinkki tulee lähetettävään viestiin.</em></p>`;

  const html = `<!doctype html>
<html lang="fi">
  <body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:640px;margin:0 auto;padding:16px">
    <h1 style="font-size:20px">${escapeHtml(heading)}</h1>
    ${sectionsHtml}
    <hr style="margin-top:28px;border:none;border-top:1px solid #ddd">
    <div style="font-size:13px;color:#555">${footerHtml}</div>
  </body>
</html>`;

  return { subject: finalSubject, text, html };
}

export function renderConfirmationMail({ senderName, confirmUrl }) {
  const name = senderName || 'Seurakunta';
  const text = [
    'Vahvista esirukousviestien tilaus',
    '',
    'Olet pyytänyt tilausta viikoittaisiin esirukousviesteihin.',
    `Vahvista tilaus avaamalla linkki: ${confirmUrl}`,
    '',
    'Jos et pyytänyt tilausta, voit jättää tämän viestin huomiotta. Osoitettasi ei lisätä listalle ilman vahvistusta.',
    '',
    `Lähettäjä: ${name}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="fi">
  <body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:640px;margin:0 auto;padding:16px">
    <h1 style="font-size:20px">Vahvista esirukousviestien tilaus</h1>
    <p>Olet pyytänyt tilausta viikoittaisiin esirukousviesteihin.</p>
    <p><a href="${escapeHtml(confirmUrl)}">Vahvista tilaus</a></p>
    <p>Jos et pyytänyt tilausta, voit jättää tämän viestin huomiotta. Osoitettasi ei lisätä listalle ilman vahvistusta.</p>
    <hr style="margin-top:28px;border:none;border-top:1px solid #ddd">
    <p style="font-size:13px;color:#555">Lähettäjä: ${escapeHtml(name)}</p>
  </body>
</html>`;

  return { subject: 'Vahvista esirukousviestien tilaus', text, html };
}

// ---------------------------------------------------------------------------
// Delivery (Tunnus mail relay)
// ---------------------------------------------------------------------------

export function mailRelayConfig(env = process.env) {
  const url = env.TUNNUS_MAIL_URL;
  const token = env.TUNNUS_MAIL_RELAY_TOKEN;
  const from = env.MAIL_FROM;
  if (!url || !token || !from) return null;
  return { url, token, from };
}

export function isMailingConfigured(env = process.env) {
  return mailRelayConfig(env) !== null;
}

/**
 * Send one mail through the Tunnus relay. One call per recipient.
 * @param {{ to: string, subject: string, text: string, html?: string, fetchImpl?: typeof fetch }} args
 */
export async function deliverViaTunnus({ to, subject, text, html, fetchImpl = globalThis.fetch }) {
  const config = mailRelayConfig();
  if (!config) throw new Error('Mail relay is not configured');
  return sendRelayEmail({
    tunnusUrl: config.url,
    token: config.token,
    to,
    subject,
    text,
    html,
    from: config.from,
    fetchImpl,
  });
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

const LIST_SELECT = `
  l.id, l.tenant_id, l.name, l.description, l.allow_public_signup, l.created_at, l.updated_at,
  (SELECT COUNT(*)::int FROM mailing_subscribers s WHERE s.list_id = l.id AND s.status = 'active') AS active_count,
  (SELECT COUNT(*)::int FROM mailing_subscribers s WHERE s.list_id = l.id AND s.status = 'pending') AS pending_count`;

const MAILING_SELECT = `
  id, tenant_id, list_id, name, kind, week, year,
  send_dates::text[] AS send_dates, send_weekday,
  start_date::text AS start_date, end_date::text AS end_date,
  send_hour, subject, include_public, enabled, target_type, target_role, created_at, updated_at`;

export function toListDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    allowPublicSignup: row.allow_public_signup,
    activeCount: row.active_count ?? 0,
    pendingCount: row.pending_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMailingDto(row) {
  return {
    id: row.id,
    listId: row.list_id,
    targetType: row.target_type,
    targetRole: row.target_role,
    name: row.name,
    kind: row.kind,
    week: row.week,
    year: row.year,
    sendDates: row.send_dates,
    sendWeekday: row.send_weekday,
    startDate: row.start_date,
    endDate: row.end_date,
    sendHour: row.send_hour,
    subject: row.subject,
    includePublic: row.include_public,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSubscriberDto(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    consentSource: row.consent_source,
    consentAt: row.consent_at,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Lists (tenant-scoped)
// ---------------------------------------------------------------------------

export async function listMailingLists(tenantId) {
  const res = await query(
    `SELECT ${LIST_SELECT} FROM mailing_lists l
     WHERE l.tenant_id IS NOT DISTINCT FROM $1
     ORDER BY l.name ASC`,
    [tenantId]
  );
  return res.rows.map(toListDto);
}

export async function getMailingListForTenant(id, tenantId) {
  if (!isUuid(id)) return null;
  const res = await query(
    `SELECT ${LIST_SELECT} FROM mailing_lists l
     WHERE l.id = $1 AND l.tenant_id IS NOT DISTINCT FROM $2`,
    [id, tenantId]
  );
  return res.rows[0] ? toListDto(res.rows[0]) : null;
}

export async function createMailingList({ tenantId, userId, input }) {
  const res = await query(
    `INSERT INTO mailing_lists (tenant_id, name, description, allow_public_signup, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenantId, input.name, input.description, input.allowPublicSignup, userId]
  );
  return getMailingListForTenant(res.rows[0].id, tenantId);
}

export async function updateMailingList(id, tenantId, input) {
  const res = await query(
    `UPDATE mailing_lists
     SET name = $3, description = $4, allow_public_signup = $5, updated_at = NOW()
     WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2
     RETURNING id`,
    [id, tenantId, input.name, input.description, input.allowPublicSignup]
  );
  if (!res.rows[0]) return null;
  return getMailingListForTenant(id, tenantId);
}

/** Deleting a list is refused (foreign key, surfaces as 23503) while mailings still use it. */
export async function deleteMailingList(id, tenantId) {
  const res = await query(
    'DELETE FROM mailing_lists WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2 RETURNING id',
    [id, tenantId]
  );
  return res.rowCount > 0;
}

// ---------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------

export async function listSubscribers(listId, tenantId) {
  const list = await getMailingListForTenant(listId, tenantId);
  if (!list) return null;
  const res = await query(
    `SELECT s.id, s.email, s.name, s.status, s.consent_source, s.consent_at, s.created_at
     FROM mailing_subscribers s
     WHERE s.list_id = $1
     ORDER BY s.created_at ASC`,
    [listId]
  );
  return res.rows.map(toSubscriberDto);
}

/**
 * Staff add: every address must come with consent attested by the caller (checked in the route).
 * Existing rows (including suppressed 'unsubscribed' ones) are never changed.
 * @returns {Promise<{ added: number, alreadyPresent: number, invalid: string[] } | null>}
 */
export async function addAttestedSubscribers({ listId, tenantId, emails, name, addedBy }) {
  const list = await getMailingListForTenant(listId, tenantId);
  if (!list) return null;

  const invalid = [];
  const unique = new Set();
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    if (!isValidEmail(email)) invalid.push(String(raw));
    else unique.add(email);
  }

  let added = 0;
  for (const email of unique) {
    const res = await query(
      `INSERT INTO mailing_subscribers
         (list_id, email, name, status, consent_source, consent_at, added_by)
       VALUES ($1, $2, $3, 'active', 'admin_attested', NOW(), $4)
       ON CONFLICT (list_id, email) DO NOTHING
       RETURNING id`,
      [listId, email, name || null, addedBy]
    );
    if (res.rowCount > 0) added += 1;
  }

  return { added, alreadyPresent: unique.size - added, invalid };
}

export async function removeSubscriber(subscriberId, tenantId) {
  if (!isUuid(subscriberId)) return false;
  const res = await query(
    `DELETE FROM mailing_subscribers s
     USING mailing_lists l
     WHERE s.id = $1 AND s.list_id = l.id AND l.tenant_id IS NOT DISTINCT FROM $2
     RETURNING s.id`,
    [subscriberId, tenantId]
  );
  return res.rowCount > 0;
}

export async function countActiveSubscribers(listId) {
  const res = await query(
    "SELECT COUNT(*)::int AS n FROM mailing_subscribers WHERE list_id = $1 AND status = 'active'",
    [listId]
  );
  return res.rows[0].n;
}


// ---------------------------------------------------------------------------
// Public signup, confirmation and unsubscribe
// ---------------------------------------------------------------------------

export async function getSenderName(tenantId) {
  if (tenantId) {
    const res = await query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
    if (res.rows[0]?.name) return res.rows[0].name;
  }
  return getSetting('parish_name', 'Seurakunta');
}

/**
 * Sends the double opt-in mail. Callers do not await it, so response timing does not reveal whether
 * an address is already known. Failures are logged without the address.
 */
async function sendConfirmationMail({ subscriberId, email, listId }) {
  const list = await query('SELECT tenant_id FROM mailing_lists WHERE id = $1', [listId]);
  const senderName = await getSenderName(list.rows[0]?.tenant_id ?? null);
  const mail = renderConfirmationMail({ senderName, confirmUrl: buildConfirmUrl(subscriberId) });
  try {
    await deliverViaTunnus({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (err) {
    console.error(`Mailing: confirmation mail failed for subscriber ${subscriberId}: ${err.message}`);
  }
}

/**
 * Public self-signup. Always resolves the same way from the caller's view, so the
 * response never reveals whether the address is already known.
 * Only lists with allow_public_signup accept signups.
 */
export async function requestPublicSubscription({ listId, email }) {
  const normalized = normalizeEmail(email);
  if (!isUuid(listId) || !isValidEmail(normalized)) return;

  const listRes = await query(
    'SELECT id, allow_public_signup FROM mailing_lists WHERE id = $1',
    [listId]
  );
  if (!listRes.rows[0]?.allow_public_signup) return;

  const insert = await query(
    `INSERT INTO mailing_subscribers (list_id, email, status, consent_source)
     VALUES ($1, $2, 'pending', 'self_signup')
     ON CONFLICT (list_id, email) DO NOTHING
     RETURNING id`,
    [listId, normalized]
  );

  if (insert.rowCount > 0) {
    void sendConfirmationMail({ subscriberId: insert.rows[0].id, email: normalized, listId });
    return;
  }

  // Address already known: resend the confirmation only while it is still pending.
  const existing = await query(
    "SELECT id, email FROM mailing_subscribers WHERE list_id = $1 AND email = $2 AND status = 'pending'",
    [listId, normalized]
  );
  if (existing.rows[0]) {
    void sendConfirmationMail({ subscriberId: existing.rows[0].id, email: existing.rows[0].email, listId });
  }
}

/** @returns {Promise<'confirmed' | 'not_pending' | 'invalid'>} */
export async function confirmSubscription(subscriberId, token) {
  if (!verifyMailingToken('confirm', subscriberId, token)) return 'invalid';
  const res = await query(
    `UPDATE mailing_subscribers
     SET status = 'active', consent_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id`,
    [subscriberId]
  );
  return res.rowCount > 0 ? 'confirmed' : 'not_pending';
}

/** Unsubscribing keeps the row with status 'unsubscribed' as suppression. */
export async function unsubscribeSubscriber(subscriberId, token) {
  if (!verifyMailingToken('unsubscribe', subscriberId, token)) return 'invalid';
  const res = await query(
    `UPDATE mailing_subscribers
     SET status = 'unsubscribed', updated_at = NOW()
     WHERE id = $1 AND status <> 'unsubscribed'
     RETURNING id`,
    [subscriberId]
  );
  if (res.rowCount > 0) return 'unsubscribed';
  const exists = await query('SELECT 1 FROM mailing_subscribers WHERE id = $1', [subscriberId]);
  return exists.rowCount > 0 ? 'unsubscribed' : 'invalid';
}

/** Opt-out for a role-targeted recipient. Stores the address in mailing_optouts for the user's tenant. */
export async function optOutRoleRecipient(userId, token) {
  if (!verifyMailingToken('optout', userId, token)) return 'invalid';
  const res = await query('SELECT tenant_id, email FROM users WHERE id = $1', [userId]);
  const user = res.rows[0];
  if (!user || !user.tenant_id || !user.email) return 'invalid';
  await query(
    `INSERT INTO mailing_optouts (tenant_id, email) VALUES ($1, lower($2))
     ON CONFLICT (tenant_id, email) DO NOTHING`,
    [user.tenant_id, user.email]
  );
  return 'opted_out';
}

// ---------------------------------------------------------------------------
// Mailings (tenant-scoped)
// ---------------------------------------------------------------------------

export async function listMailings(tenantId) {
  const res = await query(
    `SELECT ${MAILING_SELECT} FROM prayer_mailings
     WHERE tenant_id IS NOT DISTINCT FROM $1
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return res.rows.map(toMailingDto);
}

export async function getMailingForTenant(id, tenantId) {
  if (!isUuid(id)) return null;
  const res = await query(
    `SELECT ${MAILING_SELECT} FROM prayer_mailings WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2`,
    [id, tenantId]
  );
  return res.rows[0] ? toMailingDto(res.rows[0]) : null;
}

/** Raw row (snake_case) for scheduling and content rendering. */
async function getMailingRow(id) {
  const res = await query(`SELECT ${MAILING_SELECT} FROM prayer_mailings WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

const MAILING_WRITE_COLUMNS = [
  'list_id', 'target_type', 'target_role', 'name', 'kind', 'week', 'year', 'send_dates',
  'send_weekday', 'start_date', 'end_date', 'send_hour', 'subject', 'include_public', 'enabled',
];

function mailingWriteValues(v) {
  return [
    v.listId, v.targetType, v.targetRole, v.name, v.kind, v.week, v.year, v.sendDates,
    v.sendWeekday, v.startDate, v.endDate, v.sendHour, v.subject, v.includePublic, v.enabled,
  ];
}

export async function createMailing({ tenantId, userId, value }) {
  const columns = [...MAILING_WRITE_COLUMNS, 'tenant_id', 'created_by'];
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const res = await query(
    `INSERT INTO prayer_mailings (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    [...mailingWriteValues(value), tenantId, userId]
  );
  return getMailingForTenant(res.rows[0].id, tenantId);
}

export async function updateMailing({ id, tenantId, value }) {
  const assignments = MAILING_WRITE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(', ');
  const n = MAILING_WRITE_COLUMNS.length;
  const res = await query(
    `UPDATE prayer_mailings SET ${assignments}, updated_at = NOW()
     WHERE id = $${n + 1} AND tenant_id IS NOT DISTINCT FROM $${n + 2}
     RETURNING id`,
    [...mailingWriteValues(value), id, tenantId]
  );
  if (!res.rows[0]) return null;
  return getMailingForTenant(id, tenantId);
}

export async function deleteMailing(id, tenantId) {
  const res = await query(
    'DELETE FROM prayer_mailings WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2 RETURNING id',
    [id, tenantId]
  );
  return res.rowCount > 0;
}

export async function listMailingSends(mailingId, tenantId) {
  const mailing = await getMailingForTenant(mailingId, tenantId);
  if (!mailing) return null;
  const res = await query(
    `SELECT id, send_date::text AS send_date, status, recipients, failed, started_at, finished_at
     FROM mailing_sends WHERE mailing_id = $1 ORDER BY send_date DESC`,
    [mailingId]
  );
  return res.rows.map(row => ({
    id: row.id,
    sendDate: row.send_date,
    status: row.status,
    recipients: row.recipients,
    failed: row.failed,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}

/** Enabled mailings for the scheduler (all tenants). */
export async function loadEnabledMailings() {
  const res = await query(`SELECT ${MAILING_SELECT} FROM prayer_mailings WHERE enabled = TRUE`);
  return res.rows;
}

/** `${mailing_id}|${send_date}` keys already claimed for one Helsinki date. */
export async function loadSentKeys(sendDate) {
  const res = await query(
    'SELECT mailing_id, send_date::text AS send_date FROM mailing_sends WHERE send_date = $1',
    [sendDate]
  );
  return new Set(res.rows.map(r => `${r.mailing_id}|${r.send_date}`));
}

/**
 * Recipients of a mailing (raw row). Each carries its own unsubscribe link; the address is only used for delivery.
 * - list target: active subscribers of the list
 * - role target: users of the mailing's tenant with that role and an email, minus mailing_optouts
 * @returns {Promise<Array<{ id: string, email: string, unsubscribeUrl: string }>>}
 */
export async function getRecipients(mailing) {
  if (mailing.target_type === 'role') {
    const res = await query(
      `SELECT u.id, u.email FROM users u
       WHERE u.tenant_id = $1 AND u.role = $2 AND u.email IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM mailing_optouts o
           WHERE o.tenant_id = u.tenant_id AND o.email = lower(u.email)
         )
       ORDER BY u.email`,
      [mailing.tenant_id, mailing.target_role]
    );
    return res.rows.map(r => ({ id: r.id, email: r.email, unsubscribeUrl: buildOptoutUrl(r.id) }));
  }

  const res = await query(
    "SELECT id, email FROM mailing_subscribers WHERE list_id = $1 AND status = 'active' ORDER BY created_at",
    [mailing.list_id]
  );
  return res.rows.map(r => ({ id: r.id, email: r.email, unsubscribeUrl: buildUnsubscribeUrl(r.id) }));
}

/** Week and year a mailing covers on a given send date. */
export async function resolveMailingWeek(mailing, sendDate) {
  if (mailing.kind === 'week') return { week: mailing.week, year: mailing.year };
  const info = await getCurrentWeekInfoForTenant(mailing.tenant_id, new Date(`${sendDate}T12:00:00Z`));
  return { week: info.week, year: info.year };
}

/**
 * Prayers for a mailing. Always tenant-scoped: a mailing without a tenant is never rendered.
 * @returns {Promise<{ week: number, year: number, prayers: object, tenant: { name: string } }>}
 */
export async function loadMailingContent(mailing, sendDate) {
  if (!mailing.tenant_id) throw new Error('Mailing has no tenant');
  const { week, year } = await resolveMailingWeek(mailing, sendDate);
  const prayers = await getPrayersForWeek(week, year, {
    includeUnapproved: false,
    tenantId: mailing.tenant_id,
  });
  const tenant = { name: await getSenderName(mailing.tenant_id) };
  return { week, year, prayers, tenant };
}

/** Preview for the caller's tenant; no unsubscribe link (nothing is sent). */
export async function buildMailingPreview(mailingId, tenantId) {
  const mailing = await getMailingRow(mailingId);
  if (!mailing || (mailing.tenant_id ?? null) !== (tenantId ?? null)) return null;
  const content = await loadMailingContent(mailing, helsinkiParts(new Date()).date);
  const rendered = renderMailing({ ...content, subject: mailing.subject, includePublic: mailing.include_public });
  const recipientCount = (await getRecipients(mailing)).length;
  return { ...rendered, recipientCount };
}

/** Sends a test mail to one address (the caller's own). No unsubscribe link: the test is not a subscription. */
export async function sendTestMailing(mailingId, tenantId, toEmail) {
  const mailing = await getMailingRow(mailingId);
  if (!mailing || (mailing.tenant_id ?? null) !== (tenantId ?? null)) return null;
  const content = await loadMailingContent(mailing, helsinkiParts(new Date()).date);
  const rendered = renderMailing({ ...content, subject: mailing.subject, includePublic: mailing.include_public });
  await deliverViaTunnus({
    to: toEmail,
    subject: `[TESTI] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
  });
  return true;
}
