import test from 'node:test';
import assert from 'node:assert/strict';
import { findIban, isValidIban, ibanChecksumOk } from '../../src/services/moderation/rules/iban.js';
import { analyze } from '../../src/services/moderation/analyze.js';

const FI_SPACED = 'FI21 1234 5600 0007 85';
const FI_COMPACT = 'FI2112345600000785';
const GB_SPACED = 'GB82 WEST 1234 5698 7654 32';

test('iban: mod-97 accepts the documented Finnish and UK examples', () => {
  assert.equal(isValidIban(FI_COMPACT), true);
  assert.equal(isValidIban('GB82WEST12345698765432'), true);
});

test('iban: mod-97 rejects a single-digit change', () => {
  assert.equal(isValidIban('FI2112345600000786'), false);
  assert.equal(ibanChecksumOk('FI2112345600000786'), false);
});

test('iban: spaced Finnish IBAN is found with confidence 1', () => {
  const found = findIban(`tili ${FI_SPACED} kiitos`);
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 1);
  assert.equal(found[0].start, 5);
  assert.equal(found[0].end, 5 + FI_SPACED.length);
});

test('iban: compact form is found', () => {
  const found = findIban(FI_COMPACT);
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 1);
});

test('iban: trailing words after the number are not swallowed', () => {
  const src = `${FI_SPACED} and more words`;
  const found = findIban(src);
  assert.equal(found.length, 1);
  assert.equal(src.slice(found[0].start, found[0].end), FI_SPACED);
});

test('iban: any country with a valid checksum is found', () => {
  const found = findIban(GB_SPACED);
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 1);
});

test('iban: Finnish-shaped number with a bad checksum is reported at low confidence', () => {
  const found = findIban('FI21 1234 5600 0007 86');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.4);
});

test('iban: non-Finnish invalid checksum is not reported', () => {
  assert.equal(findIban('GB83 WEST 1234 5698 7654 32').length, 0);
});

test('iban: wrong length for Finland is rejected', () => {
  assert.equal(isValidIban('FI211234560000078'), false);
});

test('iban: ordinary capitalised words and numbers are not matched', () => {
  assert.equal(findIban('Herra 12 3456 789 kiitos').length, 0);
  assert.equal(findIban('Aamen ja kiitos vuonna 1975').length, 0);
});

test('iban: analyze() reports iban and never returns the value', () => {
  const { findings } = analyze(`Tili: ${FI_SPACED}`);
  assert.deepEqual(findings.map((f) => f.type), ['iban']);
  assert.deepEqual(Object.keys(findings[0]).sort(), ['confidence', 'end', 'start', 'type']);
});
