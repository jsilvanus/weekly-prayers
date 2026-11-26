/**
 * Audit trail of moderation decisions (automatic and human) per prayer request.
 * Reasons hold finding types and counts only, never matched text.
 */

import { query } from '../../db/index.js';

function normalizeReasons(reasons) {
  const out = {};
  if (!reasons || typeof reasons !== 'object') return out;
  for (const [type, count] of Object.entries(reasons)) {
    if (typeof type === 'string' && Number.isFinite(Number(count))) {
      out[type.slice(0, 40)] = Number(count);
    }
  }
  return out;
}

/**
 * @param {number} prayerId
 * @param {string} actor 'system' or the acting user's id
 * @param {string} decision e.g. 'auto_clean', 'auto_review', 'human_redacted'
 * @param {Record<string, number>} [reasons]
 */
export async function recordDecision(prayerId, actor, decision, reasons = {}) {
  const result = await query(
    `INSERT INTO moderation_decisions (prayer_id, actor, decision, reasons)
     VALUES ($1, $2, $3, $4)
     RETURNING id, prayer_id, actor, decision, reasons, created_at`,
    [prayerId, String(actor).slice(0, 100), String(decision).slice(0, 30), JSON.stringify(normalizeReasons(reasons))]
  );
  return result.rows[0];
}

/**
 * @param {number} prayerId
 * @returns {Promise<Array<object>>} oldest first
 */
export async function listDecisions(prayerId) {
  const result = await query(
    `SELECT id, prayer_id, actor, decision, reasons, created_at
     FROM moderation_decisions
     WHERE prayer_id = $1
     ORDER BY created_at ASC, id ASC`,
    [prayerId]
  );
  return result.rows;
}
