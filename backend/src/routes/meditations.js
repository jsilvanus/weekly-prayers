import express from 'express';
import { getMeditationsList, getActiveMeditationsList, getMeditationById } from '../services/meditationService.js';

const router = express.Router();

/**
 * GET /api/meditations
 * List curated classical Christian & Lutheran meditations respecting active_meditations
 */
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' || req.query.all === 'true';
    const list = await getActiveMeditationsList({ includeInactive });
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
 * Retrieve a specific meditation by ID
 */
router.get('/:id', (req, res) => {
  try {
    const item = getMeditationById(req.params.id);
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

export default router;
