import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { requireAdmin, requireWorker, roleHierarchy } from '../middleware/authorize.js';
import { isUuid } from '../services/mailingService.js';
import {
  DIGEST_MIN_ROLE,
  buildDigest,
  getSubscriptionForUser,
  upsertSubscription,
  validateSubscriptionInput,
} from '../services/moderationDigest.js';
import { query } from '../db/index.js';

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_DAYS = ['1', '7'];

function sendValidationError(res, errors) {
  return res.status(400).json({ error: { message: 'Virheelliset tiedot', details: errors } });
}

// Own subscription (any moderator: worker and above)

router.get('/subscription', requireAuth, requireWorker, async (req, res, next) => {
  try {
    res.json({ subscription: await getSubscriptionForUser(req.user.id) });
  } catch (err) {
    next(err);
  }
});

router.put('/subscription', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const { errors, value } = validateSubscriptionInput(req.body || {});
    if (errors.length) return sendValidationError(res, errors);
    res.json({ subscription: await upsertSubscription(req.user.id, value) });
  } catch (err) {
    next(err);
  }
});

// Preview of the digest for the caller's tenant (computed now, nothing sent or stored)

router.get('/preview', requireAuth, requireWorker, async (req, res, next) => {
  try {
    const days = req.query.days === undefined ? '1' : String(req.query.days);
    if (!PREVIEW_DAYS.includes(days)) {
      return sendValidationError(res, ['days must be 1 or 7']);
    }
    const until = new Date();
    const since = new Date(until.getTime() - Number(days) * DAY_MS);
    const digest = await buildDigest(since, until, req.user.tenant_id ?? null);
    res.json({ days: Number(days), digest });
  } catch (err) {
    next(err);
  }
});

// Admin: set the subscription of a given moderator

router.put('/subscription/:userId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isUuid(userId)) {
      return sendValidationError(res, ['userId must be a UUID']);
    }
    const { errors, value } = validateSubscriptionInput(req.body || {});
    if (errors.length) return sendValidationError(res, errors);

    const userRes = await query('SELECT id, role FROM users WHERE id = $1', [userId]);
    const target = userRes.rows[0];
    if (!target) {
      return res.status(404).json({ error: { message: 'Käyttäjää ei löydy' } });
    }
    if ((roleHierarchy[target.role] || 0) < roleHierarchy[DIGEST_MIN_ROLE]) {
      return res.status(400).json({ error: { message: 'Käyttäjä ei ole moderaattori' } });
    }

    res.json({ subscription: await upsertSubscription(userId, value) });
  } catch (err) {
    next(err);
  }
});

export default router;
