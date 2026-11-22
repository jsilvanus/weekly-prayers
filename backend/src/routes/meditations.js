import express from 'express';
import { getMeditationsList, getMeditationById } from '../services/meditationService.js';

const router = express.Router();

/**
 * GET /api/meditations
 * List all curated classical Christian & Lutheran meditations
 */
router.get('/', (req, res) => {
  try {
    const list = getMeditationsList();
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
