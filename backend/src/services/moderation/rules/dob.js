/**
 * Dates of birth. A full date is flagged only when a birth cue word is nearby:
 *   before the date (within 30 chars): syntynyt, syntyi, syntymä*, synt., född*, födda, born, birth, or an
 *     abbreviation "s." / "b." / "synt." immediately before the date;
 *   after the date (within 15 chars): a word cue (syntynyt, född, born, ...).
 * Ordinary dates ("12.3.1975" in a sentence without a cue) are not flagged.
 *
 * Supported forms: 12.3.1975, 12.03.75, 12. 3. 1975, 1975-03-12, "12. maaliskuuta 1975",
 * "12 March 1975", "12. mars 1975".
 */

const MONTH_SRC =
  '(?:tammikuu|helmikuu|maaliskuu|huhtikuu|toukokuu|kesäkuu|heinäkuu|elokuu|syyskuu|lokakuu|marraskuu|joulukuu)\\p{L}*' +
  '|januari|februari|mars|april|augusti|august|september|oktober|november|december' +
  '|january|february|march|june|july|october|may|juni|juli|maj';

const MONTH_RE_SRC = `(?:${MONTH_SRC})`;

const WRITTEN_RE = new RegExp(`(?<![\\p{L}\\d])(\\d{1,2})\\.?\\s+(${MONTH_RE_SRC})\\s+(\\d{4})(?!\\d)`, 'giu');
const NUMERIC_RE = /(?<![\d.\/])(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})(?![\d])/gu;
const ISO_RE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;

const FI_MONTH_STEMS = [
  ['tammi', 1], ['helmi', 2], ['maalis', 3], ['huhti', 4], ['touko', 5], ['kesä', 6],
  ['heinä', 7], ['elo', 8], ['syys', 9], ['loka', 10], ['marras', 11], ['joulu', 12],
];
const OTHER_MONTHS = new Map([
  ['januari', 1], ['january', 1], ['februari', 2], ['february', 2], ['mars', 3], ['march', 3],
  ['april', 4], ['maj', 5], ['may', 5], ['juni', 6], ['june', 6], ['juli', 7], ['july', 7],
  ['augusti', 8], ['august', 8], ['september', 9], ['oktober', 10], ['october', 10],
  ['november', 11], ['december', 12],
]);

/** @param {string} name */
function monthNumber(name) {
  const n = name.toLocaleLowerCase('fi');
  if (n.endsWith('kuu') || n.includes('kuu')) {
    for (const [stem, num] of FI_MONTH_STEMS) {
      if (n.startsWith(stem)) return num;
    }
  }
  const direct = OTHER_MONTHS.get(n);
  return direct ?? null;
}

function daysInMonth(month, year) {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function plausibleYear(y) {
  return y >= 1880 && y <= 2026;
}

function expandYear(yy) {
  return yy > 26 ? 1900 + yy : 2000 + yy;
}

/**
 * @param {number} y
 * @param {number} m
 * @param {number} d
 */
function validDate(y, m, d) {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(m, y);
}

const WORD_CUE_RE = /(?<!\p{L})(?:syntynyt|syntyi|syntymä\p{L}*|född\p{L}*|födda|born|birth(?:day|date)?|synt)(?!\p{L})/iu;
const ABBREV_CUE_BEFORE_RE = /(?<!\p{L})(?:s|b|synt)\.\s*$/iu;
const WORD_CUE_AFTER_RE = /^.{0,15}?(?<!\p{L})(?:syntynyt|syntyi|född\p{L}*|born)(?!\p{L})/iu;

function hasCue(text, start, end) {
  const before = text.slice(Math.max(0, start - 30), start);
  if (WORD_CUE_RE.test(before) || ABBREV_CUE_BEFORE_RE.test(before)) return true;
  const after = text.slice(end, end + 15);
  return WORD_CUE_AFTER_RE.test(after);
}

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'dob', start: number, end: number, confidence: number}>}
 */
export function findDob(text) {
  const out = [];
  const push = (start, end, confidence) => out.push({ type: 'dob', start, end, confidence });

  for (const m of text.matchAll(NUMERIC_RE)) {
    const [whole, d, mo, yRaw] = m;
    const year = yRaw.length === 4 ? Number(yRaw) : expandYear(Number(yRaw));
    if (!validDate(year, Number(mo), Number(d))) continue;
    if (!plausibleYear(year)) continue;
    if (!hasCue(text, m.index, m.index + whole.length)) continue;
    push(m.index, m.index + whole.length, yRaw.length === 4 ? 0.85 : 0.7);
  }

  for (const m of text.matchAll(ISO_RE)) {
    const [whole, y, mo, d] = m;
    if (!validDate(Number(y), Number(mo), Number(d))) continue;
    if (!plausibleYear(Number(y))) continue;
    if (!hasCue(text, m.index, m.index + whole.length)) continue;
    push(m.index, m.index + whole.length, 0.85);
  }

  for (const m of text.matchAll(WRITTEN_RE)) {
    const [whole, d, monthName, y] = m;
    const month = monthNumber(monthName);
    if (month === null) continue;
    if (!validDate(Number(y), month, Number(d))) continue;
    if (!plausibleYear(Number(y))) continue;
    if (!hasCue(text, m.index, m.index + whole.length)) continue;
    push(m.index, m.index + whole.length, 0.85);
  }

  return out;
}
