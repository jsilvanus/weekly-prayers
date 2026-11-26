/**
 * Finnish henkilötunnus (personal identity code): DDMMYY + century sign + NNN + check char.
 *
 * Checksum: check = "0123456789ABCDEFHJKLMNPRSTUVWXY"[Number(DDMMYYNNN) % 31].
 * The century sign is only checked for membership in the allowed set; it does not
 * enter the checksum, and the leap-day check ignores it (see isRealDate below).
 *
 * Syntactically valid, valid date, checksum mismatch -> confidence 0.5 (flagged as
 * lower-confidence). Invalid date or unknown check character -> not flagged.
 */

export const CHECK_CHARS = '0123456789ABCDEFHJKLMNPRSTUVWXY';
export const CENTURY_SIGNS = '+-ABCDEFYXWVU';

const HETU_RE = /(?<!\d)(\d{2})(\d{2})(\d{2})([+\-A-FYXWVUa-fyxwvu])(\d{3})([0-9A-Za-z])(?![\dA-Za-z])/g;

function daysInMonth(month, year) {
  if (month === 2) {
    // Century sign is deliberately ignored: yy % 4 decides leap years (accepts 2000-style leap days).
    return year % 4 === 0 ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * @param {number} dd
 * @param {number} mm
 * @param {number} yy two-digit year
 * @returns {boolean}
 */
export function isRealDate(dd, mm, yy) {
  if (mm < 1 || mm > 12 || dd < 1) return false;
  return dd <= daysInMonth(mm, yy);
}

/**
 * @param {string} ddmmyy six digits
 * @param {string} nnn three digits
 * @returns {string} expected check character
 */
export function hetuCheckChar(ddmmyy, nnn) {
  const n = Number(ddmmyy + nnn);
  return CHECK_CHARS[n % 31];
}

/**
 * Validate a full henkilötunnus string. Returns flags for date and checksum.
 * @param {string} value
 * @returns {{ syntax: boolean, dateValid: boolean, checksumValid: boolean }}
 */
export function validateHetu(value) {
  const m = /^(\d{2})(\d{2})(\d{2})([+\-A-FYXWVUa-fyxwvu])(\d{3})([0-9A-Za-z])$/.exec(String(value ?? ''));
  if (!m) return { syntax: false, dateValid: false, checksumValid: false };
  const [, dd, mm, yy, sign, nnn, check] = m;
  const syntax = CENTURY_SIGNS.includes(sign.toUpperCase()) && CHECK_CHARS.includes(check.toUpperCase());
  const dateValid = isRealDate(Number(dd), Number(mm), Number(yy));
  const checksumValid = hetuCheckChar(dd + mm + yy, nnn) === check.toUpperCase();
  return { syntax, dateValid, checksumValid };
}

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'hetu', start: number, end: number, confidence: number}>}
 */
export function findHetu(text) {
  const out = [];
  for (const m of text.matchAll(HETU_RE)) {
    const [whole, dd, mm, yy, sign, nnn, check] = m;
    if (!CENTURY_SIGNS.includes(sign.toUpperCase())) continue;
    if (!CHECK_CHARS.includes(check.toUpperCase())) continue;
    if (!isRealDate(Number(dd), Number(mm), Number(yy))) continue;
    const checksumValid = hetuCheckChar(dd + mm + yy, nnn) === check.toUpperCase();
    out.push({
      type: 'hetu',
      start: m.index,
      end: m.index + whole.length,
      confidence: checksumValid ? 1 : 0.5,
    });
  }
  return out;
}
