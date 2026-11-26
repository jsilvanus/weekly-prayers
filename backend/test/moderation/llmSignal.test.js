import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { decide, applyLlmSignal } from '../../src/services/moderation/index.js';

// Synthetic texts. The rules and the LLM signal are checked without a network.

const HETU_TEXT = 'Hetuni on 260751-490C, ja pyydän rukousta.';
const REVIEW_TEXT = 'Pyydämme rukousta, auto ABC 12 3 on rikki.';
const CLEAN_TEXT = 'Rukoilemme sairaiden puolesta ja Hengen johdatusta.';
const FLAG = { flagged: true, reasons: ['name', 'relationship_detail'] };

describe('applyLlmSignal', () => {
  test('a rule reject is kept unchanged', () => {
    const v = decide(HETU_TEXT, 'fi');
    assert.equal(v.decision, 'reject');
    const out = applyLlmSignal(v, FLAG, HETU_TEXT);
    assert.deepEqual(out, v);
  });

  test('null or unflagged signal leaves the verdict unchanged', () => {
    const v = decide(CLEAN_TEXT, 'fi');
    assert.equal(applyLlmSignal(v, null, CLEAN_TEXT), v);
    assert.equal(applyLlmSignal(v, { flagged: false, reasons: ['name'] }, CLEAN_TEXT), v);
  });

  test('flagged clean text becomes review with the original text kept as the suggestion', () => {
    const v = decide(CLEAN_TEXT, 'fi');
    assert.equal(v.decision, 'ok');
    const out = applyLlmSignal(v, FLAG, CLEAN_TEXT);
    assert.equal(out.decision, 'review');
    assert.deepEqual(out.reasons, { llm_flag: 1, llm_name: 1, llm_relationship_detail: 1 });
    assert.equal(out.redactedSuggestion, CLEAN_TEXT);
    assert.deepEqual(out.findings, []);
  });

  test('flagged text with rule review keeps the rule redaction and adds the llm reasons', () => {
    const v = decide(REVIEW_TEXT, 'fi');
    assert.equal(v.decision, 'review');
    const out = applyLlmSignal(v, { flagged: true, reasons: ['location'] }, REVIEW_TEXT);
    assert.equal(out.decision, 'review');
    assert.equal(out.redactedSuggestion, v.redactedSuggestion);
    assert.equal(out.reasons.llm_flag, 1);
    assert.equal(out.reasons.llm_location, 1);
    for (const [k, n] of Object.entries(v.reasons)) assert.equal(out.reasons[k], n);
  });

  test('does not mutate the input verdict', () => {
    const v = decide(CLEAN_TEXT, 'fi');
    const before = JSON.stringify(v);
    applyLlmSignal(v, FLAG, CLEAN_TEXT);
    assert.equal(JSON.stringify(v), before);
  });
});
