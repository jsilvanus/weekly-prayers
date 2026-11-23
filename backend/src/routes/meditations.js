import express from 'express';
import {
  getActiveMeditationsList,
  getMeditationByIdOrSlug,
  saveMeditation,
  updateMeditationPortalPosition,
  deleteMeditation,
} from '../services/meditationService.js';
import { optionalAuth, requireAuth } from '../middleware/authenticate.js';
import { isWorkerOrAbove } from '../middleware/authorize.js';

const router = express.Router();

function requireStaffOrDevotion(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (isWorkerOrAbove(req.user) || req.user.role === 'devotion') {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions' });
}

/**
 * GET /api/meditations
 * List meditations respecting active_meditations, tenant overrides, and optional portal_position filter
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' || req.query.all === 'true';
    const tenantSlug = req.query.tenant || req.query.tenantSlug || null;
    const portalPosition = req.query.portalPosition || req.query.portal_position || null;
    const list = await getActiveMeditationsList({ includeInactive, tenantSlug, portalPosition });
    res.json({
      success: true,
      meditations: list,
    });
  } catch (error) {
    console.error('Error fetching meditations:', error);
    res.status(500).json({ error: 'Failed to fetch meditations' });
  }
});

/**
 * GET /api/meditations/:id
 * Retrieve a specific meditation by ID or slug
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const tenantSlug = req.query.tenant || req.query.tenantSlug || null;
    const item = await getMeditationByIdOrSlug(req.params.id, tenantSlug);
    if (!item) {
      return res.status(404).json({ error: 'Meditation not found' });
    }
    res.json({
      success: true,
      meditation: item,
    });
  } catch (error) {
    console.error('Error fetching meditation:', error);
    res.status(500).json({ error: 'Failed to fetch meditation' });
  }
});

/**
 * POST /api/meditations
 * Create a new custom meditation or save an override
 */
router.post('/', requireAuth, requireStaffOrDevotion, async (req, res) => {
  try {
    const saved = await saveMeditation(req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Meditaatio tallennettu',
      meditation: saved,
    });
  } catch (error) {
    console.error('Error saving meditation:', error);
    res.status(400).json({ error: error.message || 'Failed to save meditation' });
  }
});

/**
 * PUT /api/meditations/:id
 * Update an existing meditation or create a tenant override
 */
router.put('/:id', requireAuth, requireStaffOrDevotion, async (req, res) => {
  try {
    const saved = await saveMeditation({ ...req.body, id: req.params.id, slug: req.body.slug || req.params.id }, req.user);
    res.status(200).json({
      success: true,
      message: 'Meditaatio päivitetty',
      meditation: saved,
    });
  } catch (error) {
    console.error('Error updating meditation:', error);
    res.status(400).json({ error: error.message || 'Failed to update meditation' });
  }
});

/**
 * PATCH /api/meditations/:id/portal
 * Update portal_position ('above' | 'below' | null) for main page visibility lifting
 */
router.patch('/:id/portal', requireAuth, requireStaffOrDevotion, async (req, res) => {
  try {
    const pos = req.body.portal_position ?? req.body.portalPosition ?? null;
    const tenantSlug = req.body.tenant || req.query.tenant || null;
    const updated = await updateMeditationPortalPosition(req.params.id, pos, tenantSlug);
    res.json({
      success: true,
      message: 'Etusivunosto päivitetty',
      meditation: updated,
    });
  } catch (error) {
    console.error('Error updating meditation portal position:', error);
    res.status(400).json({ error: error.message || 'Failed to update portal position' });
  }
});

/**
 * DELETE /api/meditations/:id
 * Delete a custom meditation
 */
router.delete('/:id', requireAuth, requireStaffOrDevotion, async (req, res) => {
  try {
    const tenantSlug = req.query.tenant || null;
    const deleted = await deleteMeditation(req.params.id, tenantSlug);
    if (!deleted) {
      return res.status(404).json({ error: 'Meditation not found' });
    }
    res.json({
      success: true,
      message: 'Meditaatio poistettu',
      meditation: deleted,
    });
  } catch (error) {
    console.error('Error deleting meditation:', error);
    res.status(400).json({ error: error.message || 'Failed to delete meditation' });
  }
});

export default router;
