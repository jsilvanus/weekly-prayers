import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fetchLectionaryFromAnno, getNearestHourName } from '../src/services/annoService.js';
import { getBibleForDate } from '../src/services/bibleService.js';
import { getTodayDateString } from '../src/services/devotionService.js';
import { ROLE_RANK } from '../src/services/oidcService.js';

describe('EVL Kirkkokäsikirja Liturgies & Pieni rukoushetki', () => {
  it('returns all 5 authentic liturgies including Pieni rukoushetki', async () => {
    const { lectionary } = await fetchLectionaryFromAnno('2026-11-22');
    
    assert.ok(lectionary.morning, 'Should have Aamurukous (Laudes)');
    assert.ok(lectionary.noon, 'Should have Päivärukous (Seksti)');
    assert.ok(lectionary.evening, 'Should have Iltarukous (Vesper)');
    assert.ok(lectionary.night, 'Should have Yörukous (Kompletorio)');
    assert.ok(lectionary.small, 'Should have Pieni rukoushetki');
  });

  it('includes authentic EVL canticles (Benedictus, Magnificat, Nunc Dimittis)', async () => {
    const { lectionary } = await fetchLectionaryFromAnno('2026-11-22');

    // Laudes -> Benedictus
    assert.strictEqual(lectionary.morning.canticle?.name, 'Sakariaan kiitosvirsi (Benedictus)');
    assert.ok(lectionary.morning.canticle?.text.includes('Kiitetty olkoon Herra, Israelin Jumala'));

    // Vesper -> Magnificat
    assert.strictEqual(lectionary.evening.canticle?.name, 'Marian kiitosvirsi (Magnificat)');
    assert.ok(lectionary.evening.canticle?.text.includes('Minun sieluni ylistää Herran suuruutta'));

    // Kompletorio -> Nunc Dimittis
    assert.strictEqual(lectionary.night.canticle?.name, 'Simeonin kiitosvirsi (Nunc Dimittis)');
    assert.ok(lectionary.night.canticle?.text.includes('Herra, nyt sinä sallit palvelijasi lähteä rauhassa'));

    // Authentic ABC notation for canticles and antiphons
    assert.ok(lectionary.morning.canticle?.notation_abc?.includes('X:2'), 'Laudes canticle must have ABC notation');
    assert.ok(lectionary.evening.canticle?.notation_abc?.includes('X:4'), 'Vesper canticle must have ABC notation');
    assert.ok(lectionary.night.canticle?.notation_abc?.includes('X:5'), 'Kompletorio canticle must have ABC notation');
    assert.ok(lectionary.morning.antiphon_abc?.includes('X:1'), 'Laudes antiphon must have ABC notation');
  });

  it('includes intercessions configured for embedded parish prayer intentions', async () => {
    const { lectionary } = await fetchLectionaryFromAnno('2026-11-22');

    assert.strictEqual(lectionary.morning.intercessions?.hasParishIntentions, true);
    assert.strictEqual(lectionary.noon.intercessions?.hasParishIntentions, true);
    assert.strictEqual(lectionary.evening.intercessions?.hasParishIntentions, true);
    assert.strictEqual(lectionary.small.intercessions?.hasParishIntentions, true);
  });

  it('resolves nearest hour correctly based on time of day', () => {
    assert.strictEqual(getNearestHourName(7), 'morning');
    assert.strictEqual(getNearestHourName(12), 'noon');
    assert.strictEqual(getNearestHourName(18), 'evening');
    assert.strictEqual(getNearestHourName(22), 'night');
    assert.strictEqual(getNearestHourName(2), 'night');
  });

  it('getBibleForDate resolves safely without crashing and provides hours', async () => {
    const res = await getBibleForDate('2026-11-22');
    assert.ok(res);
    assert.ok(res.dailyVerse);
    assert.ok(res.dailyVerse.reference);
    assert.ok(res.liturgyOfTheHours);
    assert.ok(res.liturgyOfTheHours.morning);
    assert.ok(res.nearestHour);
  });
});

describe('Devotions (Hartaus) and User Roles', () => {
  it('formats current date correctly as YYYY-MM-DD', () => {
    const dateStr = getTodayDateString();
    assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('has devotion role configured with staff rank in OIDC role rank mapping', () => {
    assert.strictEqual(ROLE_RANK.devotion, 2);
    assert.strictEqual(ROLE_RANK.devotion, ROLE_RANK.worker);
  });
});
