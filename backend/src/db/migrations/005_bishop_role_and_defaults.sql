-- Migration 005: Add 'bishop' to user_role enum and seed bishop settings

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'bishop'
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'bishop';
    END IF;
END $$;

-- Insert or update default bishop settings
INSERT INTO site_settings (key, value) VALUES
    ('bishop_name', 'Matti Repo'),
    ('bishop_diocese', 'Tampereen hiippakunta'),
    ('bishop_crest_url', '/tampere_piispan_vaakuna.png')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value
WHERE site_settings.value IS NULL OR site_settings.value = '';
