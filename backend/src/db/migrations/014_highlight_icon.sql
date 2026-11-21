-- Migration 014: Add highlight icon configuration to tenants and site_settings

-- 1. Add highlight_icon column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS highlight_icon VARCHAR(32) DEFAULT 'candle';

-- 2. Update existing tenants to default to 'candle'
UPDATE tenants
SET highlight_icon = COALESCE(highlight_icon, 'candle')
WHERE highlight_icon IS NULL;

-- 3. Add highlight_icon column to site_settings table
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS highlight_icon VARCHAR(32) DEFAULT 'candle';

-- 4. Seed site_settings key-value default
INSERT INTO site_settings (key, value)
VALUES ('highlight_icon', 'candle')
ON CONFLICT (key) DO NOTHING;
