import { Router } from 'express';
import { getPrayersForWeek } from '../services/prayerService.js';
import { getCurrentWeekInfo, getWeekNumber, getWeekYear } from '../utils/weekHelper.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { isWorkerOrAbove } from '../middleware/authorize.js';

const router = Router();

// GET /api/prayers - Get current week's prayers
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { week, year } = getCurrentWeekInfo();

    const isStaff = isWorkerOrAbove(req.user);

    const prayers = await getPrayersForWeek(week, year, {
      includeUnapproved: isStaff,
      includeOriginal: isStaff
    });

    res.json({
      week,
      year,
      prayers
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/prayers/week/:week - Get specific week's prayers
router.get('/week/:week', optionalAuth, async (req, res, next) => {
  try {
    let { week } = req.params;
    let { year } = req.query;

    week = parseInt(week, 10);
    year = year ? parseInt(year, 10) : getWeekYear(new Date());

    if (isNaN(week) || week < 1 || week > 53) {
      return res.status(400).json({
        error: { message: 'Invalid week number. Must be between 1 and 53.' }
      });
    }

    if (isNaN(year) || year < 2020 || year > 2100) {
      return res.status(400).json({
        error: { message: 'Invalid year. Must be between 2020 and 2100.' }
      });
    }

    const isStaff = isWorkerOrAbove(req.user);

    const prayers = await getPrayersForWeek(week, year, {
      includeUnapproved: isStaff,
      includeOriginal: isStaff
    });

    res.json({
      week,
      year,
      prayers
    });
  } catch (error) {
    next(error);
  }
});

export default router;
