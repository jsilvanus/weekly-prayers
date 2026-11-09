-- Migration 004: Add logo_url to prayer_requests and create site_settings table

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default church and parish settings
INSERT INTO site_settings (key, value) VALUES
    ('parish_name', 'Tuomiokirkkoseurakunta'),
    ('parish_subtitle', 'Viikon rukousaiheet'),
    ('color_palette', 'cathedral_blue'),
    ('custom_color', '#1e3a5f'),
    ('show_church_logo', 'true'),
    ('show_parish_logo', 'true'),
    ('daily_word_enabled', 'true'),
    ('daily_word_title', 'Päivän sana'),
    ('daily_word_verse', 'Ps. 103:1–4'),
    ('daily_word_content', 'Ylistä Herraa, minun sieluni, ja kaikki mitä minussa on, hänen pyhää nimeään. Ylistä Herraa, minun sieluni, äläkä unohda, mitä hyvää hän on sinulle tehnyt.'),
    ('daily_word_reflection', 'Herra on laupias ja armahtavainen, pitkämielinen ja suuri armossaan. Hän antaa anteeksi syntisi ja parantaa sairautesi.')
ON CONFLICT (key) DO NOTHING;
