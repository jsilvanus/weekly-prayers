import { Router } from 'express';
import { getPrayersForWeek, createPrayer, getPrayerById, updatePrayer, deletePrayer, approvePrayer } from '../services/prayerService.js';
import { getCurrentWeekInfo, getWeekNumber, getWeekYear, getWeekDates, formatDate } from '../utils/weekHelper.js';
import { optionalAuth, requireAuth } from '../middleware/authenticate.js';
import { isWorkerOrAbove, requireWorker, requireAdmin } from '../middleware/authorize.js';
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

// POST /api/prayers/staff - Submit a staff prayer request (worker+)
router.post('/staff', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { content, startDate, endDate } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: { message: 'Content is required' }
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        error: { message: 'Content must be 2000 characters or less' }
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

    // Staff prayers don't need AI sanitization or approval
    const prayer = await createPrayer({
      userId: req.user.id,
      type: 'staff',
      originalContent: content.trim(),
      sanitizedContent: content.trim(),
      aiFlagged: false,
      aiFlagReason: null,
      startDate: prayerStartDate,
      endDate: prayerEndDate,
      isApproved: true // Staff prayers are auto-approved
    });

    res.status(201).json({
      message: 'Staff prayer request created successfully.',
      prayer: {
        id: prayer.id,
        type: prayer.type,
        content: prayer.original_content,
        startDate: prayer.start_date,
        endDate: prayer.end_date,
        isApproved: prayer.is_approved,
        createdAt: prayer.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/prayers/pastor - Submit the pastor's prayer topic (admin only)
router.post('/pastor', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { content, startDate, endDate } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: { message: 'Content is required' }
      });
    }

    if (content.length > 3000) {
      return res.status(400).json({
        error: { message: 'Content must be 3000 characters or less' }
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

    // Pastor prayers are auto-approved
    const prayer = await createPrayer({
      userId: req.user.id,
      type: 'pastor',
      originalContent: content.trim(),
      sanitizedContent: content.trim(),
      aiFlagged: false,
      aiFlagReason: null,
      startDate: prayerStartDate,
      endDate: prayerEndDate,
      isApproved: true
    });

    res.status(201).json({
      message: 'Pastor prayer topic created successfully.',
      prayer: {
        id: prayer.id,
        type: prayer.type,
        content: prayer.original_content,
        startDate: prayer.start_date,
        endDate: prayer.end_date,
        isApproved: prayer.is_approved,
        createdAt: prayer.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/prayers/:id - Update a prayer request
router.put('/:id', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, startDate, endDate } = req.body;

    // Get existing prayer
    const existingPrayer = await getPrayerById(id);

    if (!existingPrayer) {
      return res.status(404).json({
        error: { message: 'Prayer request not found' }
      });
    }

    // Check permissions: admin can edit all, worker can edit staff/public, pastor only by admin
    const isAdmin = req.user.role === 'admin';
    if (existingPrayer.type === 'pastor' && !isAdmin) {
      return res.status(403).json({
        error: { message: 'Only admin can edit pastor prayer topics' }
      });
    }

    // Build update object
    const updates = {};

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          error: { message: 'Content cannot be empty' }
        });
      }
      updates.originalContent = content.trim();
      updates.sanitizedContent = content.trim();
    }

    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;

    const updatedPrayer = await updatePrayer(id, updates);

    res.json({
      message: 'Prayer request updated successfully.',
      prayer: {
        id: updatedPrayer.id,
        type: updatedPrayer.type,
        content: updatedPrayer.original_content,
        startDate: updatedPrayer.start_date,
        endDate: updatedPrayer.end_date,
        isApproved: updatedPrayer.is_approved,
        updatedAt: updatedPrayer.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/prayers/:id - Delete a prayer request
router.delete('/:id', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get existing prayer
    const existingPrayer = await getPrayerById(id);

    if (!existingPrayer) {
      return res.status(404).json({
        error: { message: 'Prayer request not found' }
      });
    }

    // Check permissions: admin can delete all, worker can delete staff/public, pastor only by admin
    const isAdmin = req.user.role === 'admin';
    if (existingPrayer.type === 'pastor' && !isAdmin) {
      return res.status(403).json({
        error: { message: 'Only admin can delete pastor prayer topics' }
      });
    }

    await deletePrayer(id);

    res.json({
      message: 'Prayer request deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/prayers/:id/approve - Approve or reject a public prayer request
router.post('/:id/approve', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        error: { message: 'approved field must be a boolean' }
      });
    }

    // Get existing prayer
    const existingPrayer = await getPrayerById(id);

    if (!existingPrayer) {
      return res.status(404).json({
        error: { message: 'Prayer request not found' }
      });
    }

    // Only public prayers need approval
    if (existingPrayer.type !== 'public') {
      return res.status(400).json({
        error: { message: 'Only public prayer requests can be approved/rejected' }
      });
    }

    const updatedPrayer = await approvePrayer(id, approved);

    res.json({
      message: approved ? 'Prayer request approved.' : 'Prayer request rejected.',
      prayer: {
        id: updatedPrayer.id,
        type: updatedPrayer.type,
        content: updatedPrayer.sanitized_content || updatedPrayer.original_content,
        isApproved: updatedPrayer.is_approved,
        updatedAt: updatedPrayer.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
