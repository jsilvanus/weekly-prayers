import test from 'node:test';
import assert from 'node:assert/strict';
import { findDob } from '../../src/services/moderation/rules/dob.js';
import { analyze } from '../../src/services/moderation/analyze.js';

function spans(src) {
  return findDob(src).map((f) => src.slice(f.start, f.end));
}

test('dob: Finnish "syntynyt" with a full written date', () => {
  assert.deepEqual(spans('syntynyt 12. maaliskuuta 1975 Vaasassa'), ['12. maaliskuuta 1975']);
});

test('dob: numeric dates with a cue, 4-digit and 2-digit years', () => {
  assert.equal(findDob('syntynyt 12.3.1975').length, 1);
  assert.equal(findDob('s. 12.03.75').length, 1);
  assert.equal(findDob('s. 12.03.75')[0].confidence, 0.7);
});

test('dob: ISO date with a cue', () => {
  assert.equal(findDob('syntynyt 1975-03-12').length, 1);
  assert.equal(findDob('b. 1975-03-12').length, 1);
});

test('dob: Swedish cue "född" and abbreviation "f." style forms', () => {
  assert.equal(findDob('född 12.3.1975').length, 1);
  assert.equal(findDob('född den 12 mars 1975').length, 1);
});

test('dob: English cues "born" and "b."', () => {
  assert.equal(findDob('born 12 March 1975').length, 1);
  assert.equal(findDob('b. 12.3.1975').length, 1);
});

test('dob: cue after the date within a short window is also accepted', () => {
  assert.equal(findDob('12.3.1975 syntynyt').length, 1);
});

test('dob: ordinary dates without a birth cue are not flagged', () => {
  assert.equal(findDob('Kokous on 12.3.1975 kello 18.').length, 0);
  assert.equal(findDob('Pidetään 12. maaliskuuta 2024.').length, 0);
});

test('dob: a cue too far away does not count', () => {
  const src = 'syntynyt aikoinaan kaukana kaukana kaukana kaukana kaukana 12.3.1975';
  assert.equal(findDob(src).length, 0);
});

test('dob: impossible dates are not flagged', () => {
  assert.equal(findDob('syntynyt 31.2.1975').length, 0);
  assert.equal(findDob('syntynyt 29.2.1975').length, 0);
  assert.equal(findDob('syntynyt 29.2.1976').length, 1);
});

test('dob: clock times and Bible references are not dates', () => {
  assert.equal(findDob('klo 12.30 ja Joh. 3:16').length, 0);
});

test('dob: analyze() reports dob for a cued date and nothing for an ordinary one', () => {
  const cued = analyze('syntynyt 12.3.1975');
  assert.deepEqual(cued.findings.map((f) => f.type), ['dob']);
  const plain = analyze('Kokous 12.3.1975');
  assert.deepEqual(plain.findings, []);
});
