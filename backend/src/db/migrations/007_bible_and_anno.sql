-- Migration 007: Bible overrides and Anno API settings

CREATE TABLE IF NOT EXISTS bible_overrides (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    verse_reference VARCHAR(255) NOT NULL,
    verse_text TEXT NOT NULL,
    meditation TEXT,
    commentary TEXT,
    schedule JSONB NOT NULL DEFAULT '{"dates":[],"ranges":[]}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bible_overrides_active ON bible_overrides(is_active);

-- Seed Anno API settings and initial bible overrides
INSERT INTO site_settings (key, value) VALUES
    ('anno_api_enabled', 'true'),
    ('anno_api_url', 'http://localhost:3000'),
    ('bible_frontpage_mode', 'both')
ON CONFLICT (key) DO NOTHING;

-- Seed an example manual Bible override with multiple dates and ranges
INSERT INTO bible_overrides (title, verse_reference, verse_text, meditation, schedule, is_active)
VALUES (
    'Herra on minun paimeneni',
    'Ps. 23:1–3',
    'Herra on minun paimeneni, ei minulta mitään puutu. Viheriäisille niityille hän vie minut lepäämään, virvoittavien vetten tykö hän minut johdattaa. Hän virvoittaa minun sieluni.',
    'Paimenpsalmi muistuttaa meitä Jumalan huolenpidosta ja levosta arjen kiireen keskellä.',
    '{"dates":["2026-11-09","2026-11-15"],"ranges":[{"startDate":"2026-11-20","endDate":"2026-11-22"}]}',
    true
)
ON CONFLICT DO NOTHING;
