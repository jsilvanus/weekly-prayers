import test from 'node:test';
import assert from 'node:assert/strict';
import { findHetu, validateHetu, hetuCheckChar, isRealDate } from '../../src/services/moderation/rules/hetu.js';
import { analyze } from '../../src/services/moderation/analyze.js';

// Synthetic/example identity codes; the checksum is the only thing that matters here.
const VALID = '131052-308T'; // well-known documented example, check char T
const VALID_PLUS = '131052+308T';
const VALID_A = '131052A308T';
const VALID_LOWER = '131052a308t';

test('hetu: checksum character follows the mod-31 table', () => {
  assert.equal(hetuCheckChar('131052', '308'), 'T');
});

test('hetu: valid checksum and date gives confidence 1', () => {
  const found = findHetu(`tunnus ${VALID} tässä`);
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 1);
  assert.equal(found[0].start, 7);
  assert.equal(found[0].end, 7 + VALID.length);
});

test('hetu: every century sign is accepted when the rest is valid', () => {
  for (const v of [VALID, VALID_PLUS, VALID_A]) {
    assert.equal(findHetu(v).length, 1, `sign in ${v} should be accepted`);
  }
});

test('hetu: lowercase sign and check letters are accepted', () => {
  assert.equal(findHetu(VALID_LOWER).length, 1);
  assert.equal(findHetu(VALID_LOWER)[0].confidence, 1);
});

test('hetu: wrong checksum is flagged with lower confidence', () => {
  const found = findHetu('131052-308U');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.5);
});

test('hetu: invalid calendar date is not flagged', () => {
  assert.equal(findHetu('310252-308T').length, 0); // 31 February
  assert.equal(findHetu('131352-308T').length, 0); // month 13
});

test('hetu: leap day handling', () => {
  assert.equal(isRealDate(29, 2, 0), true);
  assert.equal(isRealDate(29, 2, 1), false);
  assert.equal(isRealDate(29, 2, 4), true);
});

test('hetu: check letter outside the allowed set is not flagged', () => {
  // G is not in the check-character alphabet.
  assert.equal(findHetu('131052-308G').length, 0);
});

test('hetu: unknown century sign is not flagged', () => {
  assert.equal(findHetu('131052Q308T').length, 0);
});

test('hetu: digit runs longer than the pattern are not matched', () => {
  assert.equal(findHetu(`1${VALID}`).length, 0);
  assert.equal(findHetu(`${VALID}9`).length, 0);
});

test('hetu: validateHetu reports syntax, date and checksum separately', () => {
  assert.deepEqual(validateHetu(VALID), { syntax: true, dateValid: true, checksumValid: true });
  assert.deepEqual(validateHetu('131052-308U'), { syntax: true, dateValid: true, checksumValid: false });
  assert.equal(validateHetu('nonsense').syntax, false);
});

test('hetu: zero-width characters inside the code are tolerated and mapped back', () => {
  const src = `131052​-308T`;
  const { findings } = analyze(src);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'hetu');
  assert.equal(findings[0].start, 0);
  assert.equal(findings[0].end, src.length);
});

test('hetu: analyze() reports the hetu type for a valid code', () => {
  const { findings } = analyze(`Synthetic ${VALID} sample`);
  assert.deepEqual(findings.map((f) => f.type), ['hetu']);
});
