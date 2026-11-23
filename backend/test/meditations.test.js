import test from 'node:test';
import assert from 'node:assert';
import { getMeditationsList, getMeditationById } from '../src/services/meditationService.js';
import { getEasterSunday, getFirstAdventSunday, getHolyDayForDate } from '../src/services/pyhapaivaService.js';
import { createMcpServer } from '../src/mcp/server.js';

test('Christian & Lutheran Meditations Service & Building Blocks', async (t) => {
  await t.test('returns curated set of meditations including Lönnebo beads, Luther catechism, and Children Advent moment', () => {
    const list = getMeditationsList();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 6, 'Should have at least 6 curated meditations');

    const ids = list.map((m) => m.id);
    assert.ok(ids.includes('lonnebo_beads'), 'Must include Martin Lönnebo beads');
    assert.ok(ids.includes('luther_wreath'), 'Must include Luther catechism wreath');
    assert.ok(ids.includes('jesus_prayer'), 'Must include Jesus prayer & breath prayer');
    assert.ok(ids.includes('lectio_divina'), 'Must include Lectio Divina');
    assert.ok(ids.includes('examen'), 'Must include Examen / Päivän katselmus');
    assert.ok(ids.includes('advent_children'), 'Must include Children Advent & Candle Moment');

    for (const m of list) {
      assert.ok(Array.isArray(m.blocks) && m.blocks.length > 0, `Meditation ${m.id} must have modular blocks array`);
    }
  });

  await t.test('Children Advent & Candle Moment contains interactive candle_lighting and children_story blocks', () => {
    const advent = getMeditationById('advent_children');
    assert.ok(advent);
    assert.ok(Array.isArray(advent.blocks));

    const candleBlock = advent.blocks.find((b) => b.type === 'candle_lighting');
    assert.ok(candleBlock, 'Must include candle_lighting block');
    assert.strictEqual(candleBlock.data.maxCandles, 4);
    assert.strictEqual(candleBlock.data.interactive, true);
    assert.strictEqual(candleBlock.data.candles.length, 4);

    const storyBlock = advent.blocks.find((b) => b.type === 'children_story');
    assert.ok(storyBlock, 'Must include children_story block');
    assert.ok(storyBlock.data.storyText.length > 0);
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

  await t.test('Pyhäpäivä service computes church year dates and returns readings', async () => {
    const easter2026 = getEasterSunday(2026);
    assert.strictEqual(easter2026.getMonth(), 3); // April (0-indexed)
    assert.strictEqual(easter2026.getDate(), 5);

    const advent2026 = getFirstAdventSunday(2026);
    assert.strictEqual(advent2026.getMonth(), 10); // November
    assert.strictEqual(advent2026.getDate(), 29);

    const holyDay = await getHolyDayForDate({ date: '2026-11-29', translation: 'KR92' });
    assert.ok(holyDay);
    assert.strictEqual(holyDay.date, '2026-11-29');
    assert.ok(holyDay.heading);
    assert.ok(holyDay.readings && holyDay.readings.gospel);
  });

  await t.test('MCP server registers construction tools for authorized staff and hides staff-only tools from public users', () => {
    const adminMcp = createMcpServer({ publicUrl: 'https://rukous.riihimaenseurakunta.fi', user: { id: '1', role: 'admin' } });
    const adminTools = Object.keys(adminMcp._registeredTools || {});
    assert.ok(adminTools.includes('get_today_devotion'));
    assert.ok(adminTools.includes('construct_devotion'));
    assert.ok(adminTools.includes('get_meditations'));
    assert.ok(adminTools.includes('construct_meditation'));
    assert.ok(adminTools.includes('get_liturgical_hours'));
    assert.ok(adminTools.includes('get_holy_day'));
    assert.ok(adminTools.includes('set_holy_day_override'));
    assert.ok(adminTools.includes('set_prayer_portal_lift'));
    assert.ok(adminTools.includes('get_pending_prayers'));
    assert.ok(adminTools.includes('update_parish_settings'));

    // Public / anonymous user must only see public tools
    const publicMcp = createMcpServer({ publicUrl: 'https://rukous.riihimaenseurakunta.fi', user: { id: 'anon', role: 'anonymous', isAnonymous: true } });
    const publicTools = Object.keys(publicMcp._registeredTools || {});
    assert.ok(publicTools.includes('get_current_prayers'));
    assert.ok(publicTools.includes('get_today_devotion'));
    assert.ok(publicTools.includes('get_meditations'));
    assert.ok(publicTools.includes('get_liturgical_hours'));
    assert.ok(publicTools.includes('get_holy_day'));
    assert.ok(!publicTools.includes('construct_devotion'), 'Public user must not see construct_devotion');
    assert.ok(!publicTools.includes('construct_meditation'), 'Public user must not see construct_meditation');
    assert.ok(!publicTools.includes('set_holy_day_override'), 'Public user must not see set_holy_day_override');
    assert.ok(!publicTools.includes('set_prayer_portal_lift'), 'Public user must not see set_prayer_portal_lift');
    assert.ok(!publicTools.includes('get_pending_prayers'), 'Public user must not see get_pending_prayers');
    assert.ok(!publicTools.includes('approve_prayer'), 'Public user must not see approve_prayer');
    assert.ok(!publicTools.includes('update_parish_settings'), 'Public user must not see update_parish_settings');
  });
});
