-- Migration 019: Devotions YouTube embed URL and structured pieces ordering
-- Also initializes settings for active_meditations, brand_name, header_prominence, and module titles

-- 1. Add youtube_url and pieces_order columns to devotions table
ALTER TABLE devotions
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS pieces_order JSONB DEFAULT '["scripture", "meditation", "prayer", "hymn"]'::jsonb;

-- 2. Seed default settings for site_settings
INSERT INTO site_settings (key, value)
VALUES
    ('active_meditations', '["lonnebo_beads", "luther_wreath", "jesus_prayer", "lectio_divina", "examen"]'),
    ('brand_name', 'Rukoushetki'),
    ('header_prominence', 'parish'),
    ('module_title_prayers', 'Esirukoukset'),
    ('module_title_bible', 'Raamattu & Sana'),
    ('module_title_hours', 'Hetkirukous'),
    ('module_title_hartaus', 'Hartaus'),
    ('module_title_meditations', 'Meditaatiot')
ON CONFLICT (key) DO NOTHING;
