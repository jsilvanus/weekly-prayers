import { Router } from 'express';
import { getPrayersForWeek, createPrayer, getPrayerById, updatePrayer, deletePrayer, approvePrayer, updatePrayerHighlight, updatePrayerPortalPlacement } from '../services/prayerService.js';
import { getCurrentWeekInfo, getCurrentWeekInfoForTenant, getWeekNumber, getWeekYear, getWeekDates, formatDate } from '../utils/weekHelper.js';
import { optionalAuth, requireAuth } from '../middleware/authenticate.js';
import { isWorkerOrAbove, requireWorker, requireAdmin, requireCoordinator, requireBishopOrAdmin } from '../middleware/authorize.js';
import { sanitizePrayerContent } from '../services/aiSanitizer.js';

const router = Router();

// GET /api/prayers - Get current week's prayers
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const tenantSlug = req.query.tenant || null;
    const tenantId = req.query.tenantId || req.headers['x-tenant-id'] || null;
    const { week, year } = await getCurrentWeekInfoForTenant(tenantId || tenantSlug);

    const isStaff = isWorkerOrAbove(req.user);

    const prayers = await getPrayersForWeek(week, year, {
      includeUnapproved: isStaff,
      includeOriginal: isStaff,
      tenantId,
      tenantSlug
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
    let { year, tenant, tenantId } = req.query;

    week = parseInt(week, 10);
    year = year ? parseInt(year, 10) : getWeekYear(new Date());
    const targetTenantId = tenantId || req.headers['x-tenant-id'] || null;

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
      includeOriginal: isStaff,
      tenantId: targetTenantId,
      tenantSlug: tenant
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
      const tenantCtx = req.headers['x-tenant-id'] || req.query.tenant || null;
      const currentWeek = await getCurrentWeekInfoForTenant(tenantCtx);
      prayerStartDate = formatDate(currentWeek.startDate);
      prayerEndDate = formatDate(currentWeek.endDate);
    }

    // Run AI sanitization
    const aiResult = await sanitizePrayerContent(content.trim());

    // Create the prayer with AI results (public prayers are always anonymous)
    const prayer = await createPrayer({
      userId: null,
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
    const { content, startDate, endDate, ministryGroup, ministryTag, isYhtymaWide, tenantId, portalPosition, portalOrder } = req.body;

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
      const tenantCtx = req.headers['x-tenant-id'] || req.query.tenant || null;
      const currentWeek = await getCurrentWeekInfoForTenant(tenantCtx);
      prayerStartDate = formatDate(currentWeek.startDate);
      prayerEndDate = formatDate(currentWeek.endDate);
    }

    // Ministry/Staff prayers don't need AI sanitization or approval
    const prayer = await createPrayer({
      userId: req.user.id,
      type: 'staff',
      originalContent: content.trim(),
      sanitizedContent: content.trim(),
      aiFlagged: false,
      aiFlagReason: null,
      startDate: prayerStartDate,
      endDate: prayerEndDate,
      isApproved: true, // Staff prayers are auto-approved
      ministryGroup: ministryGroup || 'local',
      ministryTag: ministryTag || null,
      isYhtymaWide: !!isYhtymaWide,
      tenantId: tenantId || req.user.tenant_id || null,
      portalPosition: portalPosition || null,
      portalOrder: portalOrder || 0
    });

    res.status(201).json({
      message: 'Ministry prayer request created successfully.',
      prayer: {
        id: prayer.id,
        type: prayer.type,
        content: prayer.original_content,
        startDate: prayer.start_date,
        endDate: prayer.end_date,
        isApproved: prayer.is_approved,
        ministryGroup: prayer.ministry_group,
        ministryTag: prayer.ministry_tag,
        isYhtymaWide: prayer.is_yhtyma_wide,
        tenantId: prayer.tenant_id,
        portalPosition: prayer.portal_position || null,
        portalOrder: prayer.portal_order || 0,
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
    const { content, startDate, endDate, logoUrl, isYhtymaWide, tenantId, highlightPriority, portalPosition, portalOrder } = req.body;

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
      const tenantCtx = req.headers['x-tenant-id'] || req.query.tenant || null;
      const currentWeek = await getCurrentWeekInfoForTenant(tenantCtx);
      prayerStartDate = formatDate(currentWeek.startDate);
      prayerEndDate = formatDate(currentWeek.endDate);
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
      isApproved: true,
      highlightPriority: parseInt(highlightPriority, 10) || 0,
      logoUrl: logoUrl || null,
      isYhtymaWide: !!isYhtymaWide,
      tenantId: tenantId || req.user.tenant_id || null,
      portalPosition: portalPosition || null,
      portalOrder: portalOrder || 0
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
        logoUrl: prayer.logo_url,
        portalPosition: prayer.portal_position || null,
        portalOrder: prayer.portal_order || 0,
        createdAt: prayer.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/prayers/bishop - Submit the optional bishop's prayer topic (bishop or admin)
router.post('/bishop', requireAuth, requireBishopOrAdmin, async (req, res, next) => {
  try {
    const { content, startDate, endDate, logoUrl, highlightPriority, isYhtymaWide, tenantId, portalPosition, portalOrder } = req.body;

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

    let prayerStartDate, prayerEndDate;

    if (startDate && endDate) {
      prayerStartDate = startDate;
      prayerEndDate = endDate;
    } else {
      const tenantCtx = req.headers['x-tenant-id'] || req.query.tenant || null;
      const currentWeek = await getCurrentWeekInfoForTenant(tenantCtx);
      prayerStartDate = formatDate(currentWeek.startDate);
      prayerEndDate = formatDate(currentWeek.endDate);
    }

    // Bishop prayers are auto-approved
    const prayer = await createPrayer({
      userId: req.user.id,
      type: 'bishop',
      originalContent: content.trim(),
      sanitizedContent: content.trim(),
      aiFlagged: false,
      aiFlagReason: null,
      startDate: prayerStartDate,
      endDate: prayerEndDate,
      isApproved: true,
      highlightPriority: parseInt(highlightPriority, 10) || 0,
      logoUrl: logoUrl || null,
      isYhtymaWide: !!isYhtymaWide,
      tenantId: tenantId || req.user.tenant_id || null,
      portalPosition: portalPosition || null,
      portalOrder: portalOrder || 0
    });

    res.status(201).json({
      message: 'Bishop prayer topic created successfully.',
      prayer: {
        id: prayer.id,
        type: prayer.type,
        content: prayer.original_content,
        startDate: prayer.start_date,
        endDate: prayer.end_date,
        isApproved: prayer.is_approved,
        logoUrl: prayer.logo_url,
        portalPosition: prayer.portal_position || null,
        portalOrder: prayer.portal_order || 0,
        createdAt: prayer.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/prayers/:id - Update a prayer request
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, startDate, endDate, portalPosition, portalOrder } = req.body;

    // Get existing prayer
    const existingPrayer = await getPrayerById(id);

    if (!existingPrayer) {
      return res.status(404).json({
        error: { message: 'Prayer request not found' }
      });
    }

    // Check permissions: admin can edit all, worker can edit staff/public, bishop by admin or bishop, pastor only by admin
    const isAdmin = req.user.role === 'admin';
    const isBishop = req.user.role === 'bishop';
    if (!isWorkerOrAbove(req.user) && !isBishop) {
      return res.status(403).json({
        error: { message: 'Insufficient permissions' }
      });
    }
    if (existingPrayer.type === 'bishop' && !isAdmin && !isBishop) {
      return res.status(403).json({
        error: { message: 'Only admin or bishop can edit bishop prayer topics' }
      });
    }
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
    if (portalPosition !== undefined) {
      updates.portalPosition = ['above', 'below'].includes(portalPosition) ? portalPosition : null;
    }
    if (portalOrder !== undefined) {
      updates.portalOrder = parseInt(portalOrder, 10) || 0;
    }

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
        portalPosition: updatedPrayer.portal_position || null,
        portalOrder: updatedPrayer.portal_order || 0,
        updatedAt: updatedPrayer.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH / PUT / POST /api/prayers/:id/portal - Lift or unlift any prayer (bishop, pastor, staff, public) to the main portal
router.all('/:id/portal', requireAuth, async (req, res, next) => {
  if (!['PATCH', 'PUT', 'POST'].includes(req.method)) {
    return next();
  }
  try {
    const { id } = req.params;
    const { portalPosition, portalOrder } = req.body;

    const existingPrayer = await getPrayerById(id);
    if (!existingPrayer) {
      return res.status(404).json({
        error: { message: 'Prayer request not found' }
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isBishop = req.user.role === 'bishop';
    if (!isWorkerOrAbove(req.user) && !isBishop) {
      return res.status(403).json({
        error: { message: 'Insufficient permissions to lift prayers to main portal' }
      });
    }
    if (existingPrayer.type === 'bishop' && !isAdmin && !isBishop) {
      return res.status(403).json({
        error: { message: 'Only admin or bishop can modify bishop prayer portal visibility' }
      });
    }

    const normalizedPos = ['above', 'below'].includes(portalPosition) ? portalPosition : null;
    const normalizedOrder = portalOrder !== undefined ? (parseInt(portalOrder, 10) || 0) : (existingPrayer.portal_order || 0);

    const updatedPrayer = await updatePrayerPortalPlacement(id, normalizedPos, normalizedOrder);

    res.json({
      message: normalizedPos
        ? `Prayer lifted to portal (${normalizedPos} carousel).`
        : 'Prayer removed from portal lift.',
      prayer: {
        id: updatedPrayer.id,
        type: updatedPrayer.type,
        content: updatedPrayer.sanitized_content || updatedPrayer.original_content,
        isApproved: updatedPrayer.is_approved,
        portalPosition: updatedPrayer.portal_position || null,
        portalOrder: updatedPrayer.portal_order || 0,
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

    // Check permissions: admin can delete all, worker can delete staff/public, bishop by admin or bishop, pastor only by admin
    const isAdmin = req.user.role === 'admin';
    const isBishop = req.user.role === 'bishop';
    if (existingPrayer.type === 'bishop' && !isAdmin && !isBishop) {
      return res.status(403).json({
        error: { message: 'Only admin or bishop can delete bishop prayer topics' }
      });
    }
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
    const rawApproved = req.body.approved !== undefined ? req.body.approved : req.body.isApproved;

    if (typeof rawApproved !== 'boolean' && rawApproved !== 'true' && rawApproved !== 'false') {
      return res.status(400).json({
        error: { message: 'approved field must be a boolean' }
      });
    }

    const approved = rawApproved === true || rawApproved === 'true';

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
        highlightPriority: updatedPrayer.highlight_priority,
        updatedAt: updatedPrayer.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/prayers/:id/highlight (and /priority) - Set prayer highlight priority / z-value and dates (coordinator+)
router.put(['/:id/highlight', '/:id/priority'], requireAuth, requireCoordinator, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { highlightPriority, startDate, endDate, highlightStartDate, highlightEndDate } = req.body;

    const priorityValue = parseInt(highlightPriority, 10);
    if (isNaN(priorityValue) || priorityValue < 0) {
      return res.status(400).json({
        error: { message: 'highlightPriority must be a non-negative integer' }
      });
    }

    const existingPrayer = await getPrayerById(id);
    if (!existingPrayer) {
      return res.status(404).json({
        error: { message: 'Prayer request not found' }
      });
    }

    let finalStartDate = null;
    let finalEndDate = null;

    if (priorityValue > 0) {
      const hlStart = highlightStartDate || startDate;
      const hlEnd = highlightEndDate || endDate;

      if (hlStart && hlEnd) {
        finalStartDate = hlStart;
        finalEndDate = hlEnd;
      } else if (existingPrayer.highlight_start_date && existingPrayer.highlight_end_date) {
        finalStartDate = existingPrayer.highlight_start_date;
        finalEndDate = existingPrayer.highlight_end_date;
      } else {
        // Default to one week (today through today + 6 days)
        const now = new Date();
        const end = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
        finalStartDate = formatDate(now);
        finalEndDate = formatDate(end);
      }
    }

    const updatedPrayer = await updatePrayerHighlight(id, priorityValue, finalStartDate, finalEndDate);

    res.json({
      message: priorityValue > 0 ? 'Prayer highlighted successfully.' : 'Prayer highlight removed.',
      prayer: {
        id: updatedPrayer.id,
        type: updatedPrayer.type,
        highlightPriority: updatedPrayer.highlight_priority,
        highlightStartDate: updatedPrayer.highlight_start_date ? formatDate(new Date(updatedPrayer.highlight_start_date)) : null,
        highlightEndDate: updatedPrayer.highlight_end_date ? formatDate(new Date(updatedPrayer.highlight_end_date)) : null,
        content: updatedPrayer.sanitized_content || updatedPrayer.original_content,
        updatedAt: updatedPrayer.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
