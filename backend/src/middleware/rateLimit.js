/**
 * Tiny in-memory fixed-window rate limiter keyed by client IP.
 * Single-process only; expired entries are swept lazily, so no timers are left running.
 */
export function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }
  let lastSweep = Date.now();

  function sweep(now) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
    lastSweep = now;
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    if (now - lastSweep >= windowMs) sweep(now);

    const key = req.ip || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return res.status(429).json({
        error: { message: 'Too many requests. Please try again later.' }
      });
    }
    return next();
  };
}
