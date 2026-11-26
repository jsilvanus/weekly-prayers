/**
 * Words that must never be flagged as person names (used by later name detection).
 *
 * Covers religious figures and church titles. Finnish case endings are tolerated for
 * the common stems via isAllowedName(); the exact base forms are in ALLOWED_NAMES.
 */

export const ALLOWED_NAMES = new Set([
  'jumala', 'jeesus', 'kristus', 'maria', 'pietari', 'paavali', 'johannes', 'daavid',
  'mooses', 'abraham', 'henki', 'herra',
  'piispa', 'kirkkoherra', 'pappi', 'presidentti',
]);

const COMMON_ENDINGS = [
  '', 'a', 'ä', 'n', 'aa', 'ää', 'an', 'än', 'in', 'iin', 'lle', 'lla', 'llä', 'lta', 'ltä',
  'ssa', 'ssä', 'sta', 'stä', 'ksi', 'een', 'ksen', 'kseen', 'ta', 'tä', 't', 'ia', 'iä',
  'ille', 'na', 'nä', 's', 'sen', 'aan', 'ään', 'ksessa', 'ksessä', 'ksesta', 'kselle', 'ksella',
  // a-final stems (Jumala, Abraham, Pietari...): the base vowel is part of the ending
  'alle', 'alla', 'allä', 'alta', 'altä', 'assa', 'assä', 'asta', 'astä', 'aksi', 'ana', 'anä',
];

// Stems: the base form minus its final vowel/case ending, so inflections match.
const STEMS = [
  'jumal', 'jeesu', 'kristu', 'maria', 'pietari', 'paavali', 'johanne', 'daavid', 'moose',
  'abraham', 'herra', 'piispa', 'kirkkoherra', 'pappi', 'papi', 'presidentti', 'presidenti',
];

const STEM_RE = new RegExp(`^(?:${STEMS.join('|')})(?:${COMMON_ENDINGS.join('|')})$`, 'u');

// "henki" has irregular stems: henki / henke / heng- (hengen, hengessä, hengelle ...).
const HENKI_RE = /^(?:henki|henke|heng)(?:|a|ä|n|en|essä|essa|eeseen|elle|eltä|elta|ellä|ella|ksi|iä|iin|ien|eitä)$/u;

/**
 * True when the word is (an inflected form of) an allowlisted name or title.
 * @param {string} word
 * @returns {boolean}
 */
export function isAllowedName(word) {
  if (typeof word !== 'string') return false;
  const w = word.trim().toLocaleLowerCase('fi').normalize('NFC');
  if (!w) return false;
  return ALLOWED_NAMES.has(w) || STEM_RE.test(w) || HENKI_RE.test(w);
}
