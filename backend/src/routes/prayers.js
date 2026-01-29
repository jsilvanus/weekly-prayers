import { Router } from 'express';
import { getPrayersForWeek, createPrayer } from '../services/prayerService.js';
import { getCurrentWeekInfo, getWeekNumber, getWeekYear, getWeekDates, formatDate } from '../utils/weekHelper.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { isWorkerOrAbove } from '../middleware/authorize.js';
import { sanitizePrayerContent } from '../services/aiSanitizer.js';

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

// POST /api/prayers - Submit a new public prayer request
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { content, startDate, endDate } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: { message: 'Content is required' }
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        error: { message: 'Content must be 1000 characters or less' }
      });
    }

    // Determine dates - default to current week
    let prayerStartDate, prayerEndDate;

    if (startDate && endDate) {
      prayerStartDate = startDate;
      prayerEndDate = endDate;
    } else {
      const { week, year } = getCurrentWeekInfo();
      const dates = getWeekDates(week, year);
      prayerStartDate = formatDate(dates.startDate);
      prayerEndDate = formatDate(dates.endDate);
    }

    // Run AI sanitization
    const aiResult = await sanitizePrayerContent(content.trim());

    // Create the prayer with AI results
    const prayer = await createPrayer({
      userId: req.user?.id || null,
      type: 'public',
      originalContent: content.trim(),
      sanitizedContent: aiResult.sanitizedContent,
      aiFlagged: aiResult.flagged,
      aiFlagReason: aiResult.flagReason,
      startDate: prayerStartDate,
      endDate: prayerEndDate,
      isApproved: false // Public prayers need approval
    });

    // Prepare response message
    let message = 'Prayer request submitted successfully. It will be reviewed before publication.';
    if (aiResult.flagged) {
      message = 'Prayer request submitted. It has been flagged for additional review.';
    }

    res.status(201).json({
      message,
      prayer: {
        id: prayer.id,
        type: prayer.type,
        content: aiResult.sanitizedContent || prayer.original_content,
        startDate: prayer.start_date,
        endDate: prayer.end_date,
        isApproved: prayer.is_approved,
        createdAt: prayer.created_at,
        flagged: aiResult.flagged
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
