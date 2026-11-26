/**
 * URLs, www hosts, social-network profile links and @handles.
 */

const HTTP_RE = /\bhttps?:\/\/[^\s<>"']+/giu;
const WWW_RE = /(?<![\p{L}\d@.\/])www\.[\p{L}\d\-.]+(?:\/[^\s<>"']*)?/giu;
const SOCIAL_RE = new RegExp(
  '(?<![\\p{L}\\d@./])' +
    '(?:https?://)?(?:www\\.)?' +
    '(?:facebook|fb|instagram|twitter|tiktok|linkedin|youtube|threads|snapchat|x)' +
    '\\.(?:com|net|fi)/[^\\s<>"\']+',
  'giu',
);
const HANDLE_RE = /(?<![\p{L}\d@._\-])@[\p{L}\d_][\p{L}\d_.]{1,29}/gu;

function trimTail(s) {
  return s.replace(/[.,;:!?)\]]+$/u, '');
}

function push(out, m, confidence) {
  const trimmed = trimTail(m[0]);
  if (trimmed.length === 0) return;
  out.push({ type: 'url', start: m.index, end: m.index + trimmed.length, confidence });
}

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'url', start: number, end: number, confidence: number}>}
 */
export function findUrl(text) {
  const out = [];
  for (const m of text.matchAll(SOCIAL_RE)) push(out, m, 0.9);
  for (const m of text.matchAll(HTTP_RE)) push(out, m, 0.7);
  for (const m of text.matchAll(WWW_RE)) push(out, m, 0.7);
  for (const m of text.matchAll(HANDLE_RE)) push(out, m, 0.6);
  return out;
}
