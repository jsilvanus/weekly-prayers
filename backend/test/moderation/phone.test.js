import test from 'node:test';
import assert from 'node:assert/strict';
import { findPhone, classifyPhone } from '../../src/services/moderation/rules/phone.js';
import { analyze } from '../../src/services/moderation/analyze.js';

function phoneTexts(src) {
  return findPhone(src).map((f) => src.slice(f.start, f.end));
}

test('phone: Finnish +358 numbers with spaces are matched at high confidence', () => {
  const found = findPhone('soita +358 40 123 4567 huomenna');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.95);
  assert.equal(phoneTexts('soita +358 40 123 4567 huomenna')[0], '+358 40 123 4567');
});

test('phone: 00358 international prefix', () => {
  assert.equal(findPhone('00358 40 123 4567').length, 1);
});

test('phone: +358 (0) trunk form is normalised', () => {
  assert.equal(findPhone('+358 (0)40 123 4567').length, 1);
});

test('phone: national 0-prefixed numbers with common area codes', () => {
  for (const v of ['040 123 4567', '0501234567', '09 1234 5678', '(09) 123 4567', '02 123 4567', '013-123456']) {
    assert.equal(findPhone(`numero ${v} ok`).length, 1, `should match ${v}`);
  }
});

test('phone: generic international numbers with + and 8-15 digits', () => {
  const found = findPhone('+44 20 7946 0958');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.8);
  assert.equal(findPhone('+1 555 0100').length, 1);
});

test('phone: plus-sign numbers that are too short are not matched', () => {
  assert.equal(findPhone('+12 34').length, 0);
});

test('phone: plain years are not matched', () => {
  assert.equal(findPhone('vuonna 1975 ja 2024').length, 0);
});

test('phone: short numbers are not matched', () => {
  assert.equal(findPhone('Psalmi 23 ja virsi 123').length, 0);
  assert.equal(findPhone('kolme 0 1 2').length, 0);
});

test('phone: Bible references are not matched', () => {
  assert.equal(findPhone('Joh. 3:16 ja Ps. 23:1-6').length, 0);
  assert.equal(findPhone('Room. 8,28').length, 0);
});

test('phone: clock times are not matched', () => {
  assert.equal(findPhone('Jumalanpalvelus alkaa klo 12.30.').length, 0);
});

test('phone: amounts are not matched', () => {
  assert.equal(findPhone('Kolehti on 1 200 euroa.').length, 0);
});

test('phone: dates (DD.MM.YYYY, DD.MM.YY, ISO) are not matched', () => {
  assert.equal(findPhone('kokous 12.3.1975').length, 0);
  assert.equal(findPhone('kokous 01.03.2003').length, 0);
  assert.equal(findPhone('kokous 12.03.75').length, 0);
  assert.equal(findPhone('päivä 1975-03-12').length, 0);
});

test('phone: unseparated compact 8-digit date-like run starting with 0 is not matched', () => {
  assert.equal(classifyPhone('01031975'), null);
});

test('phone: classifyPhone rejects non-phone shapes', () => {
  assert.equal(classifyPhone('2024'), null);
  assert.equal(classifyPhone('1 200'), null);
});

test('phone: analyze() reports phone and does not include a date or verse', () => {
  const src = 'Joh. 3:16 ja 12.3.1975, soita 040 123 4567';
  const { findings } = analyze(src);
  assert.deepEqual(findings.map((f) => f.type), ['phone']);
  assert.equal(src.slice(findings[0].start, findings[0].end), '040 123 4567');
});
