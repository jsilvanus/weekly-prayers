import { Router } from 'express';
import { getAllSettings, updateSettings } from '../services/settingsService.js';
import { requireAuth } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// GET /api/settings - Public settings for app branding, theme, daily word, and logos
router.get('/', async (req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Update site settings (admin only)
router.put('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const newSettings = req.body.settings || req.body;
    const settings = await updateSettings(newSettings);
    res.json({
      message: 'Settings updated successfully.',
      settings
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/settings/upload - Upload logo/crest image (admin or worker)
// Accepts base64 encoded dataUrl: { image: "data:image/png;base64,...", name: "bishop-crest.png" }
router.post('/upload', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { image, name } = req.body;
    if (!image) {
      return res.status(400).json({ error: { message: 'Image data is required' } });
    }

    // In this web app, storing the base64 dataUrl directly enables seamless instant rendering and storage
    res.json({
      message: 'Image uploaded successfully.',
      url: image,
      name: name || 'logo.png'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
