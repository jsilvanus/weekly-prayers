/**
 * Person-name detection for the rule-based moderator.
 *
 * findNames(text) returns findings of type 'person_name' with confidence 0.6 to 0.8.
 * Names are a Gate 2 (review) signal only: confidence stays below REJECT_CONFIDENCE (0.9),
 * so policy.js never hard-rejects on them. Offsets refer to the ORIGINAL text.
 *
 * Rules (summary):
 *  - Candidates are capitalised tokens (Unicode letters, hyphenated parts allowed).
 *  - Allowlisted words (biblical names, titles) are never flagged (allowlist.js).
 *  - A token is looked up in names.json after stripping Finnish case endings, Swedish
 *    genitive -s, and simple consonant gradation (Pekka -> Pekan, Matti -> Matin) and
 *    surname gradation (Virtanen -> Virtasen).
 *  - Ordinary words that are also names (ambiguous list: toivo, rauha, hope ...) are
 *    flagged only as part of an adjacent name pair, never alone.
 *  - First name + surname (adjacent, one space) -> one finding, 0.8.
 *  - Single name -> 0.6. A cue word before it ("nimeltä", "kutsutaan", "lapseni", "my friend")
 *    raises it one notch to 0.7. Pairs stay at 0.8 (the cap).
 *  - Sentence-initial capitalised words are not flagged unless they are an unambiguous name
 *    or part of a name pair.
 *
 * Nothing here logs or retains the input.
 */

import { readFileSync } from 'node:fs';
import { normalize, toOriginalSpan } from './normalize.js';
import { isAllowedName } from './allowlist.js';

const DATA = new URL('./data/names.json', import.meta.url);

let lists;
function loadLists() {
  if (lists) return lists;
  const raw = JSON.parse(readFileSync(DATA, 'utf8'));
  lists = {
    first: new Set(raw.first),
    last: new Set(raw.last),
    ambiguous: new Set(raw.ambiguous),
  };
  return lists;
}

// Finnish case endings and the Swedish genitive. Longest first.
const SUFFIXES = [
  'ssä', 'ssa', 'stä', 'sta', 'ltä', 'lta', 'llä', 'lla', 'lle', 'ksi', 'ille', 'ihin', 'iin', 'ien',
  'seen', 'een', 'aan', 'ään', 'ta', 'tä', 'na', 'nä', 'in', 'en', 'an', 'än', 'ia', 'iä',
  'n', 't', 'a', 'ä', 's',
];

const VOWELS = new Set([...'aeiouyäöå']);

/** Lowercase base-form candidates for one token. The token itself comes first. */
function candidates(word) {
  const stems = new Set([word]);
  for (const s of SUFFIXES) {
    if (word.length - s.length >= 3 && word.endsWith(s)) stems.add(word.slice(0, -s.length));
  }
  const out = new Set();
  for (const st of stems) {
    out.add(st);
    // Consonant gradation: peka -> pekka (Pekalle), mati -> matti (Matin).
    for (let i = 1; i < st.length - 1; i++) {
      const c = st[i];
      if ((c === 'k' || c === 'p' || c === 't') && VOWELS.has(st[i - 1]) && VOWELS.has(st[i + 1])) {
        out.add(st.slice(0, i) + c + st.slice(i));
      }
    }
    // Surname gradation: virtase(n) -> virtanen, korhose(n) -> korhonen.
    if (st.length >= 4 && st.endsWith('se')) out.add(st.slice(0, -2) + 'nen');
  }
  return [...out];
}

/** Returns { first, last, ambiguous } for a lowercase word, or null. */
function lookup(word) {
  const { first, last, ambiguous } = loadLists();
  for (const c of candidates(word)) {
    const f = first.has(c);
    const l = last.has(c);
    if (f || l) return { first: f, last: l, ambiguous: ambiguous.has(c) };
  }
  return null;
}

const lower = (s) => s.toLocaleLowerCase('fi');

/**
 * Classify a capitalised token.
 * @returns {null | { kind: 'allowed' } | { kind: 'name', first: boolean, last: boolean, ambiguous: boolean }}
 */
function classify(word) {
  if (isAllowedName(word)) return { kind: 'allowed' };
  const parts = word.split('-');
  if (parts.length === 1) {
    const r = lookup(lower(word));
    return r ? { kind: 'name', ...r } : null;
  }
  // Hyphenated: flagged when at least one part is a name and every part is a name or allowed.
  let anyName = false;
  let allAmbiguous = true;
  let first = false;
  let last = false;
  for (const p of parts) {
    if (isAllowedName(p)) {
      allAmbiguous = false;
      continue;
    }
    const r = lookup(lower(p));
    if (!r) return null;
    anyName = true;
    if (!r.ambiguous) allAmbiguous = false;
    first ||= r.first;
    last ||= r.last;
  }
  return anyName ? { kind: 'name', first, last, ambiguous: allAmbiguous } : { kind: 'allowed' };
}

const TOKEN_RE = /\p{Lu}\p{Ll}+(?:-\p{Lu}\p{Ll}+)*/gu;

// Cue words directly before a name. Matched against the text just before the token.
const CUE_RE = new RegExp(
  '(?:nimeltä|kutsutaan|kutsutaanko|min vän|mun kaveri|min kaveri|min kompis|my friend|named|called|' +
  'min mamma|min pappa|min son|min dotter|my son|my daughter|my husband|my wife|' +
  'äitini|isäni|lapseni|lapsemme|mummuni|pappani|ystäväni|vaimoni|miehenikin|sisareni|veljeni|siskoni|' +
  'poikani|tyttäreni)\\s*$',
  'u',
);

const hasCue = (text, start) => CUE_RE.test(lower(text.slice(Math.max(0, start - 24), start)));

// Not a person: church dedications ("Sankt Olofs kyrka", "St. Peter's church") and Bible
// references ("John 3:16"). Checked on the single token before any pairing.
const DEDICATION_BEFORE_RE = /(?:sankt|st\.?|saint)\s*$/iu;
const DEDICATION_AFTER_RE = /^(?:['’]s)?\s+(?:kyrka|kirkko|kirkon|kyrkan|kirkkoon|church|kyrkans|kyrkor)/iu;
const BIBLE_REF_AFTER_RE = /^\.?\s*\d{1,3}:\d/u;

function isNonPersonContext(text, start, end) {
  const before = text.slice(Math.max(0, start - 8), start);
  const after = text.slice(end, end + 24);
  return DEDICATION_BEFORE_RE.test(before) || DEDICATION_AFTER_RE.test(after) || BIBLE_REF_AFTER_RE.test(after);
}

/**
 * @param {string} text
 * @returns {Array<{type: 'person_name', start: number, end: number, confidence: number}>}
 */
export function findNames(text) {
  const src = typeof text === 'string' ? text : '';
  if (src.length === 0) return [];

  const { text: norm, map } = normalize(src);
  const tokens = [];
  for (const m of norm.matchAll(TOKEN_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    const info = isNonPersonContext(norm, start, end) ? null : classify(m[0]);
    tokens.push({ start, end, info });
  }

  const isName = (t) => t && t.info && t.info.kind === 'name';
  const singleSpaced = (a, b) => b.start - a.end === 1 && norm[a.end] === ' ';

  const found = [];
  const emit = (start, end, confidence) => {
    const span = toOriginalSpan(map, start, end);
    if (span.end > span.start) found.push({ type: 'person_name', start: span.start, end: span.end, confidence });
  };

  const used = new Array(tokens.length).fill(false);

  // Pass 1: adjacent name pairs (first+surname, or any pair touching an ambiguous word).
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (!isName(a) || !isName(b) || !singleSpaced(a, b)) continue;
    const pairOk =
      (a.info.first && b.info.last) ||
      (a.info.last && b.info.first) ||
      a.info.ambiguous || b.info.ambiguous;
    if (!pairOk) continue;
    emit(a.start, b.end, 0.8);
    used[i] = used[i + 1] = true;
    i++;
  }

  // Pass 2: single names. Ambiguous words are never flagged alone.
  tokens.forEach((t, i) => {
    if (used[i] || !isName(t) || t.info.ambiguous) return;
    const confidence = hasCue(norm, t.start) ? 0.7 : 0.6;
    emit(t.start, t.end, confidence);
  });

  // An unambiguous name is flagged even at a sentence start (high-confidence name).
  return found.sort((x, y) => x.start - y.start);
}
