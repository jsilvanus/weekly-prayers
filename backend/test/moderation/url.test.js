import test from 'node:test';
import assert from 'node:assert/strict';
import { findUrl } from '../../src/services/moderation/rules/url.js';
import { analyze } from '../../src/services/moderation/analyze.js';

function texts(src) {
  return findUrl(src).map((f) => src.slice(f.start, f.end));
}

test('url: http and https URLs are found', () => {
  assert.deepEqual(texts('katso https://example.org/rukoukset?id=3 nyt'), ['https://example.org/rukoukset?id=3']);
  assert.deepEqual(texts('http://esimerkki.fi'), ['http://esimerkki.fi']);
});

test('url: trailing sentence punctuation is not part of the URL', () => {
  assert.deepEqual(texts('Katso https://example.org/x.'), ['https://example.org/x']);
  assert.deepEqual(texts('(https://example.org/y)'), ['https://example.org/y']);
});

test('url: www hosts are found', () => {
  assert.deepEqual(texts('käy www.esimerkki.fi/tapahtumat'), ['www.esimerkki.fi/tapahtumat']);
});

test('url: social network profile links are found with higher confidence', () => {
  const src = 'seuraa facebook.com/seurakunta ja instagram.com/seurakunta_tili';
  const found = findUrl(src);
  assert.equal(found.length, 2);
  assert.ok(found.every((f) => f.confidence === 0.9));
  assert.deepEqual(texts(src), ['facebook.com/seurakunta', 'instagram.com/seurakunta_tili']);
});

test('url: @handles are found at lower confidence', () => {
  const found = findUrl('kirjoita @esimerkki_tili');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.6);
});

test('url: a bare @ or an @ in the middle of a word is not a handle', () => {
  assert.equal(findUrl('hinta @ 5 euroa').length, 0);
  assert.equal(findUrl('a@').length, 0);
});

test('url: plain prose with no links is not flagged', () => {
  assert.equal(findUrl('Herra, siunaa meitä ja kaikkia.').length, 0);
});

test('url: analyze() maps a social link to the url type', () => {
  const src = 'Lue instagram.com/esimerkki';
  const { findings } = analyze(src);
  assert.deepEqual(findings.map((f) => f.type), ['url']);
});
