import { Router } from 'express';
import {
  getAllTenants,
  getTenantHierarchy,
  getTenantBySlugOrId,
  createTenant,
  updateTenant,
  deleteTenant
} from '../services/tenantService.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// GET /api/tenants - List all tenants (seurakunnat ja seurakuntayhtymät)
router.get('/', async (req, res, next) => {
  try {
    const tenants = await getAllTenants();
    res.json({ tenants });
  } catch (error) {
    next(error);
  }
});

// GET /api/tenants/current - Get current tenant hierarchy (based on ?slug= query, ?host= query, or Host header)
router.get('/current', async (req, res, next) => {
  try {
    // Priority: 1. ?slug= parameter, 2. ?host= parameter, 3. Host header
    const target = req.query.slug || req.query.host || req.get('host') || null;
    const hierarchy = await getTenantHierarchy(target);
    res.json(hierarchy);
  } catch (error) {
    next(error);
  }
});

// GET /api/tenants/:identifier - Get tenant hierarchy by slug, domain, or ID
router.get('/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const hierarchy = await getTenantHierarchy(identifier);
    if (!hierarchy || !hierarchy.tenant) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    res.json(hierarchy);
  } catch (error) {
    next(error);
  }
});

// POST /api/tenants - Create new tenant (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const newTenant = await createTenant(req.body);
    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: newTenant
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

// PUT /api/tenants/:identifier - Update tenant details (admin only)
router.put('/:identifier', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const updated = await updateTenant(identifier, req.body);
    if (!updated) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    res.json({
      message: 'Tenant updated successfully',
      tenant: updated
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

// DELETE /api/tenants/:identifier - Delete tenant (admin only)
router.delete('/:identifier', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const deleted = await deleteTenant(identifier);
    if (!deleted) {
      return res.status(404).json({ error: { message: 'Tenant not found' } });
    }
    res.json({
      message: 'Tenant deleted successfully',
      tenant: deleted
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;
