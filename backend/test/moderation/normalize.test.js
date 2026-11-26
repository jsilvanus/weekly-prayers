import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, toOriginalSpan } from '../../src/services/moderation/normalize.js';

test('normalize: map has text.length + 1 entries and ends at the original length', () => {
  const src = 'Terve​ maailma (at) x';
  const { text, map } = normalize(src);
  assert.equal(map.length, text.length + 1);
  assert.equal(map[map.length - 1], src.length);
});

test('normalize: zero-width and format characters are removed', () => {
  const { text } = normalize('ab​c‍﻿d­e');
  assert.equal(text, 'abcde');
});

test('normalize: NFKC folds fullwidth characters and ligatures', () => {
  assert.equal(normalize('＋３５８').text, '+358');
  assert.equal(normalize('ﬁ').text, 'fi');
});

test('normalize: decomposed combining marks are composed into one cluster', () => {
  const decomposed = 'ä';
  const { text, map } = normalize(decomposed);
  assert.equal(text, 'ä');
  assert.equal(map.length, 2);
  assert.equal(map[0], 0);
  assert.equal(map[1], decomposed.length);
});

test('normalize: "(at)", "[at]" and " ät " become "@"', () => {
  assert.equal(normalize('matti (at) esimerkki').text, 'matti@esimerkki');
  assert.equal(normalize('matti[at]esimerkki').text, 'matti@esimerkki');
  assert.equal(normalize('matti ät esimerkki').text, 'matti@esimerkki');
  assert.equal(normalize('matti (ät) esimerkki').text, 'matti@esimerkki');
});

test('normalize: plain " at " is left alone', () => {
  assert.equal(normalize('kello at noon').text, 'kello at noon');
});

test('normalize: "(dot)" between a word and a tld-like token becomes "."', () => {
  assert.equal(normalize('esimerkki (dot) fi').text, 'esimerkki.fi');
  assert.equal(normalize('esimerkki(dot)com').text, 'esimerkki.com');
});

test('normalize: " piste " becomes "." only before a known tld', () => {
  assert.equal(normalize('esimerkki piste fi').text, 'esimerkki.fi');
  assert.equal(normalize('ristin piste kaksi').text, 'ristin piste kaksi');
});

test('normalize: digits are left untouched for the phone rule', () => {
  assert.equal(normalize('040 123 4567').text, '040 123 4567');
});

test('toOriginalSpan maps normalised offsets back to the original text', () => {
  const src = 'x​ matti (at) esimerkki';
  const { text, map } = normalize(src);
  const at = text.indexOf('@');
  const span = toOriginalSpan(map, text.indexOf('matti'), text.indexOf('esimerkki') + 'esimerkki'.length);
  assert.equal(src.slice(span.start, span.end), 'matti (at) esimerkki');
  assert.ok(at >= 0);
});

test('toOriginalSpan clamps out-of-range indices', () => {
  const { map } = normalize('abc');
  const span = toOriginalSpan(map, 0, 99);
  assert.deepEqual(span, { start: 0, end: 3 });
});

test('normalize: non-string input yields an empty result', () => {
  const { text, map } = normalize(undefined);
  assert.equal(text, '');
  assert.deepEqual(map, [0]);
});
