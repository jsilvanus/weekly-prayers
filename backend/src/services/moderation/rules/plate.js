/**
 * Finnish vehicle registration plates: three letters, a dash or a single space, then 1-3 digits
 * (e.g. "ABC-123", "ABC-1"). Conservative: upper-case only, and the letter set excludes I, Q, Z
 * (O is in use, e.g. "OLU-877"; the letter class is the only place this is decided). The space-separated form is reported with lower confidence because
 * upper-case word + number sequences occur in ordinary text.
 */

const PLATE_RE = /(?<![\p{L}\d])([A-HJ-PRSTUVWXY]{3})([- ])(\d{1,3})(?![\p{L}\d])/gu;

// Three-letter Finnish Bible book abbreviations ("PSA 23" written in capitals), excluded from the space form.
const BIBLE_ABBREVIATIONS = new Set(['PSA', 'JOH', 'MAT', 'LUK', 'ROO', 'KOR', 'GAL', 'KOL', 'TIM', 'TIT', 'HEB', 'JAK', 'PIE', 'JUU', 'ILM', 'EFE', 'FIL', 'TES']);

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'plate', start: number, end: number, confidence: number}>}
 */
export function findPlate(text) {
  const out = [];
  for (const m of text.matchAll(PLATE_RE)) {
    if (m[2] !== '-' && BIBLE_ABBREVIATIONS.has(m[1])) continue;
    const confidence = m[2] === '-' ? 0.8 : 0.5;
    out.push({ type: 'plate', start: m.index, end: m.index + m[0].length, confidence });
  }
  return out;
}
