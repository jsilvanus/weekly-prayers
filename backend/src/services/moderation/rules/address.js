/**
 * Street addresses (Finnish, Swedish, English) and postcode + city.
 *
 * Street: a street word (Finnish/Swedish suffix or English "street"/"road") followed by a
 * house number and an optional stairwell letter and apartment number, e.g. "Hämeenkatu 5 A 3".
 * English house-number-first form: "166 Mill Road" (capitalised name words, then a street word).
 * English name-first form: "Mill Road 166".
 *
 * Postcode: five digits followed by a capitalised city word; city words on the name
 * allowlist (e.g. "Herra") are skipped. A postcode and city that directly follow a street
 * ("Koivutie 42 A, 33100 Tampere") are part of that street's single finding.
 */

import { isAllowedName } from '../allowlist.js';

const FI_SV_ENDINGS = [
  // Finnish: katu, tie, kuja, polku, tori with common inflections
  'katu', 'kadun', 'kadulla', 'kadulle', 'kadulta', 'katua',
  'tie', 'tien', 'tiellä', 'tielle', 'tieltä', 'tietä',
  'kuja', 'kujan', 'kujalla', 'kujalle', 'kujalta', 'kujaa',
  'polku', 'polun', 'polulla', 'polulle', 'polulta', 'polkua',
  'tori', 'torin', 'torilla', 'torille', 'torilta', 'toria',
  // Swedish: gatan, vägen, gränd
  'gatan', 'gata', 'vägen', 'gränd', 'gränden',
];

const STREET_RE = new RegExp(
  '(?<![\\p{L}\\d])(?:' +
    `\\p{L}[\\p{L}\\-]{1,40}?(?:${FI_SV_ENDINGS.join('|')})` +
    ')' +
    '\\s+\\d{1,3}' +
    '(?:' +
      '(?:\\s?[A-Za-zÅÄÖåäö](?!\\p{L}))(?:\\s*\\d{1,3}(?!\\d))?' + // stairwell letter, optional apartment
      '|\\s+\\d{1,3}(?!\\d)' + // apartment number without stairwell
    ')?' +
    '(?![\\p{L}\\d])',
  'giu',
);

// English street words. Matched case-sensitively: the name words must be capitalised, so that
// ordinary lower-case prose ("the road 5 times") is not an address. STREET_RE is case-insensitive
// and carries only the Finnish/Swedish forms.
const ENGLISH_SUFFIX = 'Road|Street|Avenue|Lane|Drive|Close|Way|Court|Place';

// "166 Mill Road", "188 Old Mill Avenue"
const ENGLISH_NUMBER_FIRST_RE = new RegExp(
  `(?<![\\p{L}\\d])\\d{1,3}\\s+\\p{Lu}\\p{L}{1,30}(?:\\s+\\p{Lu}\\p{L}{1,30})?\\s+(?:${ENGLISH_SUFFIX})(?![\\p{L}\\d])`,
  'gu',
);

// "Mill Avenue 33", "Hill Road 7"
const ENGLISH_NAME_FIRST_RE = new RegExp(
  `(?<![\\p{L}\\d])\\p{Lu}\\p{L}{1,30}\\s+(?:${ENGLISH_SUFFIX})\\s+\\d{1,3}(?!\\d)(?![\\p{L}\\d])`,
  'gu',
);

const POSTCODE_RE = /(?<!\d)\d{5}\s+(\p{Lu}[\p{L}\-]+)(?:\s+\p{Lu}[\p{L}\-]+)?(?![\p{L}\d])/gu;

// Sticky: the postcode and city that follow a street, starting at its separating comma.
const STREET_TAIL_RE = /,\s*\d{5}\s+(\p{Lu}[\p{L}\-]+)(?:\s+\p{Lu}[\p{L}\-]+)?(?![\p{L}\d])/uy;

const STREET_CONFIDENCE = 0.85;
const POSTCODE_CONFIDENCE = 0.6;

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'address', start: number, end: number, confidence: number}>}
 */
export function findAddress(text) {
  const candidates = [];
  const push = (start, end, confidence) => candidates.push({ type: 'address', start, end, confidence });

  const streets = [];
  for (const re of [STREET_RE, ENGLISH_NUMBER_FIRST_RE, ENGLISH_NAME_FIRST_RE]) {
    for (const m of text.matchAll(re)) {
      const start = m.index;
      const end = start + m[0].length;
      streets.push({ start, end });
      push(start, end, STREET_CONFIDENCE);
    }
  }

  // A street followed by ", <postcode> <city>" is one address: extend the street's span.
  for (const s of streets) {
    STREET_TAIL_RE.lastIndex = s.end;
    const tail = STREET_TAIL_RE.exec(text);
    if (tail && !isAllowedName(tail[1])) {
      candidates.find((c) => c.start === s.start && c.end === s.end).end = s.end + tail[0].length;
    }
  }

  for (const m of text.matchAll(POSTCODE_RE)) {
    if (isAllowedName(m[1])) continue;
    push(m.index, m.index + m[0].length, POSTCODE_CONFIDENCE);
  }

  // Highest confidence first, then the longer span, then the earlier one; overlaps are dropped
  // so a street finding and its own postcode fragment never both survive.
  candidates.sort((a, b) =>
    (b.confidence - a.confidence) || ((b.end - b.start) - (a.end - a.start)) || (a.start - b.start));
  const kept = [];
  for (const c of candidates) {
    if (!kept.some((k) => c.start < k.end && k.start < c.end)) kept.push(c);
  }
  return kept.sort((a, b) => a.start - b.start);
}
