import { Router } from 'express';
import { 
  getBibleForDate, 
  getAllOverrides, 
  createOverride, 
  updateOverride, 
  deleteOverride 
} from '../services/bibleService.js';
import { testAnnoApi } from '../services/annoService.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requireWorker } from '../middleware/authorize.js';

const router = Router();

// GET /api/bible/today - Get Bible data for today (or ?date=YYYY-MM-DD)
// Accessible publicly
router.get('/today', async (req, res, next) => {
  try {
    const { date } = req.query;
    const data = await getBibleForDate(date);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/bible/overrides - List all manual Bible overrides
// Staff and above
router.get('/overrides', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const overrides = await getAllOverrides();
    res.json({ overrides });
  } catch (err) {
    next(err);
  }
});

// POST /api/bible/overrides - Create a new manual Bible override
router.post('/overrides', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { title, verse_reference, verse_text, meditation, commentary, schedule, is_active } = req.body;
    if (!verse_reference || !verse_text) {
      return res.status(400).json({ error: { message: 'Raamatunkohta ja jakeen teksti ovat pakollisia kenttiä.' } });
    }

    const created = await createOverride({
      title,
      verse_reference,
      verse_text,
      meditation,
      commentary,
      schedule,
      is_active: is_active !== false
    });

    res.status(201).json({ override: created, message: 'Raamattujakeen ohitus luotu onnistuneesti.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bible/overrides/:id - Update an override
router.put('/overrides/:id', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateOverride(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { message: 'Ohitusta ei löytynyt.' } });
    }
    res.json({ override: updated, message: 'Ohitus päivitetty onnistuneesti.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bible/overrides/:id - Delete an override
router.delete('/overrides/:id', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteOverride(id);
    if (!deleted) {
      return res.status(404).json({ error: { message: 'Ohitusta ei löytynyt.' } });
    }
    res.json({ message: 'Ohitus poistettu.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/bible/anno-status - Test connection to Anno API
router.get('/anno-status', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { url } = req.query;
    const result = await testAnnoApi(url);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
