import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(HERE, 'dataset.jsonl');
const LANGS = new Set(['fi', 'sv', 'en']);
const OUTCOMES = new Set(['reject', 'mask', 'queue', 'clean']);
const TYPES = new Set([
  'hetu', 'iban', 'card', 'phone', 'email', 'address', 'url', 'plate', 'dob', 'person_name',
]);
const TARGET_SHARE = { fi: 0.45, sv: 0.25, en: 0.30 };

let cached;
function load() {
  if (cached) return cached;
  const lines = readFileSync(FILE, 'utf8').split('\n').filter((l) => l.trim() !== '');
  cached = lines.map((line, i) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`line ${i + 1} is not valid JSON`);
    }
  });
  return cached;
}

test('dataset file parses as JSONL with a reasonable size', () => {
  const items = load();
  assert.ok(items.length >= 350, `expected about 400 lines, got ${items.length}`);
});

test('every line has the required fields', () => {
  for (const it of load()) {
    assert.equal(typeof it.id, 'string', `id missing on ${JSON.stringify(it.id)}`);
    assert.ok(LANGS.has(it.lang), `bad lang on ${it.id}`);
    assert.equal(typeof it.text, 'string', `text missing on ${it.id}`);
    assert.ok(it.text.length > 0, `empty text on ${it.id}`);
    assert.ok(Array.isArray(it.spans), `spans not an array on ${it.id}`);
    assert.ok(OUTCOMES.has(it.expected), `bad expected on ${it.id}`);
  }
});

test('every span is well-formed and its slice is non-empty', () => {
  for (const it of load()) {
    for (const s of it.spans) {
      assert.ok(TYPES.has(s.type), `unknown span type ${s.type} on ${it.id}`);
      assert.ok(Number.isInteger(s.start) && Number.isInteger(s.end), `non-integer offsets on ${it.id}`);
      assert.ok(s.start >= 0 && s.end <= it.text.length, `span out of range on ${it.id}`);
      assert.ok(it.text.slice(s.start, s.end).length > 0, `empty span slice on ${it.id}`);
      assert.ok(s.end > s.start, `non-positive span on ${it.id}`);
    }
  }
});

test('ids are unique', () => {
  const items = load();
  assert.equal(new Set(items.map((it) => it.id)).size, items.length);
});

test('language split is roughly 45% fi, 25% sv, 30% en', () => {
  const items = load();
  for (const lang of LANGS) {
    const share = items.filter((it) => it.lang === lang).length / items.length;
    assert.ok(
      Math.abs(share - TARGET_SHARE[lang]) <= 0.08,
      `${lang} share ${share.toFixed(3)} is not near ${TARGET_SHARE[lang]}`,
    );
  }
});

test('at least 100 clean hard negatives (expected clean, no spans)', () => {
  const n = load().filter((it) => it.expected === 'clean' && it.spans.length === 0).length;
  assert.ok(n >= 100, `only ${n} clean hard negatives`);
});

test('spans do not overlap within an item', () => {
  for (const it of load()) {
    const sorted = [...it.spans].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i - 1].end <= sorted[i].start, `overlapping spans on ${it.id}`);
    }
  }
});
