/**
 * Two-gate moderation policy for public prayer requests.
 *
 *  Gate 1 (deterministic): any finding with confidence >= REJECT_CONFIDENCE -> 'reject'.
 *          The prayer is not stored in any form.
 *  Gate 2: any other finding (confidence below the threshold, or a 'person_name' /
 *          future review signal) -> 'review'. The prayer is kept with an automatic redacted
 *          suggestion; a moderator confirms or edits it. Only the redacted text is public.
 *  Otherwise 'ok'.
 *
 * Client-facing findings carry type and offsets only. Confidence is kept in
 * internalFindings for server-side use and must never be sent to clients.
 * Nothing here logs or retains the input text.
 */

import { analyze } from './analyze.js';
import { redactSuggestion } from './redact.js';

export const REJECT_CONFIDENCE = 0.9;

const REVIEW_ONLY_TYPES = new Set(['person_name']);

/**
 * @param {string} text
 * @param {'fi'|'sv'|'en'} [lang='fi']
 * @returns {{
 *   decision: 'reject'|'review'|'ok',
 *   findings: Array<{type: string, start: number, end: number}>,
 *   internalFindings: Array<{type: string, start: number, end: number, confidence: number}>,
 *   redactedSuggestion: string|null,
 *   reasons: Record<string, number>
 * }}
 */
export function decide(text, lang = 'fi') {
  const src = typeof text === 'string' ? text : '';
  const { findings: internalFindings } = analyze(src);

  const reasons = {};
  for (const f of internalFindings) {
    reasons[f.type] = (reasons[f.type] || 0) + 1;
  }

  const findings = internalFindings.map(({ type, start, end }) => ({ type, start, end }));

  const hardHit = internalFindings.some(
    (f) => !REVIEW_ONLY_TYPES.has(f.type) && f.confidence >= REJECT_CONFIDENCE,
  );

  if (hardHit) {
    return { decision: 'reject', findings, internalFindings, redactedSuggestion: null, reasons };
  }

  if (internalFindings.length > 0) {
    return {
      decision: 'review',
      findings,
      internalFindings,
      redactedSuggestion: redactSuggestion(src, internalFindings, lang),
      reasons,
    };
  }

  return { decision: 'ok', findings, internalFindings, redactedSuggestion: null, reasons };
}
