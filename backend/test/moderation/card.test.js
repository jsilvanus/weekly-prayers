import test from 'node:test';
import assert from 'node:assert/strict';
import { findCard, luhnValid } from '../../src/services/moderation/rules/card.js';

// Standard synthetic test numbers (Luhn-valid, not real accounts).
const VISA = '4111 1111 1111 1111';
const VISA_DASH = '4111-1111-1111-1111';
const VISA_PLAIN = '4111111111111111';
const AMEX = '3782-822463-10005';

test('card: Luhn check on known test numbers', () => {
  assert.equal(luhnValid('4111111111111111'), true);
  assert.equal(luhnValid('378282246310005'), true);
  assert.equal(luhnValid('4111111111111112'), false);
});

test('card: grouped and plain Luhn-valid numbers are found with confidence 1', () => {
  for (const v of [VISA, VISA_DASH, VISA_PLAIN, AMEX]) {
    const found = findCard(`numero ${v} tässä`);
    assert.equal(found.length, 1, `should find ${v}`);
    assert.equal(found[0].confidence, 1);
    assert.equal(found[0].end - found[0].start, v.length);
  }
});

test('card: Luhn-invalid grouped number is not flagged', () => {
  assert.equal(findCard('4111 1111 1111 1112').length, 0);
});

test('card: odd unformatted grouping is not flagged even if Luhn passes', () => {
  // 16 digits passing Luhn but in a 4-4-3-4 grouping: conservative, not flagged.
  assert.equal(findCard('4111 1111 111 1111').length, 0);
});

test('card: short Luhn-valid numbers are not flagged', () => {
  assert.equal(findCard('79927398713').length, 0); // 11 digits
});

test('card: amounts and reference numbers with spaces are not flagged', () => {
  assert.equal(findCard('Hinta 1 200 euroa').length, 0);
  assert.equal(findCard('Viite 1234 5678 90').length, 0);
});

