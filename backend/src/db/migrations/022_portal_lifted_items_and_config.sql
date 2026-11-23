-- Migration 022: Portal Lifted Items (Prayers above/below carousel) and Parish Portal Configuration

-- 1. Add portal_position and portal_order to prayer_requests table
ALTER TABLE prayer_requests
ADD COLUMN IF NOT EXISTS portal_position VARCHAR(16) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS portal_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_portal_position
ON prayer_requests(portal_position)
WHERE portal_position IS NOT NULL;

-- 2. Add portal_config JSONB to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS portal_config JSONB DEFAULT '{
  "carousel": {
    "enabled": true,
    "autoPlayMs": 7000,
    "slides": [
      { "id": "hartaus", "visible": true, "order": 1 },
      { "id": "hours", "visible": true, "order": 2 },
      { "id": "pyhapaiva", "visible": true, "order": 3 },
      { "id": "prayers", "visible": true, "order": 4 }
    ]
  },
  "liftActiveDevotion": "none",
  "liftCurrentPyhapaiva": "none",
  "liftedMeditations": {},
  "sections": [
    { "id": "hartaus", "visible": true, "position": "below", "order": 1 },
    { "id": "pyhapaiva", "visible": true, "position": "below", "order": 2 },
    { "id": "hours", "visible": true, "position": "below", "order": 3 },
    { "id": "prayers", "visible": true, "position": "below", "order": 4 },
    { "id": "meditations", "visible": true, "position": "below", "order": 5 },
    { "id": "bible", "visible": true, "position": "below", "order": 6 }
  ]
}'::jsonb;

-- 3. Update default value for active_modules in tenants table to include pyhapaiva
ALTER TABLE tenants
ALTER COLUMN active_modules SET DEFAULT '["prayers", "bible", "hours", "hartaus", "meditations", "pyhapaiva"]'::jsonb;

UPDATE tenants
SET active_modules = (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements_text(COALESCE(active_modules, '[]'::jsonb) || '["pyhapaiva"]'::jsonb) AS elem
)
WHERE active_modules IS NOT NULL AND NOT (active_modules @> '["pyhapaiva"]'::jsonb);

-- 4. Seed default portal_config, active_modules, and module_title_pyhapaiva in site_settings
INSERT INTO site_settings (key, value)
VALUES
    ('module_title_pyhapaiva', 'Pyhäpäivä'),
    ('portal_config', '{"carousel":{"enabled":true,"autoPlayMs":7000,"slides":[{"id":"hartaus","visible":true,"order":1},{"id":"hours","visible":true,"order":2},{"id":"pyhapaiva","visible":true,"order":3},{"id":"prayers","visible":true,"order":4}]},"liftActiveDevotion":"none","liftCurrentPyhapaiva":"none","liftedMeditations":{},"sections":[{"id":"hartaus","visible":true,"position":"below","order":1},{"id":"pyhapaiva","visible":true,"position":"below","order":2},{"id":"hours","visible":true,"position":"below","order":3},{"id":"prayers","visible":true,"position":"below","order":4},{"id":"meditations","visible":true,"position":"below","order":5},{"id":"bible","visible":true,"position":"below","order":6}]}')
ON CONFLICT (key) DO NOTHING;

UPDATE site_settings
SET value = '["prayers", "bible", "hours", "hartaus", "meditations", "pyhapaiva"]'
WHERE key = 'active_modules' AND value NOT LIKE '%pyhapaiva%';
