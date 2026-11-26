import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSuggestion, LABELS } from '../../src/services/moderation/redact.js';
import { analyze, FINDING_TYPES } from '../../src/services/moderation/analyze.js';

test('redact: replaces each finding with the Finnish label by default', () => {
  const src = 'Soita 040 123 4567 tai kirjoita matti.virtanen@example.fi';
  const { findings } = analyze(src);
  assert.equal(
    redactSuggestion(src, findings),
    'Soita [puhelinnumero] tai kirjoita [sähköposti]',
  );
});

test('redact: Swedish and English labels', () => {
  const src = 'Ring 040 123 4567 nu';
  const { findings } = analyze(src);
  assert.equal(redactSuggestion(src, findings, 'sv'), 'Ring [telefonnummer] nu');
  assert.equal(redactSuggestion(src, findings, 'en'), 'Ring [phone number] nu');
});

test('redact: every finding type has a label in fi, sv and en', () => {
  for (const type of FINDING_TYPES) {
    for (const lang of ['fi', 'sv', 'en']) {
      const label = LABELS[type][lang];
      assert.equal(typeof label, 'string', `${type}/${lang}`);
      assert.ok(label.startsWith('[') && label.endsWith(']'), `${type}/${lang} bracketed`);
    }
  }
});

test('redact: offsets stay valid when several findings are replaced', () => {
  const src = 'a 040 123 4567 b 131052-308T c';
  const findings = [
    { type: 'phone', start: 2, end: 14 },
    { type: 'hetu', start: 17, end: 28 },
  ];
  assert.equal(redactSuggestion(src, findings), 'a [puhelinnumero] b [henkilötunnus] c');
});

test('redact: unsorted findings are applied correctly', () => {
  const src = 'x 040 123 4567 y 131052-308T';
  const findings = [
    { type: 'hetu', start: 17, end: 28 },
    { type: 'phone', start: 2, end: 14 },
  ];
  assert.equal(redactSuggestion(src, findings), 'x [puhelinnumero] y [henkilötunnus]');
});

test('redact: overlapping findings do not corrupt the text', () => {
  const src = 'abcdefghij';
  const out = redactSuggestion(src, [
    { type: 'email', start: 0, end: 6 },
    { type: 'phone', start: 3, end: 8 },
  ]);
  // The later finding is applied first; the overlapping earlier one is skipped.
  assert.equal(out, 'abc[puhelinnumero]ij');
});

test('redact: no findings returns the text unchanged', () => {
  assert.equal(redactSuggestion('Herra, siunaa meitä.', []), 'Herra, siunaa meitä.');
  assert.equal(redactSuggestion('Herra', undefined), 'Herra');
});

test('redact: invalid spans are ignored', () => {
  const src = 'abc';
  assert.equal(redactSuggestion(src, [{ type: 'phone', start: 5, end: 9 }, { type: 'phone', start: 2, end: 2 }]), 'abc');
});

test('redact: unknown language falls back to Finnish', () => {
  const src = '040 123 4567';
  const { findings } = analyze(src);
  assert.equal(redactSuggestion(src, findings, 'de'), '[puhelinnumero]');
});

test('redact: the redacted output no longer contains the matched value', () => {
  const src = 'Tili FI21 1234 5600 0007 85 ja kortti 4111 1111 1111 1111';
  const { findings } = analyze(src);
  const out = redactSuggestion(src, findings);
  assert.equal(out.includes('1234 5600'), false);
  assert.equal(out.includes('4111 1111'), false);
  assert.equal(out, 'Tili [tilinumero] ja kortti [korttinumero]');
});
