/**
 * Personal-data analysis: runs every rule over the normalised text, maps the spans back
 * to the original text, and resolves overlaps by keeping the highest-confidence finding.
 *
 * Findings carry only type, offsets and confidence. The matched text is never returned.
 */

import { normalize, toOriginalSpan } from './normalize.js';
import { findHetu } from './rules/hetu.js';
import { findIban } from './rules/iban.js';
import { findCard } from './rules/card.js';
import { findPhone } from './rules/phone.js';
import { findEmail } from './rules/email.js';
import { findAddress } from './rules/address.js';
import { findUrl } from './rules/url.js';
import { findPlate } from './rules/plate.js';
import { findDob } from './rules/dob.js';

export const FINDING_TYPES = Object.freeze([
  'hetu', 'iban', 'card', 'phone', 'email', 'address', 'url', 'plate', 'dob',
]);

const RULES = [findHetu, findIban, findCard, findPhone, findEmail, findAddress, findUrl, findPlate, findDob];

/**
 * @typedef {{ type: string, start: number, end: number, confidence: number }} Finding
 */

/**
 * @param {string} text
 * @returns {{ findings: Finding[] }}
 */
export function analyze(text) {
  const src = typeof text === 'string' ? text : '';
  if (src.length === 0) return { findings: [] };

  const { text: norm, map } = normalize(src);

  const mapped = [];
  for (const rule of RULES) {
    for (const c of rule(norm)) {
      const span = toOriginalSpan(map, c.start, c.end);
      if (span.end <= span.start) continue;
      mapped.push({ type: c.type, start: span.start, end: span.end, confidence: c.confidence });
    }
  }

  // Highest confidence first; ties go to the longer span, then the earlier one.
  mapped.sort((a, b) =>
    (b.confidence - a.confidence) ||
    ((b.end - b.start) - (a.end - a.start)) ||
    (a.start - b.start));

  const kept = [];
  for (const f of mapped) {
    const overlaps = kept.some((k) => f.start < k.end && k.start < f.end);
    if (!overlaps) kept.push(f);
  }
  kept.sort((a, b) => a.start - b.start);

  return {
    findings: kept.map((f) => ({
      type: f.type,
      start: f.start,
      end: f.end,
      confidence: f.confidence,
    })),
  };
}
