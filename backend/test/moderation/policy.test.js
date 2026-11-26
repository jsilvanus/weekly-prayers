import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { decide, REJECT_CONFIDENCE } from '../../src/services/moderation/policy.js';
import * as moderation from '../../src/services/moderation/index.js';

// All strings are synthetic.

describe('moderation policy: decide()', () => {
  test('exports the reject threshold', () => {
    assert.equal(REJECT_CONFIDENCE, 0.9);
  });

  test('index re-exports analyze, decide and redactSuggestion', () => {
    assert.equal(typeof moderation.analyze, 'function');
    assert.equal(typeof moderation.decide, 'function');
    assert.equal(typeof moderation.redactSuggestion, 'function');
    assert.equal(moderation.REJECT_CONFIDENCE, REJECT_CONFIDENCE);
  });

  test('valid henkilötunnus (checksum ok, confidence 1) is rejected', () => {
    const r = decide('Hetuni on 260751-490C, ja pyydän rukousta henkilöllisyyteni turvaamiseksi.');
    assert.equal(r.decision, 'reject');
    assert.equal(r.redactedSuggestion, null);
    assert.deepEqual(r.findings.map((f) => f.type), ['hetu']);
    assert.deepEqual(r.reasons, { hetu: 1 });
  });

  test('a low-confidence space-separated plate is reviewed, with a redacted suggestion', () => {
    const text = 'Pyydämme rukousta ABC 12 3 tilanteeseen.';
    const r = decide(text);
    assert.equal(r.decision, 'review');
    assert.ok(r.findings.some((f) => f.type === 'plate'));
    assert.ok(typeof r.redactedSuggestion === 'string');
    assert.ok(r.redactedSuggestion.includes('[rekisterinumero]'));
    assert.ok(!r.redactedSuggestion.includes('ABC 12 3'));
  });

  test('a dash-form plate (confidence 0.8) is reviewed, not rejected', () => {
    const r = decide('Pyydämme rukousta, auto ABC-123 on rikki.');
    assert.equal(r.decision, 'review');
    assert.equal(r.redactedSuggestion, 'Pyydämme rukousta, auto [rekisterinumero] on rikki.');
  });

  test('a date of birth (confidence below threshold) is reviewed', () => {
    const r = decide('Syntynyt 12.3.1960 ja pyydämme rukousta.');
    assert.equal(r.decision, 'review');
    assert.equal(r.redactedSuggestion, 'Syntynyt [syntymäaika] ja pyydämme rukousta.');
  });

  test('plain prayer is ok, with no redacted suggestion', () => {
    const r = decide('Luemme 1. Kor. 13:4 ja rukoilemme sen sanan mukaan.');
    assert.equal(r.decision, 'ok');
    assert.deepEqual(r.findings, []);
    assert.equal(r.redactedSuggestion, null);
    assert.deepEqual(r.reasons, {});
  });

  test('ordinary given names and church words are ok (Toivo, Rauha, Jumala)', () => {
    const r = decide('Rukoilemme Toivo ja Rauha puolesta, ja Jumalan johdatusta.');
    assert.equal(r.decision, 'ok');
    assert.deepEqual(r.findings, []);
  });

  test('client-facing findings carry type and offsets only, never confidence', () => {
    const r = decide('Hetuni on 260751-490C, ja pyydän rukousta.');
    for (const f of r.findings) {
      assert.deepEqual(Object.keys(f).sort(), ['end', 'start', 'type']);
    }
    assert.ok(Array.isArray(r.internalFindings));
    assert.equal(typeof r.internalFindings[0].confidence, 'number');
  });

  test('reject wins over review when both kinds of finding are present', () => {
    const r = decide('Hetuni on 260751-490C ja syntynyt 12.3.1960.');
    assert.equal(r.decision, 'reject');
    assert.equal(r.redactedSuggestion, null);
  });

  test('non-string input is treated as an empty ok prayer', () => {
    assert.equal(decide(undefined).decision, 'ok');
    assert.equal(decide(null).decision, 'ok');
  });

  test('redacted suggestion does not contain the matched value', () => {
    const text = 'Pyydämme rukousta, auto ABC-123 on rikki.';
    const r = decide(text, 'sv');
    assert.equal(r.decision, 'review');
    assert.ok(!r.redactedSuggestion.includes('ABC-123'));
  });
});
