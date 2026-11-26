import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { requireCoordinator } from '../middleware/authorize.js';
import {
  MAX_BATCH_EMAILS,
  addAttestedSubscribers,
  buildMailingPreview,
  confirmSubscription,
  createMailing,
  createMailingList,
  deleteMailing,
  deleteMailingList,
  escapeHtml,
  getMailingForTenant,
  getMailingListForTenant,
  isUuid,
  isValidEmail,
  listMailingLists,
  listMailingSends,
  listMailings,
  listSubscribers,
  optOutRoleRecipient,
  removeSubscriber,
  requestPublicSubscription,
  sendTestMailing,
  unsubscribeSubscriber,
  updateMailing,
  updateMailingList,
  validateListInput,
  validateMailingInput,
} from '../services/mailingService.js';

const router = Router();

// ---------------------------------------------------------------------------
// Staff endpoints (coordinator and above). Tenant-scoped via req.user.tenant_id.
// ---------------------------------------------------------------------------

function requireTenant(req, res, next) {
  if (!req.user.tenant_id) {
    return res.status(400).json({ error: { message: 'Käyttäjälle ei ole määritetty seurakuntaa' } });
  }
  return next();
}

const staff = [requireAuth, requireCoordinator, requireTenant];
const tenantOf = (req) => req.user.tenant_id;

function sendValidationError(res, errors) {
  return res.status(400).json({ error: { message: 'Virheelliset tiedot', details: errors } });
}

function notFound(res, what) {
  return res.status(404).json({ error: { message: `${what} ei löydy` } });
}

/** Maps database constraint failures to client errors; anything else goes to the app error handler. */
function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err.code === '23503') {
        return res.status(409).json({ error: { message: 'Lista on käytössä mailingeissä' } });
      }
      if (err.code === '23514') {
        return res.status(400).json({ error: { message: 'Mailingin tiedot eivät täytä vaadittuja ehtoja' } });
      }
      return next(err);
    }
  };
}

// Lists

router.get('/lists', ...staff, handle(async (req, res) => {
  res.json({ lists: await listMailingLists(tenantOf(req)) });
}));

router.post('/lists', ...staff, handle(async (req, res) => {
  const { errors, value } = validateListInput(req.body);
  if (errors.length) return sendValidationError(res, errors);
  const list = await createMailingList({ tenantId: tenantOf(req), userId: req.user.id, input: value });
  res.status(201).json({ list });
}));

router.put('/lists/:id', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Lista');
  const { errors, value } = validateListInput(req.body);
  if (errors.length) return sendValidationError(res, errors);
  const list = await updateMailingList(req.params.id, tenantOf(req), value);
  if (!list) return notFound(res, 'Lista');
  res.json({ list });
}));

router.delete('/lists/:id', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Lista');
  const deleted = await deleteMailingList(req.params.id, tenantOf(req));
  if (!deleted) return notFound(res, 'Lista');
  res.status(204).end();
}));

// Subscribers

router.get('/lists/:id/subscribers', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Lista');
  const subscribers = await listSubscribers(req.params.id, tenantOf(req));
  if (!subscribers) return notFound(res, 'Lista');
  res.json({ subscribers });
}));

/**
 * Body: { emails: string[] | "a@x.fi, b@y.fi", email?: string, name?: string, consentConfirmed: true }
 * Adding without ticking the consent confirmation is rejected.
 */
router.post('/lists/:id/subscribers', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Lista');
  const body = req.body || {};
  if (body.consentConfirmed !== true) {
    return res.status(400).json({
      error: { message: 'Vastaanottajalla on oltava suostumus. Vahvista suostumus ennen lisäämistä.' },
    });
  }

  let emails = [];
  if (Array.isArray(body.emails)) emails = body.emails;
  else if (typeof body.emails === 'string') emails = body.emails.split(/[\s,;]+/).filter(Boolean);
  if (typeof body.email === 'string' && body.email.trim()) emails.push(body.email);
  emails = emails.filter(e => typeof e === 'string' && e.trim());

  if (emails.length === 0) return sendValidationError(res, ['at least one email is required']);
  if (emails.length > MAX_BATCH_EMAILS) {
    return sendValidationError(res, [`at most ${MAX_BATCH_EMAILS} emails per request`]);
  }
  if (body.name !== undefined && body.name !== null && (typeof body.name !== 'string' || body.name.length > 120)) {
    return sendValidationError(res, ['name must be a string of at most 120 characters']);
  }

  const result = await addAttestedSubscribers({
    listId: req.params.id,
    tenantId: tenantOf(req),
    emails,
    name: body.name?.trim() || null,
    addedBy: req.user.id,
  });
  if (!result) return notFound(res, 'Lista');
  res.json(result);
}));

router.delete('/subscribers/:id', ...staff, handle(async (req, res) => {
  const removed = await removeSubscriber(req.params.id, tenantOf(req));
  if (!removed) return notFound(res, 'Tilaaja');
  res.status(204).end();
}));

// Mailings

/** A list target must belong to the caller's tenant. */
async function checkListTarget(value, tenantId) {
  if (value.targetType !== 'list') return true;
  return (await getMailingListForTenant(value.listId, tenantId)) !== null;
}

router.get('/', ...staff, handle(async (req, res) => {
  res.json({ mailings: await listMailings(tenantOf(req)) });
}));

router.post('/', ...staff, handle(async (req, res) => {
  const { errors, value } = validateMailingInput(req.body);
  if (errors.length) return sendValidationError(res, errors);
  if (!(await checkListTarget(value, tenantOf(req)))) {
    return res.status(400).json({ error: { message: 'Listaa ei löydy' } });
  }
  const mailing = await createMailing({ tenantId: tenantOf(req), userId: req.user.id, value });
  res.status(201).json({ mailing });
}));

router.put('/:id', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Mailing');
  const existing = await getMailingForTenant(req.params.id, tenantOf(req));
  if (!existing) return notFound(res, 'Mailing');
  const { errors, value } = validateMailingInput(req.body);
  if (errors.length) return sendValidationError(res, errors);
  if (!(await checkListTarget(value, tenantOf(req)))) {
    return res.status(400).json({ error: { message: 'Listaa ei löydy' } });
  }
  const mailing = await updateMailing({ id: req.params.id, tenantId: tenantOf(req), value });
  if (!mailing) return notFound(res, 'Mailing');
  res.json({ mailing });
}));

router.delete('/:id', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Mailing');
  const deleted = await deleteMailing(req.params.id, tenantOf(req));
  if (!deleted) return notFound(res, 'Mailing');
  res.status(204).end();
}));

router.get('/:id/sends', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Mailing');
  const sends = await listMailingSends(req.params.id, tenantOf(req));
  if (!sends) return notFound(res, 'Mailing');
  res.json({ sends });
}));

router.post('/:id/preview', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Mailing');
  const preview = await buildMailingPreview(req.params.id, tenantOf(req));
  if (!preview) return notFound(res, 'Mailing');
  res.json(preview);
}));

/** Sends a test mail to the caller's own address only. */
router.post('/:id/test', ...staff, handle(async (req, res) => {
  if (!isUuid(req.params.id)) return notFound(res, 'Mailing');
  if (!req.user.email) return res.status(400).json({ error: { message: 'Käyttäjällä ei ole sähköpostiosoitetta' } });
  let sent;
  try {
    sent = await sendTestMailing(req.params.id, tenantOf(req), req.user.email);
  } catch (err) {
    console.error(`Mailing test send failed for mailing ${req.params.id}: ${err.message}`);
    return res.status(502).json({ error: { message: 'Testiviestin lähetys epäonnistui' } });
  }
  if (!sent) return notFound(res, 'Mailing');
  res.json({ sent: true });
}));

// ---------------------------------------------------------------------------
// Public endpoints (no login). Rate-limited in memory per IP.
// Responses never reveal whether an address is already on a list.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map();

export function resetPublicRateLimit() {
  rateBuckets.clear();
}

export function publicRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  if (rateBuckets.size > 5000) {
    for (const [k, bucket] of rateBuckets) {
      if (now >= bucket.resetAt) rateBuckets.delete(k);
    }
  }
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: { message: 'Liian monta pyyntöä. Yritä myöhemmin uudelleen.' } });
  }
  return next();
}

function htmlPage(res, status, title, message) {
  res.status(status).type('html').send(`<!doctype html>
<html lang="fi">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
  <body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;max-width:560px;margin:40px auto;padding:16px">
    <h1 style="font-size:20px">${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </body>
</html>`);
}

router.post('/public/lists/:id/subscribe', publicRateLimit, handle(async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: { message: 'Virheellinen sähköpostiosoite' } });
  }
  await requestPublicSubscription({ listId: req.params.id, email });
  res.status(202).json({ message: 'Tarkista sähköpostisi ja vahvista tilaus.' });
}));

router.get('/public/confirm', publicRateLimit, handle(async (req, res) => {
  const result = await confirmSubscription(req.query.s, req.query.t);
  if (result === 'confirmed') {
    return htmlPage(res, 200, 'Tilaus vahvistettu', 'Kiitos! Saat jatkossa viikoittaiset esirukousviestit.');
  }
  if (result === 'not_pending') {
    return htmlPage(res, 200, 'Tilausta ei voitu vahvistaa', 'Tilaus on jo vahvistettu tai peruttu.');
  }
  return htmlPage(res, 400, 'Linkki ei ole voimassa', 'Vahvistuslinkki on virheellinen tai vanhentunut.');
}));

async function handleUnsubscribe(req, res) {
  const result = await unsubscribeSubscriber(req.query.s, req.query.t);
  if (result === 'unsubscribed') {
    return htmlPage(res, 200, 'Tilaus peruttu', 'Tilauksesi on peruttu. Sinulle ei lähetetä enää viestejä.');
  }
  return htmlPage(res, 400, 'Linkki ei ole voimassa', 'Peruutuslinkki on virheellinen.');
}

router.get('/public/unsubscribe', publicRateLimit, handle(handleUnsubscribe));
router.post('/public/unsubscribe', publicRateLimit, handle(handleUnsubscribe));

async function handleOptout(req, res) {
  const result = await optOutRoleRecipient(req.query.u, req.query.t);
  if (result === 'opted_out') {
    return htmlPage(res, 200, 'Peruutus tallennettu', 'Et saa enää tämän seurakunnan esirukousviestejä.');
  }
  return htmlPage(res, 400, 'Linkki ei ole voimassa', 'Peruutuslinkki on virheellinen.');
}

router.get('/public/optout', publicRateLimit, handle(handleOptout));
router.post('/public/optout', publicRateLimit, handle(handleOptout));

export default router;
