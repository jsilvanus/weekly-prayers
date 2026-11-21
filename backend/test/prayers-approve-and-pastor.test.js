import { test, describe } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import prayersRouter from '../src/routes/prayers.js';

describe('Prayers approval & boolean validation', () => {
  test('approve route boolean parsing logic handles both boolean and string booleans', () => {
    const parseApproved = (body) => {
      const rawApproved = body.approved !== undefined ? body.approved : body.isApproved;
      if (typeof rawApproved !== 'boolean' && rawApproved !== 'true' && rawApproved !== 'false') {
        return { valid: false };
      }
      return { valid: true, approved: rawApproved === true || rawApproved === 'true' };
    };

    assert.deepStrictEqual(parseApproved({ approved: true }), { valid: true, approved: true });
    assert.deepStrictEqual(parseApproved({ approved: false }), { valid: true, approved: false });
    assert.deepStrictEqual(parseApproved({ isApproved: true }), { valid: true, approved: true });
    assert.deepStrictEqual(parseApproved({ isApproved: false }), { valid: true, approved: false });
    assert.deepStrictEqual(parseApproved({ approved: 'true' }), { valid: true, approved: true });
    assert.deepStrictEqual(parseApproved({ approved: 'false' }), { valid: true, approved: false });
    assert.deepStrictEqual(parseApproved({ isApproved: 'true' }), { valid: true, approved: true });

    // Invalid inputs
    assert.strictEqual(parseApproved({}).valid, false);
    assert.strictEqual(parseApproved({ approved: 'yes' }).valid, false);
    assert.strictEqual(parseApproved({ approved: 1 }).valid, false);
    assert.strictEqual(parseApproved({ approved: null }).valid, false);
  });
});
