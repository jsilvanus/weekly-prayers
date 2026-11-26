import test from 'node:test';
import assert from 'node:assert/strict';
import { findAddress } from '../../src/services/moderation/rules/address.js';
import { analyze } from '../../src/services/moderation/analyze.js';

function spans(src) {
  return findAddress(src).map((f) => src.slice(f.start, f.end));
}

test('address: Finnish street with stairwell letter and apartment number', () => {
  assert.deepEqual(spans('asuu Hämeenkatu 5 A 3 Riihimäellä'), ['Hämeenkatu 5 A 3']);
});

test('address: Finnish suffixes -katu, -tie, -kuja, -polku, -tori', () => {
  for (const v of ['Kuusitie 12', 'Mäntykuja 4', 'Koivupolku 7', 'Kauppatori 2', 'Pääkatu 10 b']) {
    assert.equal(findAddress(v).length, 1, `should match ${v}`);
  }
});

test('address: inflected Finnish street forms', () => {
  assert.equal(findAddress('Hämeenkadulla 5').length, 1);
  assert.equal(findAddress('Kuusitiellä 3 A 2').length, 1);
});

test('address: lowercase input is matched', () => {
  assert.equal(findAddress('asun hämeenkatu 5 a 3').length, 1);
});

test('address: Swedish suffixes -gatan, -vägen, -gränd', () => {
  assert.equal(findAddress('Storgatan 3').length, 1);
  assert.equal(findAddress('Sveavägen 12 B 4').length, 1);
  assert.equal(findAddress('Kyrkogränd 2').length, 1);
});

test('address: English "street" and "road"', () => {
  assert.equal(findAddress('Main Street 5').length, 1);
  assert.equal(findAddress('Church Road 12 3').length, 1);
});

test('address: street word without a house number is not flagged', () => {
  assert.equal(findAddress('Hämeenkatu on kaunis').length, 0);
});

test('address: a number longer than three digits is not a house number', () => {
  assert.equal(findAddress('Hämeenkatu 12345').length, 0);
});

test('address: ordinary phrases with tie/katu are not flagged without a number', () => {
  assert.equal(findAddress('Jumalan tie on valo').length, 0);
  assert.equal(findAddress('Jumalan tie 5 kohdasta').length, 0);
});

test('address: a space before the suffix does not join words into a street', () => {
  // "Jumalan tie" has a space, so it is not one word ending in -tie.
  assert.equal(findAddress('Jumalan tie 5').length, 0);
});

test('address: postcode with a capitalised city is flagged with lower confidence', () => {
  const found = findAddress('Osoite 00100 Helsinki');
  assert.equal(found.length, 1);
  assert.equal(found[0].confidence, 0.6);
});

test('address: postcode followed by an allowlisted name is skipped', () => {
  assert.equal(findAddress('siunaa 12345 Herra').length, 0);
  assert.equal(findAddress('siunaa 12345 Jumalan').length, 0);
});

test('address: postcode without a following capitalised word is not flagged', () => {
  assert.equal(findAddress('luku 12345 on suuri').length, 0);
});

test('address: analyze() reports the whole street address as one finding', () => {
  const src = 'Hämeenkatu 5 A 3, 13100 Riihimäki';
  const { findings } = analyze(src);
  assert.deepEqual(findings.map((f) => f.type), ['address']);
  assert.equal(src.slice(findings[0].start, findings[0].end), 'Hämeenkatu 5 A 3, 13100 Riihimäki');
});

test('address: English house-number-first addresses cover number and street name', () => {
  assert.deepEqual(spans('Our home is at 166 Mill Road, and we'), ['166 Mill Road']);
  for (const v of ['66 Hill Avenue', '188 Mill Avenue', '33 Hill Avenue', '4 Oak Close', '9 River Lane', '2 Maple Way', '12 Old Mill Drive']) {
    assert.equal(findAddress(v).length, 1, `should match ${v}`);
    assert.equal(spans(v)[0], v);
  }
});

test('address: English name-first form with a house number after the street word', () => {
  assert.deepEqual(spans('We live on Mill Avenue 33 now'), ['Mill Avenue 33']);
});

test('address: English form negatives (no number, lower-case prose, number without street word)', () => {
  assert.equal(findAddress('Mill Road is quiet').length, 0);
  assert.equal(findAddress('psalmi 23 Hill').length, 0);
  assert.equal(findAddress('the road 5 times').length, 0);
  assert.equal(findAddress('Psalm 23 and Hill').length, 0);
  assert.equal(findAddress('Herra on valo ja rauha, aamen.').length, 0);
});

test('address: Finnish street with postcode and city is one finding covering the whole address', () => {
  assert.deepEqual(spans('Osoitteeni on Koivutie 42 A, 33100 Tampere, ja'), ['Koivutie 42 A, 33100 Tampere']);
  assert.deepEqual(spans('Min adress är Ekgatan 32, 00100 Helsingfors och'), ['Ekgatan 32, 00100 Helsingfors']);
});

test('address: Swedish street names that are short before the suffix are matched', () => {
  assert.deepEqual(spans('Vårt hem ligger på Ekvägen 41, 01300 Vanda'), ['Ekvägen 41, 01300 Vanda']);
});
