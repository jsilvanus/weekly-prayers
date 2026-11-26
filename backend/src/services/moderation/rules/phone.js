/**
 * Phone numbers: Finnish (+358, 00358, national 0-prefixed) and generic international (+ and 8-15 digits).
 * Separators allowed: spaces, dashes, dots, parentheses.
 *
 * Deliberately not matched: plain years, short numbers, Bible references ("Joh. 3:16"),
 * clock times ("klo 12.30"), amounts ("1 200 euroa") and dates (DD.MM.YYYY, ISO).
 */

const CANDIDATE_RE = /(?<![\p{L}\d_])[+(]?\d(?:[\d ().\-]*\d)?(?![\p{L}\d_])/gu;

const DATE_LIKE = /^\d{1,2}[.\/ -]\d{1,2}[.\/ -]\d{2,4}$/;
const ISO_LIKE = /^\d{4}-\d{2}-\d{2}$/;

/** Finnish national significant part after the country code (leading trunk 0 removed). */
function finnishNational(digitsAfterCountry) {
  return digitsAfterCountry.startsWith('0') ? digitsAfterCountry.slice(1) : digitsAfterCountry;
}

/**
 * @param {string} raw candidate text as matched
 * @returns {number|null} confidence, or null when not a phone number
 */
export function classifyPhone(raw) {
  const compact = raw.trim();
  if (DATE_LIKE.test(compact) || ISO_LIKE.test(compact)) return null;

  const digits = compact.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return null;
  const hasSeparator = /[ ().\-]/.test(compact);

  if (compact.startsWith('+')) {
    if (digits.startsWith('358')) {
      const nat = finnishNational(digits.slice(3));
      if (nat.length >= 6 && nat.length <= 11) return 0.95;
    }
    return digits.length >= 8 && digits.length <= 15 ? 0.8 : null;
  }

  if (digits.startsWith('00358')) {
    const nat = finnishNational(digits.slice(5));
    if (nat.length >= 6 && nat.length <= 11) return 0.9;
    return null;
  }

  // National format: leading 0 followed by a non-zero area/mobile digit.
  if (/^0[1-9]/.test(digits)) {
    if (digits.length < 8 || digits.length > 12) return null;
    // Unseparated 8-digit runs can be compact dates (DDMMYYYY); require 9+ digits then.
    if (!hasSeparator && digits.length < 9) return null;
    return 0.85;
  }

  return null;
}

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'phone', start: number, end: number, confidence: number}>}
 */
export function findPhone(text) {
  const out = [];
  for (const m of text.matchAll(CANDIDATE_RE)) {
    const confidence = classifyPhone(m[0]);
    if (confidence === null) continue;
    out.push({ type: 'phone', start: m.index, end: m.index + m[0].length, confidence });
  }
  return out;
}
