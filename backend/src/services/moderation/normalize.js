/**
 * Text normalisation for the moderation rules.
 *
 * normalize(text) returns:
 *   - text: NFKC-normalised copy with format characters (zero-width etc.) removed
 *     and a few common obfuscations undone ("(at)" -> "@", "(dot)" -> ".").
 *   - map:  map[i] is the index in the ORIGINAL text of normalised index i.
 *           map.length === text.length + 1; the last entry is the original length.
 *
 * Nothing here logs or retains input.
 */

const MARK = /\p{M}/u;
const FORMAT_CHARS = /\p{Cf}/gu;

const TLD_LIST = 'com|fi|se|org|net|eu|info|io|edu|gov|co|uk|de|no|dk|ee|ru|us|biz';

/** Split the source into clusters: a base code point plus following combining marks. */
function clusterize(src) {
  const clusters = [];
  let pos = 0;
  for (const ch of src) {
    if (MARK.test(ch) && clusters.length > 0) {
      clusters[clusters.length - 1].str += ch;
    } else {
      clusters.push({ start: pos, str: ch });
    }
    pos += ch.length;
  }
  return clusters;
}

/** Stage 1: NFKC per cluster, drop format characters, map every output unit to its cluster start. */
function stageUnicode(src) {
  let text = '';
  const map = [];
  for (const cluster of clusterize(src)) {
    const norm = cluster.str.normalize('NFKC').replace(FORMAT_CHARS, '');
    for (let k = 0; k < norm.length; k++) {
      text += norm[k];
      map.push(cluster.start);
    }
  }
  map.push(src.length);
  return { text, map };
}

/** Apply one regex rewrite to a { text, map } state, keeping the map consistent. */
function rewrite(state, re, replacement) {
  const { text, map } = state;
  let out = '';
  const nextMap = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index;
    const end = start + m[0].length;
    for (let k = last; k < start; k++) {
      out += text[k];
      nextMap.push(map[k]);
    }
    for (let k = 0; k < replacement.length; k++) {
      out += replacement[k];
      nextMap.push(map[start]);
    }
    last = end;
  }
  for (let k = last; k < text.length; k++) {
    out += text[k];
    nextMap.push(map[k]);
  }
  nextMap.push(map[text.length]);
  return { text: out, map: nextMap };
}

/**
 * Obfuscation rewrites, applied in order.
 *  - "(at)", "[at]", "(ät)", " ät " between a local part and a domain -> "@"
 *  - "(dot)" between a word and a tld-like token -> "."
 *  - " piste " between a word and a known tld -> "."
 *  Digits spelled with spaces or dots are left to the phone rule.
 */
const REWRITES = [
  [/\s*[(\[]\s*(?:at|ät)\s*[)\]]\s*|\s+ät\s+/giu, '@'],
  [/(?<=[\p{L}\d_])\s*[(\[]\s*dot\s*[)\]]\s*(?=\p{L}{2,6}(?![\p{L}\d]))/giu, '.'],
  [new RegExp(`(?<=[\\p{L}\\d_])\\s+piste\\s+(?=(?:${TLD_LIST})(?![\\p{L}\\d]))`, 'giu'), '.'],
];

/**
 * @param {string} input
 * @returns {{ text: string, map: number[] }}
 */
export function normalize(input) {
  const src = typeof input === 'string' ? input : '';
  let state = stageUnicode(src);
  for (const [re, replacement] of REWRITES) {
    state = rewrite(state, re, replacement);
  }
  return state;
}

/**
 * Convert a half-open span in normalised text into a span in the original text.
 * @param {number[]} map
 * @param {number} start normalised start (inclusive)
 * @param {number} end normalised end (exclusive)
 * @returns {{ start: number, end: number }}
 */
export function toOriginalSpan(map, start, end) {
  const last = map.length - 1;
  const clamp = (i) => Math.max(0, Math.min(i, last));
  const s = map[clamp(start)];
  const e = map[clamp(end)];
  return { start: s, end: Math.max(s, e) };
}
