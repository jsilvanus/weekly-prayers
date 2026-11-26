import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { findNames } from '../../src/services/moderation/names.js';
import { analyze } from '../../src/services/moderation/analyze.js';
import { decide, REJECT_CONFIDENCE } from '../../src/services/moderation/policy.js';

// All strings are synthetic or public-domain-style examples. Names are common forms only.

/** Returns the matched substrings of findNames(text), in order. */
const names = (text) => findNames(text).map((f) => text.slice(f.start, f.end));
const confidences = (text) => findNames(text).map((f) => f.confidence);

describe('names: finnish inflection', () => {
  test('case endings and consonant gradation resolve to the base name', () => {
    assert.deepEqual(names('Pyydämme Tuijan parempaa oloa.'), ['Tuijan']);
    assert.deepEqual(names('Rukoilemme Kaisalle ja perheelle.'), ['Kaisalle']);
    assert.deepEqual(names('Siunatkaa Juhan perhettä.'), ['Juhan']);
    assert.deepEqual(names('Pyydämme Hannulle lohtua.'), ['Hannulle']);
    // Pekka -> Pekan / Pekalle (kk -> k gradation) and Matti -> Matin (tt -> t).
    assert.deepEqual(names('Rukoilemme Pekan puolesta.'), ['Pekan']);
    assert.deepEqual(names('Pyydämme lohtua Pekalle.'), ['Pekalle']);
    assert.deepEqual(names('Rukoilemme Matin puolesta.'), ['Matin']);
  });

  test('surname gradation: Virtanen -> Virtasen', () => {
    assert.deepEqual(names('Rukoilemme Virtasen perheen puolesta.'), ['Virtasen']);
  });

  test('a single-name inflected hit is 0.6, a nominative mid-sentence hit is 0.6', () => {
    assert.deepEqual(confidences('Pyydämme Tuijan parempaa oloa.'), [0.6]);
  });
});

describe('names: swedish and english', () => {
  test('swedish genitive -s', () => {
    assert.deepEqual(names('Tack för Gustavs hälsa.'), ['Gustavs']);
    assert.deepEqual(names('Be för Karins familj.'), ['Karins']);
  });

  test('english possessive is not part of the name token', () => {
    assert.deepEqual(names("Pray for Victoria's children today."), ['Victoria']);
  });

  test('first name plus surname in english and swedish is one finding at 0.8', () => {
    const en = 'Please pray for Robert Hale after the incident.';
    assert.deepEqual(names(en), ['Robert Hale']);
    assert.deepEqual(confidences(en), [0.8]);
    const sv = 'Min mamma Johan Lindqvist har gått bort.';
    assert.deepEqual(names(sv), ['Johan Lindqvist']);
  });
});

describe('names: hyphenated names', () => {
  test('hyphenated first name is one token', () => {
    assert.deepEqual(names('Rukoilemme Anna-Liisan puolesta.'), ['Anna-Liisan']);
  });

  test('hyphenated surname with a first name is one pair', () => {
    assert.deepEqual(names('Kaisa Virtanen-Korhonen tuli kirkkoon.'), ['Kaisa Virtanen-Korhonen']);
  });
});

describe('names: stoplist of ordinary words that are also names', () => {
  test('sentence-initial ordinary name word alone stays clean', () => {
    assert.deepEqual(names('Toivo on tärkeää.'), []);
    assert.deepEqual(names('Anna meille rauha.'), []);
  });

  test('ordinary name word alone, mid-sentence, stays clean', () => {
    assert.deepEqual(names('Pyydämme Toivon puolesta.'), []);
    assert.deepEqual(names('Pyydämme Ilonan ja Aarteen puolesta, jos voitte.'), []);
    assert.deepEqual(names('Pray for Hope and Grace this week.'), []);
  });

  test('lowercase ordinary words are never candidates', () => {
    assert.deepEqual(names('rukoilkaa rauhan puolesta'), []);
    assert.deepEqual(names('we pray for hope and grace'), []);
  });

  test('ordinary name word next to a real surname is flagged as a pair', () => {
    assert.deepEqual(names('Toivo Lahtinen rukoilee seurakunnan puolesta.'), ['Toivo Lahtinen']);
    assert.deepEqual(names('Pray for Hope Lahtinen today.'), ['Hope Lahtinen']);
  });
});

describe('names: biblical names, titles and church names are not flagged', () => {
  test('allowlisted biblical names and titles', () => {
    assert.deepEqual(names('Rukoilemme Jeesuksen, Marian ja Paavalin puolesta.'), []);
    assert.deepEqual(names('Jeesus, Maria, Paavali.'), []);
    assert.deepEqual(names('Herra, siunaa meitä. Jumalan rauha.'), []);
    assert.deepEqual(names('Piispa Kaisa Mäkinen vierailee'), ['Kaisa Mäkinen']);
  });

  test('church dedications and bible references', () => {
    assert.deepEqual(names('Sankt Olofs kyrka är öppen.'), []);
    assert.deepEqual(names("Service at St. Peter's church is open."), []);
    assert.deepEqual(names('Luemme John 3:16 tänään.'), []);
  });

  test('ordinary capitalised sentence starts are clean', () => {
    assert.deepEqual(names('Kiitos, Jumala. Siunaa meitä.'), []);
  });
});

describe('names: cues and confidence', () => {
  test('cue words raise a single name from 0.6 to 0.7', () => {
    assert.deepEqual(confidences('Lapseni Pekka aloittaa koulun.'), [0.7]);
    assert.deepEqual(confidences('Sitä kutsutaan nimeltä Pekka.'), [0.7]);
    assert.deepEqual(confidences('Min vän Tuija kävi luonani.'), [0.7]);
  });

  test('a cue on a pair stays at the 0.8 cap', () => {
    assert.deepEqual(confidences('Äitini Pekka Heikkilä on sairaalassa.'), [0.8]);
  });

  test('every name finding is below the reject threshold', () => {
    const texts = [
      'Pyydämme Tuijan parempaa oloa.',
      'Piispa Kaisa Mäkinen vierailee.',
      'Lapseni Pekka aloittaa koulun.',
      'Pray for Robert Hale and Helen Carter.',
    ];
    for (const t of texts) {
      for (const c of confidences(t)) {
        assert.ok([0.6, 0.7, 0.8].includes(c), `confidence ${c} in ${t}`);
        assert.ok(c < REJECT_CONFIDENCE, `confidence ${c} must stay below reject`);
      }
    }
  });
});

describe('names: offsets refer to the original text', () => {
  test('zero-width characters before a name do not shift the span', () => {
    const src = 'Pyydämme​ Pekan puolesta.';
    const f = findNames(src);
    assert.equal(f.length, 1);
    assert.equal(src.slice(f[0].start, f[0].end), 'Pekan');
  });

  test('a finding has exactly the documented shape', () => {
    const [f] = findNames('Pyydämme Tuijan oloa.');
    assert.deepEqual(Object.keys(f).sort(), ['confidence', 'end', 'start', 'type']);
    assert.equal(f.type, 'person_name');
  });
});

describe('names: integration with analyze() and policy', () => {
  test('analyze() includes person_name findings', () => {
    const src = 'Rukoilemme Kaisa Mäkisen puolesta.';
    const { findings } = analyze(src);
    assert.ok(findings.some((f) => f.type === 'person_name'));
  });

  test('a hard finding wins over an overlapping name', () => {
    const src = 'Kirjoita Pekka.Virtanen@example.fi';
    const { findings } = analyze(src);
    assert.deepEqual(findings.map((f) => f.type), ['email']);
  });

  test('name-only text is reviewed, never rejected', () => {
    const r = decide('Pyydämme rukousta Kaisa Mäkiselle ja Tuijan perheelle.');
    assert.equal(r.decision, 'review');
    assert.ok(r.internalFindings.every((f) => f.type === 'person_name' && f.confidence < REJECT_CONFIDENCE));
    assert.ok(r.redactedSuggestion.includes('[nimi]'));
    assert.ok(!r.redactedSuggestion.includes('Tuijan'));
  });

  test('a name with a hard identifier is still rejected by the hard rule', () => {
    const r = decide('Pekka pyytää rukousta. Hetu 260751-490C.');
    assert.equal(r.decision, 'reject');
  });
});
