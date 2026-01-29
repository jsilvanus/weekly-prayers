import { Router } from 'express';
import { query } from '../db/index.js';
import { getCurrentWeekInfo } from '../utils/weekHelper.js';

const router = Router();

// GET /api/counts/week/:week - Get prayer count for a specific week
router.get('/week/:week', async (req, res, next) => {
  try {
    let { week } = req.params;
    let { year } = req.query;

    week = parseInt(week, 10);
    year = year ? parseInt(year, 10) : new Date().getFullYear();

    const result = await query(
      'SELECT count FROM prayer_counts WHERE week_number = $1 AND year = $2',
      [week, year]
    );

    res.json({
      week,
      year,
      count: result.rows[0]?.count || 0
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/counts/increment - Increment prayer count for current week
router.post('/increment', async (req, res, next) => {
  try {
    const { week, year } = getCurrentWeekInfo();

    // Upsert: insert or update count
    const result = await query(
      `INSERT INTO prayer_counts (week_number, year, count, updated_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (week_number, year)
       DO UPDATE SET count = prayer_counts.count + 1, updated_at = NOW()
       RETURNING count`,
      [week, year]
    );

    res.json({
      week,
      year,
      count: result.rows[0].count
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/counts - Get current week's count
router.get('/', async (req, res, next) => {
  try {
    const { week, year } = getCurrentWeekInfo();

    const result = await query(
      'SELECT count FROM prayer_counts WHERE week_number = $1 AND year = $2',
      [week, year]
    );

    res.json({
      week,
      year,
      count: result.rows[0]?.count || 0
    });
  } catch (error) {
    next(error);
  }
});

export default router;
