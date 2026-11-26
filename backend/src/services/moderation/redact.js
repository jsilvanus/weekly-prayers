/**
 * Produce a redaction suggestion: each finding is replaced by a neutral bracketed label.
 * Replacements are applied from the end so earlier offsets stay valid.
 */

export const LABELS = Object.freeze({
  hetu: { fi: '[henkilötunnus]', sv: '[personnummer]', en: '[personal identity code]' },
  iban: { fi: '[tilinumero]', sv: '[kontonummer]', en: '[bank account number]' },
  card: { fi: '[korttinumero]', sv: '[kortnummer]', en: '[card number]' },
  phone: { fi: '[puhelinnumero]', sv: '[telefonnummer]', en: '[phone number]' },
  email: { fi: '[sähköposti]', sv: '[e-post]', en: '[email address]' },
  address: { fi: '[osoite]', sv: '[adress]', en: '[address]' },
  url: { fi: '[linkki]', sv: '[länk]', en: '[link]' },
  plate: { fi: '[rekisterinumero]', sv: '[registreringsnummer]', en: '[registration plate]' },
  dob: { fi: '[syntymäaika]', sv: '[födelsedatum]', en: '[date of birth]' },
});

/**
 * @param {string} text original text the findings refer to
 * @param {Array<{type: string, start: number, end: number}>} findings
 * @param {'fi'|'sv'|'en'} [lang='fi']
 * @returns {string}
 */
export function redactSuggestion(text, findings, lang = 'fi') {
  const src = typeof text === 'string' ? text : '';
  const list = Array.isArray(findings) ? findings : [];
  const sorted = list
    .filter((f) => f && Number.isInteger(f.start) && Number.isInteger(f.end) && f.start >= 0 && f.end > f.start && f.end <= src.length)
    .slice()
    .sort((a, b) => b.start - a.start);

  let out = src;
  let limit = Infinity;
  for (const f of sorted) {
    if (f.end > limit) continue; // overlapping finding already replaced
    const labels = LABELS[f.type];
    const label = labels ? (labels[lang] ?? labels.fi) : '[tiedot]';
    out = out.slice(0, f.start) + label + out.slice(f.end);
    limit = f.start;
  }
  return out;
}
