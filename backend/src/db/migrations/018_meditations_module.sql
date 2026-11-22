-- Migration 018: Add meditations to default active_modules

-- 1. Update default value for active_modules in tenants table
ALTER TABLE tenants
ALTER COLUMN active_modules SET DEFAULT '["prayers", "bible", "hours", "hartaus", "meditations"]'::jsonb;

-- 2. Update existing tenants to include meditations if not already present
UPDATE tenants
SET active_modules = (
    SELECT jsonb_agg(DISTINCT elem)
    FROM jsonb_array_elements_text(COALESCE(active_modules, '[]'::jsonb) || '["meditations"]'::jsonb) AS elem
)
WHERE active_modules IS NOT NULL AND NOT (active_modules @> '["meditations"]'::jsonb);

-- 3. Update site_settings default active_modules
UPDATE site_settings
SET value = '["prayers", "bible", "hours", "hartaus", "meditations"]'
WHERE key = 'active_modules';
