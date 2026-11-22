import test from 'node:test';
import assert from 'node:assert';
import { getMeditationsList, getMeditationById } from '../src/services/meditationService.js';

test('Christian & Lutheran Meditations Service', async (t) => {
  await t.test('returns curated set of meditations including Lönnebo beads and Luther catechism', () => {
    const list = getMeditationsList();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 5, 'Should have at least 5 curated meditations');

    const ids = list.map((m) => m.id);
    assert.ok(ids.includes('lonnebo_beads'), 'Must include Martin Lönnebo beads');
    assert.ok(ids.includes('luther_wreath'), 'Must include Luther catechism wreath');
    assert.ok(ids.includes('jesus_prayer'), 'Must include Jesus prayer & breath prayer');
    assert.ok(ids.includes('lectio_divina'), 'Must include Lectio Divina');
    assert.ok(ids.includes('examen'), 'Must include Examen / Päivän katselmus');
  });

  await t.test('Lönnebo beads contains all 18 authentic pearls with prayers and colors', () => {
    const lonnebo = getMeditationById('lonnebo_beads');
    assert.ok(lonnebo);
    assert.strictEqual(lonnebo.beads.length, 18, 'Lönnebo prayer beads must contain exactly 18 beads');

    const firstBead = lonnebo.beads[0];
    assert.strictEqual(firstBead.name, 'Jumala-helmi');
    assert.strictEqual(firstBead.color, 'gold');
    assert.ok(firstBead.prayer.length > 0);

    const nightBead = lonnebo.beads.find((b) => b.color === 'black');
    assert.ok(nightBead, 'Must include black night bead');
    assert.strictEqual(nightBead.name, 'Yön helmi');

    const resBead = lonnebo.beads.find((b) => b.name === 'Ylösnousemuksen helmi');
    assert.ok(resBead, 'Must include resurrection bead');
  });

  await t.test('Luther catechism meditation contains 4-strand wreath methodology and examples', () => {
    const luther = getMeditationById('luther_wreath');
    assert.ok(luther);
    assert.strictEqual(luther.strands.length, 4, 'Must contain 4 strands (Opiksi, Kiitokseksi, Tunnustukseksi, Pyynnöksi)');
    assert.ok(luther.examples.length >= 2, 'Must have at least 2 worked examples');

    const firstEx = luther.examples[0];
    assert.strictEqual(firstEx.strands.length, 4);
  });
});
