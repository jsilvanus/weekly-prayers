import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import prayersRouter from './routes/prayers.js';
import countsRouter from './routes/counts.js';
import exportRouter from './routes/export.js';
import embedRouter from './routes/embed.js';
import settingsRouter from './routes/settings.js';
import bibleRouter from './routes/bible.js';
import tenantRouter from './routes/tenants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for reverse proxy headers (Traefik / Nginx)
app.set('trust proxy', true);

// Compute basePath from BASE_URL (e.g. "https://kehitys.riihimaenseurakunta.fi/rukous" -> "/rukous")
export function deriveBasePath(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname;
  } catch (e) {
    return '';
  }
}

export function injectBasePathIntoHtml(html, basePath) {
  const cleanBase = (basePath || '').replace(/\/+$/, '');
  const baseHref = cleanBase ? `${cleanBase}/` : '/';
  const injection = `<base href="${baseHref}" /><script>window.__BASE_PATH__ = ${JSON.stringify(cleanBase)};</script>`;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n    ${injection}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${injection}`);
}

const basePath = deriveBasePath(process.env.BASE_URL);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline svgs and data urls
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Always keep root health check alive for container healthchecks
app.use('/health', healthRouter);

// Subpath or root router mount
const router = express.Router();

// Health check inside mount
router.use('/health', healthRouter);
router.use('/api', healthRouter);

// API Routes
router.use('/api/auth', authRouter);
router.use('/api/users', usersRouter);
router.use('/api/prayers', prayersRouter);
router.use('/api/counts', countsRouter);
router.use('/api/export', exportRouter);
router.use('/api/embed', embedRouter);
router.use('/api/settings', settingsRouter);
router.use('/api/bible', bibleRouter);
router.use('/api/tenants', tenantRouter);

// Serve frontend static build if present (single-container / production mode)
const clientDistCandidates = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve('/app/client/dist'),
  path.resolve('/app/frontend/dist'),
];

let clientDistPath = clientDistCandidates.find(p => fs.existsSync(p));

if (clientDistPath) {
  const indexPath = path.join(clientDistPath, 'index.html');
  const rawHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : null;
  const renderedHtml = rawHtml ? injectBasePathIntoHtml(rawHtml, basePath) : null;

  router.use(express.static(clientDistPath, { index: false }));

  router.get('*', (req, res, next) => {
    // If request starts with /api or /health, pass through to 404
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    if (renderedHtml) {
      res.type('html').send(renderedHtml);
    } else {
      res.sendFile(indexPath);
    }
  });
} else {
  // Basic fallback route when no frontend build is attached
  router.get('/', (req, res) => {
    res.json({
      name: 'Weekly Prayers API',
      version: '1.0.0',
      status: 'running',
      basePath: basePath || '/',
    });
  });
}

// Mount router on basePath and also at root if basePath is present
if (basePath) {
  app.use(basePath, router);
}
app.use('/', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not Found' } });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (basePath: "${basePath}")`);
});

export default app;
