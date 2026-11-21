-- Migration 015: Add church_logo_variant setting to tenants and site_settings

-- 1. Add church_logo_variant column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS church_logo_variant VARCHAR(32) DEFAULT 'auto';

-- 2. Update existing tenants to default to 'auto'
UPDATE tenants
SET church_logo_variant = COALESCE(church_logo_variant, 'auto')
WHERE church_logo_variant IS NULL;

-- 3. Add church_logo_variant column to site_settings table (if columns exist)
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS church_logo_variant VARCHAR(32) DEFAULT 'auto';

-- 4. Seed site_settings key-value default
INSERT INTO site_settings (key, value)
VALUES ('church_logo_variant', 'auto')
ON CONFLICT (key) DO NOTHING;
