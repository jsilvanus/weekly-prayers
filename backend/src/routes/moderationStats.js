import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { getRetentionStats, parseStatsDays } from '../services/prayerRetention.js';

const router = Router();

// GET /api/moderation/stats?days=N - Platform admin. Retention counts for the last N days (default 90, max 365).
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const parsed = parseStatsDays(req.query.days);
    if (parsed.error) {
      return res.status(400).json({ error: { message: parsed.error } });
    }
    res.json(await getRetentionStats({ days: parsed.days }));
  } catch (err) {
    next(err);
  }
});

export default router;
