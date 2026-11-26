#!/usr/bin/env node
/**
 * Builds src/services/moderation/data/names.json for the moderation name matcher.
 *
 * Inputs (all optional except the seed, which is always read):
 *   scripts/moderation-names/seed.json   hand-made lists (firstFi, firstSvEn, lastFi,
 *                                        ambiguous). Lowercase. Not a complete list.
 *   --first <csv>   DVV first-name statistics as CSV (see below)
 *   --last <csv>    DVV surname statistics as CSV
 *   --min-count <n> keep DVV names with at least n bearers (default 200)
 *   --out <path>    output file (default src/services/moderation/data/names.json)
 *
 * DVV CSV format expected: a header row; one column whose header contains "nimi" or
 * "name" (the name), and one whose header contains "määrä", "lukumäärä", "count" or
 * "bearers" (the number of bearers). Separator ';' or ','. Only population counts are
 * read; no individual-level data is involved. A CSV-converted XLSX works the same way.
 * NOTE: this parser has not been run against a real DVV file (the download was blocked
 * when the list was first built). Check the first output before relying on it.
 *
 * Output is deterministic: sorted, de-duplicated, lowercase NFC. No dependencies.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(HERE, '..');
const SEED = resolve(HERE, 'moderation-names', 'seed.json');
const DEFAULT_OUT = resolve(BACKEND, 'src', 'services', 'moderation', 'data', 'names.json');

function parseArgs(argv) {
  const o = { first: null, last: null, minCount: 200, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    if (a === '--first') o.first = resolve(v());
    else if (a === '--last') o.last = resolve(v());
    else if (a === '--min-count') o.minCount = Number(v());
    else if (a === '--out') o.out = resolve(v());
    else throw new Error(`unknown argument ${a}`);
  }
  if (!Number.isFinite(o.minCount) || o.minCount < 0) throw new Error('--min-count needs a number');
  return o;
}

/** Minimal CSV reader (no quoted-newline support). Returns [{name, count}]. */
function readCounts(path, minCount) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^﻿/, ''));
  const nameIdx = header.findIndex((h) => h.includes('nimi') || h.includes('name'));
  const countIdx = header.findIndex((h) => /määrä|lukumäärä|count|bearers/.test(h));
  if (nameIdx < 0 || countIdx < 0) throw new Error(`${path}: header needs a name column and a count column`);
  const out = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const name = (cells[nameIdx] || '').normalize('NFC');
    const count = Number(String(cells[countIdx] || '').replace(/\s/g, '').replace(',', '.'));
    if (!name || !Number.isFinite(count) || count < minCount) continue;
    if (!/^\p{L}[\p{L}\- ]*$/u.test(name)) continue;
    out.push(name.toLocaleLowerCase('fi'));
  }
  return out;
}

const uniqSorted = (xs) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'fi'));

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const seed = JSON.parse(readFileSync(SEED, 'utf8'));
  const dvvFirst = opts.first ? readCounts(opts.first, opts.minCount) : [];
  const dvvLast = opts.last ? readCounts(opts.last, opts.minCount) : [];

  const ambiguous = uniqSorted(seed.ambiguous.map((w) => w.normalize('NFC')));
  const first = uniqSorted([...seed.firstFi, ...seed.firstSvEn, ...ambiguous, ...dvvFirst].map((w) => w.normalize('NFC')));
  const last = uniqSorted([...seed.lastFi, ...dvvLast].map((w) => w.normalize('NFC')));

  const out = {
    format: 'moderation-names/1',
    complete: false,
    sources: [
      'seed: hand-made lists in scripts/moderation-names/seed.json (not a statistical source)',
      ...(opts.first ? [`dvv first names >= ${opts.minCount} bearers: ${opts.first.split('/').pop()}`] : []),
      ...(opts.last ? [`dvv surnames >= ${opts.minCount} bearers: ${opts.last.split('/').pop()}`] : []),
    ],
    first,
    last,
    ambiguous,
  };

  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, JSON.stringify(out) + '\n', 'utf8');
  console.log(`wrote ${opts.out}: first=${first.length} last=${last.length} ambiguous=${ambiguous.length}`);
}

try {
  main();
} catch (err) {
  console.error(`build-name-list failed: ${err.message}`);
  process.exitCode = 2;
}
