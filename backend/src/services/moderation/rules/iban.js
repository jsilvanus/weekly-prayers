/**
 * IBAN detection with ISO 13616 mod-97 validation (any country).
 *
 * Spaced candidates are split into 4-character-style groups; the longest prefix of
 * groups that validates wins, so trailing words ("... 85 and") are not swallowed.
 * A Finnish-shaped value (FI + 16 digits) that fails mod-97 is still reported with
 * low confidence (0.4) because it is most likely a mistyped real account number.
 */

const SPACED_RE = /(?<![\p{L}\d])[A-Za-z]{2}\d{2}(?: [A-Za-z0-9]{1,4}){2,8}(?![\p{L}\d])/gu;
const COMPACT_RE = /(?<![\p{L}\d])[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}(?![\p{L}\d])/gu;

/**
 * mod-97 check on a compact (space-free, upper-case) IBAN string.
 * @param {string} s
 */
export function ibanChecksumOk(s) {
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const value = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of value) {
      rem = (rem * 10 + Number(d)) % 97;
    }
  }
  return rem === 1;
}

/** @param {string} compact */
export function isValidIban(compact) {
  const s = String(compact ?? '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  if (s.length < 15 || s.length > 34) return false;
  if (s.startsWith('FI') && !/^FI\d{16}$/.test(s)) return false;
  return ibanChecksumOk(s);
}

function finnishShape(compact) {
  return /^FI\d{16}$/.test(compact);
}

function scanGroup(raw, offset, out) {
  const tokens = raw.split(' ');
  let lowFallback = null;
  for (let k = tokens.length; k >= 2; k--) {
    const head = tokens.slice(0, k);
    const compact = head.join('').toUpperCase();
    const spanEnd = offset + head.join(' ').length;
    if (isValidIban(compact)) {
      out.push({ type: 'iban', start: offset, end: spanEnd, confidence: 1 });
      return;
    }
    if (!lowFallback && finnishShape(compact)) {
      lowFallback = { type: 'iban', start: offset, end: spanEnd, confidence: 0.4 };
    }
  }
  if (lowFallback) out.push(lowFallback);
}

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'iban', start: number, end: number, confidence: number}>}
 */
export function findIban(text) {
  const out = [];
  for (const m of text.matchAll(SPACED_RE)) {
    scanGroup(m[0], m.index, out);
  }
  for (const m of text.matchAll(COMPACT_RE)) {
    const compact = m[0].toUpperCase();
    if (isValidIban(compact)) {
      out.push({ type: 'iban', start: m.index, end: m.index + m[0].length, confidence: 1 });
    } else if (finnishShape(compact)) {
      out.push({ type: 'iban', start: m.index, end: m.index + m[0].length, confidence: 0.4 });
    }
  }
  return out;
}
