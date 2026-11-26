import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedName, ALLOWED_NAMES } from '../../src/services/moderation/allowlist.js';

test('allowlist: base forms of religious figures and titles are allowed', () => {
  for (const w of ['Jumala', 'Jeesus', 'Kristus', 'Maria', 'Pietari', 'Paavali', 'Johannes', 'Daavid', 'Mooses', 'Abraham', 'Henki', 'Herra']) {
    assert.equal(isAllowedName(w), true, w);
  }
  for (const w of ['piispa', 'kirkkoherra', 'pappi', 'presidentti']) {
    assert.equal(isAllowedName(w), true, w);
  }
  assert.ok(ALLOWED_NAMES.has('jumala'));
});

test('allowlist: Finnish case endings are tolerated for common stems', () => {
  for (const w of ['Jumalan', 'Jumalaa', 'Jumalalle', 'Jeesuksen', 'Jeesusta', 'Kristuksen', 'Marian', 'Pietarin', 'Paavalin', 'Johanneksen', 'Daavidin', 'Mooseksen', 'Abrahamin', 'Herran', 'Herralle', 'piispan', 'kirkkoherran', 'papin', 'presidentin']) {
    assert.equal(isAllowedName(w), true, w);
  }
});

test('allowlist: irregular henki/heng forms are allowed', () => {
  assert.equal(isAllowedName('hengen'), true);
  assert.equal(isAllowedName('hengessä'), true);
});

test('allowlist: case-insensitive', () => {
  assert.equal(isAllowedName('JUMALA'), true);
  assert.equal(isAllowedName('  herra  '), true);
});

test('allowlist: ordinary words and other names are not allowed', () => {
  assert.equal(isAllowedName('Matti'), false);
  assert.equal(isAllowedName('Helsinki'), false);
  assert.equal(isAllowedName('henkilö'), false);
  assert.equal(isAllowedName('herrattomuus'), false);
  assert.equal(isAllowedName('jumalattomuus'), false);
});

test('allowlist: non-string and empty input is not allowed', () => {
  assert.equal(isAllowedName(''), false);
  assert.equal(isAllowedName(undefined), false);
  assert.equal(isAllowedName(42), false);
});
