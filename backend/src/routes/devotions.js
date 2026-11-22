import { Router } from 'express';
import {
  getDevotionForDate,
  listDevotions,
  saveDevotion,
  deleteDevotion
} from '../services/devotionService.js';
import { optionalAuth, requireAuth } from '../middleware/authenticate.js';
import { requireDevotionAuthor, isWorkerOrAbove } from '../middleware/authorize.js';

const router = Router();

// GET /api/devotions/today - Get devotion for today (or ?date=YYYY-MM-DD)
router.get('/today', optionalAuth, async (req, res, next) => {
  try {
    const tenantSlug = req.query.tenant || req.query.tenantSlug || null;
    const dateStr = req.query.date || null;
    const isStaff = isWorkerOrAbove(req.user) || req.user?.role === 'devotion';

    const devotion = await getDevotionForDate(tenantSlug, dateStr, {
      includeAudit: isStaff
    });

    res.json({ devotion });
  } catch (error) {
    next(error);
  }
});

// GET /api/devotions - List devotions for scheduling/calendar (requires devotion author or staff)
router.get('/', requireAuth, requireDevotionAuthor, async (req, res, next) => {
  try {
    const tenantSlug = req.query.tenant || req.query.tenantSlug || null;
    const { startDate, endDate, limit, offset } = req.query;

    const devotions = await listDevotions(tenantSlug, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 60,
      offset: offset ? parseInt(offset, 10) : 0
    });

    res.json({ devotions });
  } catch (error) {
    next(error);
  }
});

// POST /api/devotions - Save (create or update) a devotion
router.post('/', requireAuth, requireDevotionAuthor, async (req, res, next) => {
  try {
    const saved = await saveDevotion(req.body, req.user);
    res.status(200).json({
      message: 'Devotion saved successfully',
      devotion: saved
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

// DELETE /api/devotions/:id - Delete a devotion
router.delete('/:id', requireAuth, requireDevotionAuthor, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDevotion(id, req.user);
    if (!deleted) {
      return res.status(404).json({ error: { message: 'Devotion not found' } });
    }
    res.json({
      message: 'Devotion deleted successfully',
      devotion: deleted
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;
