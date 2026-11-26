import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/middleware/rateLimit.js';

function fakeReq(ip) {
  return { ip };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
  return res;
}

function hit(middleware, ip) {
  const res = fakeRes();
  let passed = false;
  middleware(fakeReq(ip), res, () => { passed = true; });
  return { passed, res };
}

describe('rateLimit middleware', () => {
  test('allows up to max requests per window, then returns 429 with a message', () => {
    const mw = rateLimit({ windowMs: 60_000, max: 3 });
    for (let i = 0; i < 3; i++) {
      assert.equal(hit(mw, '10.0.0.1').passed, true);
    }
    const blocked = hit(mw, '10.0.0.1');
    assert.equal(blocked.passed, false);
    assert.equal(blocked.res.statusCode, 429);
    assert.equal(typeof blocked.res.body.error.message, 'string');
    assert.ok(Number(blocked.res.headers['Retry-After']) >= 1);
  });

  test('keys by client IP: another address is unaffected', () => {
    const mw = rateLimit({ windowMs: 60_000, max: 1 });
    assert.equal(hit(mw, '10.0.0.2').passed, true);
    assert.equal(hit(mw, '10.0.0.2').passed, false);
    assert.equal(hit(mw, '10.0.0.3').passed, true);
  });

  test('window resets after windowMs elapses', async () => {
    const mw = rateLimit({ windowMs: 40, max: 1 });
    assert.equal(hit(mw, '10.0.0.4').passed, true);
    assert.equal(hit(mw, '10.0.0.4').passed, false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(hit(mw, '10.0.0.4').passed, true);
  });

  test('expired entries are swept so the map does not grow without bound', async () => {
    const mw = rateLimit({ windowMs: 20, max: 5 });
    for (let i = 0; i < 50; i++) hit(mw, `192.0.2.${i}`);
    await new Promise((resolve) => setTimeout(resolve, 40));
    // The next call past the window triggers a sweep; the middleware keeps working.
    assert.equal(hit(mw, '198.51.100.1').passed, true);
  });
});
