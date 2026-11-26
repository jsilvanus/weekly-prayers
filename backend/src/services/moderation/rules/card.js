/**
 * Payment card numbers: 13-19 digits, Luhn-valid, optionally grouped with spaces or dashes.
 * Conservative: only plain 15-19 digit runs or the usual 4-4-4-4 / 4-6-5 groupings are
 * reported, so reference numbers and phone numbers that happen to pass Luhn are skipped.
 */

const CARD_RE = /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g;

/**
 * @param {string} digits
 * @returns {boolean}
 */
export function luhnValid(digits) {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'card', start: number, end: number, confidence: number}>}
 */
export function findCard(text) {
  const out = [];
  for (const m of text.matchAll(CARD_RE)) {
    const raw = m[0];
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) continue;
    if (!luhnValid(digits)) continue;
    const plain = /^\d{15,19}$/.test(raw);
    const grouped4 = /^\d{4}([ -]\d{4}){3}$/.test(raw);
    const grouped466 = /^\d{4}[ -]\d{6}[ -]\d{5}$/.test(raw);
    if (!(plain || grouped4 || grouped466)) continue;
    out.push({ type: 'card', start: m.index, end: m.index + raw.length, confidence: 1 });
  }
  return out;
}
