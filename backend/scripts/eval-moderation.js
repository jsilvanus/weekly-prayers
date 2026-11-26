#!/usr/bin/env node
/**
 * Evaluates the moderation analyzer against backend/test/moderation/dataset/dataset.jsonl.
 *
 * The analyzer is src/services/moderation/analyze.js exporting analyze(text) -> { findings }.
 * If that file does not exist yet, a stub analyzer (no findings) is used and a note is printed.
 *
 * Prints ids and counts only. Prayer text is never printed.
 *
 * Flags:
 *   --json                    machine-readable output on stdout
 *   --dataset <path>          alternative dataset file
 *   --min-recall-hard <n>     exit 1 if recall of any hard type (or overall / checksum-valid hetu+iban) < n
 *   --min-precision-hard <n>  exit 1 if precision of any hard type with findings < n
 *   --max-false-rejects <n>   exit 1 if more than n expected-clean items are rejected
 *   --min-recall-name <n>     exit 1 if person_name span recall < n
 *   --max-name-false-positive <n>  exit 1 if more than n expected-clean items get a person_name finding
 *
 * person_name has its own gates (above) and is otherwise reported separately. A name
 * finding never causes a reject, so it is not counted as a false reject.
 * Exit codes: 0 ok, 1 gate failed, 2 usage or load error.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(HERE, '..');
const DEFAULT_DATASET = resolve(BACKEND, 'test', 'moderation', 'dataset', 'dataset.jsonl');
const ANALYZER_PATH = resolve(BACKEND, 'src', 'services', 'moderation', 'analyze.js');

const HARD_TYPES = ['hetu', 'iban', 'card', 'phone', 'email', 'address', 'url', 'plate', 'dob'];
const SOFT_TYPES = ['person_name'];
const LANGS = ['fi', 'sv', 'en'];
const OUTCOMES = ['reject', 'mask', 'queue', 'clean'];
// Confusion rows. An expected "reject" is split by whether a rule can see a hard identifier in it.
const ROWS = ['reject (hard identifier)', 'reject (name + sensitive context)', 'mask', 'queue', 'clean'];
const OVERLAP_MIN = 0.5;
const HETU_CHECK = '0123456789ABCDEFHJKLMNPRSTUVWXY';

class UsageError extends Error {}

function rowKey(item) {
  if (item.expected !== 'reject') return item.expected;
  const hasHard = (Array.isArray(item.spans) ? item.spans : []).some((s) => HARD_TYPES.includes(s.type));
  return hasHard ? 'reject (hard identifier)' : 'reject (name + sensitive context)';
}

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const opts = {
    json: false,
    dataset: DEFAULT_DATASET,
    minRecallHard: null,
    minPrecisionHard: null,
    maxFalseRejects: null,
    minRecallName: null,
    maxNameFalsePositive: null,
  };
  const numeric = (name, raw) => {
    const n = Number(raw);
    if (raw === undefined || raw === '' || !Number.isFinite(n)) throw new UsageError(`${name} needs a number`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1);
    const valueOf = () => {
      if (inline !== undefined) return inline;
      i++;
      return argv[i];
    };
    switch (name) {
      case '--json':
        opts.json = true;
        break;
      case '--dataset':
        opts.dataset = resolve(String(valueOf() ?? ''));
        break;
      case '--min-recall-hard':
        opts.minRecallHard = numeric(name, valueOf());
        break;
      case '--min-precision-hard':
        opts.minPrecisionHard = numeric(name, valueOf());
        break;
      case '--max-false-rejects':
        opts.maxFalseRejects = numeric(name, valueOf());
        break;
      case '--min-recall-name':
        opts.minRecallName = numeric(name, valueOf());
        break;
      case '--max-name-false-positive':
        opts.maxNameFalsePositive = numeric(name, valueOf());
        break;
      default:
        throw new UsageError(`unknown flag ${name}`);
    }
  }
  return opts;
}

// ---------------------------------------------------------------- data + analyzer
function loadDataset(path) {
  const items = [];
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((line, idx) => {
      if (!line.trim()) return;
      try {
        items.push(JSON.parse(line));
      } catch {
        throw new Error(`dataset line ${idx + 1} is not valid JSON`);
      }
    });
  return items;
}

async function loadAnalyzer() {
  if (!existsSync(ANALYZER_PATH)) {
    return {
      analyze: () => ({ findings: [] }),
      source: 'stub',
      note: 'src/services/moderation/analyze.js not found; using a stub analyzer that returns no findings. Numbers are the zero-detection baseline.',
    };
  }
  const mod = await import(pathToFileURL(ANALYZER_PATH).href);
  if (typeof mod.analyze !== 'function') throw new Error('analyze.js does not export analyze(text)');
  return { analyze: mod.analyze, source: 'src/services/moderation/analyze.js', note: null };
}

// ---------------------------------------------------------------- checksums (for recall on valid values)
function hetuChecksumOk(value) {
  const m = /^(\d{6})[+\-A](\d{3})([0-9A-Y])$/.exec(value);
  if (!m) return false;
  return HETU_CHECK[Number(m[1] + m[2]) % 31] === m[3];
}

function ibanChecksumOk(value) {
  const s = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let r = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    r = code >= 65 && code <= 90 ? (r * 100 + (code - 55)) % 97 : (r * 10 + (code - 48)) % 97;
  }
  return r === 1;
}

function checksumValid(type, value) {
  if (type === 'hetu') return hetuChecksumOk(value);
  if (type === 'iban') return ibanChecksumOk(value);
  return null;
}

// ---------------------------------------------------------------- matching
function normalizeFindings(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f) => f && typeof f.type === 'string' && Number.isInteger(f.start) && Number.isInteger(f.end));
}

// Greedy one-to-one matching. A finding hits an expected span when the types are equal and
// the overlap covers at least OVERLAP_MIN of the expected span.
function matchSpans(expected, findings) {
  const matchedExpected = new Array(expected.length).fill(false);
  const usedFinding = new Array(findings.length).fill(false);
  expected.forEach((e, ei) => {
    let best = -1;
    let bestOverlap = 0;
    findings.forEach((f, fi) => {
      if (usedFinding[fi] || f.type !== e.type) return;
      const overlap = Math.max(0, Math.min(e.end, f.end) - Math.max(e.start, f.start));
      if (overlap / (e.end - e.start) >= OVERLAP_MIN && overlap > bestOverlap) {
        best = fi;
        bestOverlap = overlap;
      }
    });
    if (best !== -1) {
      usedFinding[best] = true;
      matchedExpected[ei] = true;
    }
  });
  return { matchedExpected, usedFinding };
}

const emptyCounts = () => ({ expected: 0, matched: 0, findings: 0, matchedFindings: 0 });
const ratio = (num, den) => (den > 0 ? num / den : null);

// ---------------------------------------------------------------- evaluation
async function evaluate(items, analyzer) {
  const perType = {};
  const ensure = (t) => (perType[t] ??= emptyCounts());
  [...HARD_TYPES, ...SOFT_TYPES].forEach(ensure);

  const perLang = {};
  for (const l of LANGS) perLang[l] = { items: 0, hardExpected: 0, hardMatched: 0, hardFindings: 0, hardMatchedFindings: 0 };

  const confusion = {};
  for (const r of ROWS) confusion[r] = { reject: 0, 'no-hard-finding': 0 };

  const falseRejects = [];
  const nameFalsePositives = [];
  const checksum = { hetu: { total: 0, matched: 0 }, iban: { total: 0, matched: 0 } };
  const analyzerErrors = [];
  const outcomeCounts = {};
  for (const r of ROWS) outcomeCounts[r] = 0;

  for (const item of items) {
    const lang = perLang[item.lang] ? item.lang : null;
    if (lang) perLang[lang].items++;
    if (OUTCOMES.includes(item.expected)) outcomeCounts[rowKey(item)]++;

    let findings = [];
    try {
      const result = await analyzer.analyze(item.text);
      findings = normalizeFindings(result?.findings);
    } catch {
      analyzerErrors.push(item.id);
    }

    const spans = Array.isArray(item.spans) ? item.spans : [];
    const { matchedExpected, usedFinding } = matchSpans(spans, findings);

    spans.forEach((s, i) => {
      const c = ensure(s.type);
      c.expected++;
      if (matchedExpected[i]) c.matched++;
      if (lang && HARD_TYPES.includes(s.type)) {
        perLang[lang].hardExpected++;
        if (matchedExpected[i]) perLang[lang].hardMatched++;
      }
      if (checksum[s.type]) {
        const valid = checksumValid(s.type, item.text.slice(s.start, s.end));
        if (valid) {
          checksum[s.type].total++;
          if (matchedExpected[i]) checksum[s.type].matched++;
        }
      }
    });

    findings.forEach((f, i) => {
      const c = ensure(f.type);
      c.findings++;
      if (usedFinding[i]) c.matchedFindings++;
      if (lang && HARD_TYPES.includes(f.type)) {
        perLang[lang].hardFindings++;
        if (usedFinding[i]) perLang[lang].hardMatchedFindings++;
      }
    });

    const predictedReject = findings.some((f) => HARD_TYPES.includes(f.type));
    const row = rowKey(item);
    if (confusion[row]) {
      confusion[row][predictedReject ? 'reject' : 'no-hard-finding']++;
    }
    if (item.expected === 'clean' && predictedReject) falseRejects.push(item.id);
    if (item.expected === 'clean' && findings.some((f) => f.type === 'person_name')) nameFalsePositives.push(item.id);
  }

  // Aggregate hard-type numbers.
  const hardTotals = HARD_TYPES.reduce(
    (acc, t) => {
      acc.expected += perType[t].expected;
      acc.matched += perType[t].matched;
      acc.findings += perType[t].findings;
      acc.matchedFindings += perType[t].matchedFindings;
      return acc;
    },
    emptyCounts(),
  );

  return {
    items: items.length,
    outcomeCounts,
    perType,
    hardTotals,
    perLang,
    confusion,
    falseRejects,
    nameFalsePositives,
    checksum,
    analyzerErrors,
  };
}

function gate(result, opts) {
  const failures = [];
  if (opts.minRecallHard !== null) {
    for (const t of HARD_TYPES) {
      const c = result.perType[t];
      const r = ratio(c.matched, c.expected);
      if (r !== null && r < opts.minRecallHard - 1e-9) failures.push(`recall ${t} ${fmt(r)} < ${opts.minRecallHard}`);
    }
    const overall = ratio(result.hardTotals.matched, result.hardTotals.expected);
    if (overall !== null && overall < opts.minRecallHard - 1e-9) failures.push(`recall hard-overall ${fmt(overall)} < ${opts.minRecallHard}`);
    for (const t of ['hetu', 'iban']) {
      const c = result.checksum[t];
      const r = ratio(c.matched, c.total);
      if (r !== null && r < opts.minRecallHard - 1e-9) failures.push(`recall checksum-valid ${t} ${fmt(r)} < ${opts.minRecallHard}`);
    }
  }
  if (opts.minPrecisionHard !== null) {
    for (const t of HARD_TYPES) {
      const c = result.perType[t];
      const p = ratio(c.matchedFindings, c.findings);
      if (p !== null && p < opts.minPrecisionHard - 1e-9) failures.push(`precision ${t} ${fmt(p)} < ${opts.minPrecisionHard}`);
    }
  }
  if (opts.maxFalseRejects !== null && result.falseRejects.length > opts.maxFalseRejects) {
    failures.push(`false rejects ${result.falseRejects.length} > ${opts.maxFalseRejects}`);
  }
  if (opts.minRecallName !== null) {
    const c = result.perType.person_name;
    const r = ratio(c.matched, c.expected);
    if (r !== null && r < opts.minRecallName - 1e-9) failures.push(`recall person_name ${fmt(r)} < ${opts.minRecallName}`);
  }
  if (opts.maxNameFalsePositive !== null && result.nameFalsePositives.length > opts.maxNameFalsePositive) {
    failures.push(`name false positives ${result.nameFalsePositives.length} > ${opts.maxNameFalsePositive}`);
  }
  return { passed: failures.length === 0, failures };
}

// ---------------------------------------------------------------- output
const fmt = (r) => (r === null ? 'n/a' : `${(r * 100).toFixed(1)}%`);
const pad = (v, w) => String(v).padEnd(w);
const rpad = (v, w) => String(v).padStart(w);

function renderText(report) {
  const lines = [];
  lines.push(`Moderation eval: ${report.items} items from ${report.dataset}`);
  lines.push(`Analyzer: ${report.analyzer}`);
  if (report.note) lines.push(`NOTE: ${report.note}`);
  lines.push(`Outcomes (expected): ${ROWS.map((r) => `${r}=${report.outcomeCounts[r]}`).join(' ')}`);
  lines.push('');
  lines.push('Per span type (hard types and person_name are gated by their own flags)');
  lines.push(`${pad('type', 12)}${rpad('expected', 9)}${rpad('matched', 9)}${rpad('recall', 9)}${rpad('findings', 10)}${rpad('precision', 11)}`);
  for (const t of [...HARD_TYPES, ...SOFT_TYPES]) {
    const c = report.perType[t];
    const label = SOFT_TYPES.includes(t) ? `${t}*` : t;
    lines.push(
      `${pad(label, 12)}${rpad(c.expected, 9)}${rpad(c.matched, 9)}${rpad(fmt(ratio(c.matched, c.expected)), 9)}${rpad(c.findings, 10)}${rpad(fmt(ratio(c.matchedFindings, c.findings)), 11)}`,
    );
  }
  const h = report.hardTotals;
  lines.push(`${pad('hard-all', 12)}${rpad(h.expected, 9)}${rpad(h.matched, 9)}${rpad(fmt(ratio(h.matched, h.expected)), 9)}${rpad(h.findings, 10)}${rpad(fmt(ratio(h.matchedFindings, h.findings)), 11)}`);
  lines.push('* person_name: gated by --min-recall-name / --max-name-false-positive. Dataset names may be in the matcher lists, so recall here is optimistic.');
  lines.push('');
  lines.push('Per language (hard types)');
  lines.push(`${pad('lang', 6)}${rpad('items', 7)}${rpad('hard exp', 10)}${rpad('matched', 9)}${rpad('recall', 9)}${rpad('findings', 10)}${rpad('precision', 11)}`);
  for (const l of LANGS) {
    const p = report.perLang[l];
    lines.push(
      `${pad(l, 6)}${rpad(p.items, 7)}${rpad(p.hardExpected, 10)}${rpad(p.hardMatched, 9)}${rpad(fmt(ratio(p.hardMatched, p.hardExpected)), 9)}${rpad(p.hardFindings, 10)}${rpad(fmt(ratio(p.hardMatchedFindings, p.hardFindings)), 11)}`,
    );
  }
  lines.push('');
  lines.push('Outcome confusion (expected rows x predicted columns; predicted reject = any hard finding)');
  lines.push(`${pad('expected', 32)}${rpad('reject', 9)}${rpad('no-hard-finding', 18)}`);
  for (const r of ROWS) {
    lines.push(`${pad(r, 32)}${rpad(report.confusion[r].reject, 9)}${rpad(report.confusion[r]['no-hard-finding'], 18)}`);
  }
  lines.push('');
  lines.push(`False rejects among expected-clean items: ${report.falseRejects.length}`);
  if (report.falseRejects.length) lines.push(`  ids: ${report.falseRejects.join(', ')}`);
  lines.push(`Name false positives among expected-clean items: ${report.nameFalsePositives.length} of ${report.outcomeCounts.clean ?? 0}`);
  if (report.nameFalsePositives.length) lines.push(`  ids: ${report.nameFalsePositives.join(', ')}`);
  lines.push('');
  lines.push('Checksum-valid recall');
  for (const t of ['hetu', 'iban']) {
    const c = report.checksum[t];
    lines.push(`  ${pad(t, 6)} valid spans ${c.total}, matched ${c.matched}, recall ${fmt(ratio(c.matched, c.total))}`);
  }
  if (report.analyzerErrors.length) {
    lines.push('');
    lines.push(`Analyzer errors (treated as no findings): ${report.analyzerErrors.length}`);
    lines.push(`  ids: ${report.analyzerErrors.join(', ')}`);
  }
  lines.push('');
  if (report.gate.failures.length === 0 && report.gate.enabled) lines.push('Gates: PASS');
  else if (report.gate.failures.length) {
    lines.push('Gates: FAIL');
    for (const f of report.gate.failures) lines.push(`  - ${f}`);
  } else lines.push('Gates: none requested');
  return lines.join('\n');
}

// ---------------------------------------------------------------- main
async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`usage error: ${err.message}`);
    console.error('flags: --json --dataset <path> --min-recall-hard <n> --min-precision-hard <n> --max-false-rejects <n> --min-recall-name <n> --max-name-false-positive <n>');
    return 2;
  }

  let items;
  let analyzer;
  try {
    items = loadDataset(opts.dataset);
    analyzer = await loadAnalyzer();
  } catch (err) {
    console.error(`load error: ${err.message}`);
    return 2;
  }

  const result = await evaluate(items, analyzer);
  const gateEnabled = [opts.minRecallHard, opts.minPrecisionHard, opts.maxFalseRejects, opts.minRecallName, opts.maxNameFalsePositive]
    .some((v) => v !== null);
  const g = gate(result, opts);
  const report = {
    dataset: opts.dataset.replace(BACKEND + '/', ''),
    analyzer: analyzer.source,
    note: analyzer.note,
    ...result,
    gate: { enabled: gateEnabled, passed: g.passed, failures: g.failures },
  };

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderText(report));
  }
  return gateEnabled && !g.passed ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`eval failed: ${err.message}`);
    process.exitCode = 2;
  },
);
