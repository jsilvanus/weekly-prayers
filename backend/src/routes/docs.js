import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function deriveBasePath(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname;
  } catch (e) {
    return '';
  }
}

// Locate openapi.yaml
function getSpecPath() {
  const candidates = [
    path.join(__dirname, '../../openapi.yaml'),
    path.join(__dirname, '../openapi.yaml'),
    path.join(process.cwd(), 'openapi.yaml'),
    path.join(process.cwd(), 'backend/openapi.yaml'),
    '/app/openapi.yaml',
    '/app/backend/openapi.yaml'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let cachedSpec = null;
function loadSpec() {
  if (cachedSpec) return cachedSpec;
  const specPath = getSpecPath();
  if (specPath && fs.existsSync(specPath)) {
    cachedSpec = fs.readFileSync(specPath, 'utf8');
    return cachedSpec;
  }
  return null;
}

// GET /api/openapi.yaml
router.get('/openapi.yaml', (_req, res) => {
  const spec = loadSpec();
  if (!spec) {
    return res.status(404).send('OpenAPI specification file not found.');
  }
  res.type('application/yaml').send(spec);
});

// GET /api/docs (interactive Swagger UI)
router.get(['/docs', '/docs/'], (_req, res) => {
  const basePath = deriveBasePath(process.env.BASE_URL);
  const specUrl = `${basePath}/api/openapi.yaml`;

  const html = `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Prayers API - Dokumentaatio (OpenAPI)</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⛪</text></svg>">
  <style>
    body { margin: 0; padding: 0; background-color: #fafafa; font-family: sans-serif; }
    .swagger-ui .topbar { background-color: #1e3a5f; }
    .header-bar {
      background: #1e3a5f;
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-bar h1 { margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .header-bar a { color: #93c5fd; text-decoration: none; font-size: 13px; font-weight: 500; }
    .header-bar a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1><span>⛪</span> Suomen ev.lut. kirkko – Weekly Prayers API</h1>
    <a href="${specUrl}" download="openapi.yaml">📥 Lataa openapi.yaml</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  res.type('text/html').send(html);
});

export default router;
