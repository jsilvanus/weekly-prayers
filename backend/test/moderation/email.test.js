import test from 'node:test';
import assert from 'node:assert/strict';
import { findEmail } from '../../src/services/moderation/rules/email.js';
import { analyze } from '../../src/services/moderation/analyze.js';

test('email: plain address is found', () => {
  const found = findEmail('kirjoita matti.virtanen@example.fi kiitos');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.95);
  assert.equal(found[0].end - found[0].start, 'matti.virtanen@example.fi'.length);
});

test('email: Swedish and English samples', () => {
  assert.equal(findEmail('skriv anna.s@exempel.se tack').length, 1);
  assert.equal(findEmail('write john+prayer@example.co.uk now').length, 1);
});

test('email: obfuscated "(at)" and "(dot)" forms are found through analyze()', () => {
  const src = 'mail: matti (at) esimerkki (dot) fi';
  const { findings } = analyze(src);
  assert.deepEqual(findings.map((f) => f.type), ['email']);
  assert.equal(src.slice(findings[0].start, findings[0].end), 'matti (at) esimerkki (dot) fi');
});

test('email: bracketed [at] and square-bracket obfuscation', () => {
  const { findings } = analyze('anna[at]exempel[dot]se');
  assert.deepEqual(findings.map((f) => f.type), ['email']);
});

test('email: an @handle without a domain is not an email', () => {
  assert.equal(findEmail('@tervehdys ja kiitos').length, 0);
});

test('email: a domain without a tld is not an email', () => {
  assert.equal(findEmail('nimi@localhost kiitos').length, 0);
});

test('email: analyze() prefers the email over an overlapping handle', () => {
  const { findings } = analyze('matti@esimerkki.fi');
  assert.deepEqual(findings.map((f) => f.type), ['email']);
});
