/**
 * Email addresses. Obfuscated forms ("name (at) domain (dot) fi") are already
 * rewritten to plain "@" and "." by normalize(), so only plain addresses are matched here.
 */

const EMAIL_RE = /(?<![\p{L}\d._%+\-])[\p{L}\d][\p{L}\d._%+\-]*@(?:[\p{L}\d](?:[\p{L}\d-]*[\p{L}\d])?\.)+\p{L}{2,}(?![\p{L}\d-])/gu;

/**
 * @param {string} text normalised text
 * @returns {Array<{type: 'email', start: number, end: number, confidence: number}>}
 */
export function findEmail(text) {
  const out = [];
  for (const m of text.matchAll(EMAIL_RE)) {
    out.push({ type: 'email', start: m.index, end: m.index + m[0].length, confidence: 0.95 });
  }
  return out;
}
