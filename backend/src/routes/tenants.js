import { Router } from 'express';
import { getAllTenants, getTenantHierarchy, getTenantBySlugOrId } from '../services/tenantService.js';

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

// GET /api/tenants/current - Get current tenant hierarchy (based on ?slug= query or default)
router.get('/current', async (req, res, next) => {
  try {
    const slug = req.query.slug || 'tuomiokirkko';
    const hierarchy = await getTenantHierarchy(slug);
    res.json(hierarchy);
  } catch (error) {
    next(error);
  }
});

// GET /api/tenants/:identifier - Get tenant hierarchy by slug or ID
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

export default router;
