import test from 'node:test';
import assert from 'node:assert/strict';
import { findPlate } from '../../src/services/moderation/rules/plate.js';

test('plate: dash-separated Finnish plate with 1-3 digits', () => {
  for (const v of ['ABC-123', 'KLM-12', 'TUV-1']) {
    const found = findPlate(`auto ${v} pihalla`);
    assert.equal(found.length, 1, `should match ${v}`);
    assert.equal(found[0].confidence, 0.8);
  }
});

test('plate: space-separated form is reported at lower confidence', () => {
  const found = findPlate('auto KLM 45 pihalla');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.5);
});

test('plate: lowercase letters are not matched (conservative)', () => {
  assert.equal(findPlate('auto abc-123').length, 0);
});

test('plate: letters Finnish plates do not use (I, Q, Z) are not matched', () => {
  assert.equal(findPlate('QZX-123').length, 0);
  assert.equal(findPlate('IOK-123').length, 0);
});

test('plate: three-letter plates that contain O are matched (OLU-877, JOX-279)', () => {
  for (const v of ['OLU-877', 'JOX-279', 'OOP-100']) {
    const found = findPlate(`ajoneuvo ${v} on rikki`);
    assert.equal(found.length, 1, `should match ${v}`);
    assert.equal(found[0].confidence, 0.8);
  }
});

test('plate: two-letter plates (BS-377, PP-709) are not valid and not matched', () => {
  assert.equal(findPlate('rekisterinumero BS-377 varastettiin').length, 0);
  assert.equal(findPlate('PP-709').length, 0);
});

test('plate: Bible abbreviations are not matched in the space form, even next to O letters', () => {
  assert.equal(findPlate('Joh 3 ja Psa 23').length, 0);
  assert.equal(findPlate('JOH 3:16').length, 0);
});

test('plate: two-letter or four-digit groups are not matched', () => {
  assert.equal(findPlate('AB-123').length, 0);
  assert.equal(findPlate('ABC-1234').length, 0);
});

test('plate: a longer uppercase word is not matched as a plate', () => {
  assert.equal(findPlate('ABCD-123').length, 0);
});

test('plate: capitalised Bible book abbreviations in the space form are not matched', () => {
  assert.equal(findPlate('PSA 23 ja JOH 3').length, 0);
  assert.equal(findPlate('KLM-3 ja TUV-23').length, 2); // dash form is not exempt
});
