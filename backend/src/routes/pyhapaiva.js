import { Router } from 'express';
import {
  getHolyDayForDate,
  getChurchYearCalendar,
  listHolyDayOverrides,
  saveHolyDayOverride,
  deleteHolyDayOverride
} from '../services/pyhapaivaService.js';
import { optionalAuth, requireAuth } from '../middleware/authenticate.js';
import { requireWorker } from '../middleware/authorize.js';

const router = Router();

// GET /api/pyhapaiva (and /api/pyhapaiva/day, /api/pyhapaiva/today)
// Publicly accessible: returns holy day readings, liturgical color, season, and parish overrides
router.get(['/', '/day', '/today'], optionalAuth, async (req, res, next) => {
  try {
    const { date, tenant, tenantSlug, translation } = req.query;
    const data = await getHolyDayForDate({
      date: date || null,
      tenant: tenant || tenantSlug || req.headers['x-tenant-id'] || null,
      translation: translation || 'KR92'
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/pyhapaiva/calendar
// Publicly accessible: returns list of Sundays and Holy Days for interactive church year jumper
router.get('/calendar', optionalAuth, async (req, res, next) => {
  try {
    const { from, days, tenant, tenantSlug } = req.query;
    const data = await getChurchYearCalendar({
      from: from || null,
      days: days ? parseInt(days, 10) : 90,
      tenant: tenant || tenantSlug || req.headers['x-tenant-id'] || null
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/pyhapaiva/overrides
// Staff & above: list all parish custom holy day overrides
router.get('/overrides', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { tenant, tenantSlug } = req.query;
    const overrides = await listHolyDayOverrides(
      tenant || tenantSlug || req.headers['x-tenant-id'] || req.user?.tenantId || null
    );
    res.json({ overrides });
  } catch (err) {
    next(err);
  }
});

// POST /api/pyhapaiva/overrides
// Staff & above: create or update a parish holy day override (body contains target_date)
router.post('/overrides', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const targetDate = req.body.target_date || req.body.date;
    if (!targetDate) {
      return res.status(400).json({ error: { message: 'Pyhäpäivän päivämäärä (target_date) on pakollinen.' } });
    }
    const saved = await saveHolyDayOverride(targetDate, req.body, req.user);
    res.status(200).json({
      override: saved,
      message: 'Pyhäpäivän seurakuntakohtaiset asetukset tallennettu.'
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/pyhapaiva/overrides/:date
// Staff & above: upsert parish holy day override by YYYY-MM-DD date
router.put('/overrides/:date', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { date } = req.params;
    const saved = await saveHolyDayOverride(date, req.body, req.user);
    res.status(200).json({
      override: saved,
      message: 'Pyhäpäivän seurakuntakohtaiset asetukset tallennettu.'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/pyhapaiva/overrides/:date
// Staff & above: delete parish holy day override and revert to Anno API defaults
router.delete('/overrides/:date', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { date } = req.params;
    const { tenant, tenantSlug } = req.query;
    const deleted = await deleteHolyDayOverride(
      date,
      tenant || tenantSlug || req.headers['x-tenant-id'] || req.user?.tenantId || null
    );
    if (!deleted) {
      return res.status(404).json({ error: { message: 'Pyhäpäivän ohitusta ei löytynyt.' } });
    }
    res.json({
      deleted,
      message: 'Seurakunnan mukautus poistettu. Pyhäpäivä käyttää jälleen virallisia Anno API -tietoja.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
