import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, FINDING_TYPES } from '../../src/services/moderation/analyze.js';

const SYNTHETIC_HETU = '131052-308T';
const SYNTHETIC_IBAN = 'FI21 1234 5600 0007 85';
const SYNTHETIC_CARD = '4111 1111 1111 1111';
const SYNTHETIC_PHONE = '040 123 4567';
const SYNTHETIC_EMAIL = 'matti.virtanen@example.fi';

test('analyze: empty and non-string input yield no findings', () => {
  assert.deepEqual(analyze('').findings, []);
  assert.deepEqual(analyze(undefined).findings, []);
  assert.deepEqual(analyze(null).findings, []);
});

test('analyze: ordinary prayer-style text with hard negatives yields no findings', () => {
  const src = [
    'Herra, siunaa meitä. Joh. 3:16 kertoo rakkaudesta.',
    'Jumalanpalvelus alkaa klo 12.30 ja kolehti on 1 200 euroa.',
    'Vuonna 1975 ja 2024 seurakunta kokoontui; Ps. 23:1-6.',
    'Kokous pidetään 12.3.1975 ja psalmi 23 luetaan.',
  ].join(' ');
  assert.deepEqual(analyze(src).findings, []);
});

test('analyze: each type is detected with the correct span in the original text', () => {
  const src = [
    `henkilötunnus ${SYNTHETIC_HETU}`,
    `tili ${SYNTHETIC_IBAN}`,
    `kortti ${SYNTHETIC_CARD}`,
    `puh ${SYNTHETIC_PHONE}`,
    `sähkö ${SYNTHETIC_EMAIL}`,
    'osoite Hämeenkatu 5 A 3',
    'linkki https://example.org/x',
    'auto ABC-123',
    'syntynyt 12.3.1975',
  ].join(', ');
  const { findings } = analyze(src);
  const types = findings.map((f) => f.type);
  for (const t of ['hetu', 'iban', 'card', 'phone', 'email', 'address', 'url', 'plate', 'dob']) {
    assert.ok(types.includes(t), `expected a ${t} finding`);
  }
  const byType = Object.fromEntries(findings.map((f) => [f.type, src.slice(f.start, f.end)]));
  assert.equal(byType.hetu, SYNTHETIC_HETU);
  assert.equal(byType.iban, SYNTHETIC_IBAN);
  assert.equal(byType.card, SYNTHETIC_CARD);
  assert.equal(byType.phone, SYNTHETIC_PHONE);
  assert.equal(byType.email, SYNTHETIC_EMAIL);
  assert.equal(byType.address, 'Hämeenkatu 5 A 3');
  assert.equal(byType.plate, 'ABC-123');
});

test('analyze: findings are sorted by start and never overlap', () => {
  const src = `${SYNTHETIC_EMAIL} ${SYNTHETIC_PHONE} ${SYNTHETIC_HETU}`;
  const { findings } = analyze(src);
  for (let i = 1; i < findings.length; i++) {
    assert.ok(findings[i - 1].start <= findings[i].start);
    assert.ok(findings[i - 1].end <= findings[i].start, 'no overlap');
  }
});

test('analyze: overlapping candidates keep the highest-confidence finding', () => {
  // A valid email also contains an @handle-like run; the email (0.95) must win over the handle (0.6).
  const { findings } = analyze(SYNTHETIC_EMAIL);
  assert.deepEqual(findings.map((f) => f.type), ['email']);
  assert.equal(findings[0].confidence, 0.95);
});

test('analyze: a checksum-valid hetu outranks a checksum-invalid one on the same span', () => {
  const { findings } = analyze('131052-308T');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].confidence, 1);
});

test('analyze: obfuscated email is mapped back to original offsets', () => {
  const src = 'Kirjoita matti (at) esimerkki (dot) fi kiitos';
  const { findings } = analyze(src);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'email');
  assert.equal(src.slice(findings[0].start, findings[0].end), 'matti (at) esimerkki (dot) fi');
});

test('analyze: zero-width characters do not break offsets', () => {
  const src = `puh​ ${SYNTHETIC_PHONE} loppu`;
  const { findings } = analyze(src);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'phone');
  assert.equal(src.slice(findings[0].start, findings[0].end), SYNTHETIC_PHONE);
});

test('analyze: findings expose only type, offsets and confidence, never the matched text', () => {
  const { findings } = analyze(`${SYNTHETIC_HETU} ${SYNTHETIC_EMAIL}`);
  assert.ok(findings.length >= 2);
  for (const f of findings) {
    assert.deepEqual(Object.keys(f).sort(), ['confidence', 'end', 'start', 'type']);
    assert.ok(FINDING_TYPES.includes(f.type));
    assert.ok(f.confidence >= 0 && f.confidence <= 1);
    assert.ok(Number.isInteger(f.start) && Number.isInteger(f.end));
  }
});
