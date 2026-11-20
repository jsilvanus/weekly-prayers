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

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline svgs and data urls
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root health check alias (e.g. for container healthchecks)
app.use('/health', healthRouter);
app.use('/api', healthRouter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/prayers', prayersRouter);
app.use('/api/counts', countsRouter);
app.use('/api/export', exportRouter);
app.use('/api/embed', embedRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/bible', bibleRouter);
app.use('/api/tenants', tenantRouter);

// Serve frontend static build if present (single-container / production mode)
const clientDistCandidates = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve('/app/client/dist'),
  path.resolve('/app/frontend/dist'),
];

let clientDistPath = clientDistCandidates.find(p => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    // If request starts with /api or /health, don't serve index.html
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Basic fallback route when no frontend build is attached
  app.get('/', (req, res) => {
    res.json({
      name: 'Weekly Prayers API',
      version: '1.0.0',
      status: 'running'
    });
  });
}

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
  console.log(`Server running on port ${PORT}`);
});

export default app;
