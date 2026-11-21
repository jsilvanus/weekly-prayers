-- Migration 012: Add week rollover and cycle settings to tenants and site_settings

-- 1. Add week settings columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS week_rollover_day VARCHAR(20) DEFAULT 'thursday',
ADD COLUMN IF NOT EXISTS week_cycle_mode VARCHAR(30) DEFAULT 'thursday_cycle';

-- 2. Update existing tenants to default to Thursday rollover / cycle
UPDATE tenants
SET week_rollover_day = COALESCE(week_rollover_day, 'thursday'),
    week_cycle_mode = COALESCE(week_cycle_mode, 'thursday_cycle')
WHERE week_rollover_day IS NULL OR week_cycle_mode IS NULL;

-- 3. Seed site_settings defaults for week cycle
INSERT INTO site_settings (key, value)
VALUES
    ('week_rollover_day', 'thursday'),
    ('week_cycle_mode', 'thursday_cycle')
ON CONFLICT (key) DO NOTHING;
