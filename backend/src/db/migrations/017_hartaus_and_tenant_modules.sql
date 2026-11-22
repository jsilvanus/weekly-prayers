-- Migration 017: Hartaus (Curated Devotions), Devotion user role, and Tenant module toggles

-- 1. Add 'devotion' to user_role enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'devotion'
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'devotion';
    END IF;
END $$;

-- 2. Create devotion_format enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'devotion_format'
    ) THEN
        CREATE TYPE devotion_format AS ENUM ('single_block', 'structured');
    END IF;
END $$;

-- 3. Create devotion_author_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'devotion_author_type'
    ) THEN
        CREATE TYPE devotion_author_type AS ENUM ('self', 'other_user', 'custom_text');
    END IF;
END $$;

-- 4. Add active_modules to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS active_modules JSONB DEFAULT '["prayers", "bible", "hours", "hartaus"]'::jsonb;

UPDATE tenants
SET active_modules = '["prayers", "bible", "hours", "hartaus"]'::jsonb
WHERE active_modules IS NULL;

-- 5. Seed default active_modules in site_settings
INSERT INTO site_settings (key, value)
VALUES
    ('active_modules', '["prayers", "bible", "hours", "hartaus"]')
ON CONFLICT (key) DO NOTHING;

-- 6. Create devotions table
CREATE TABLE IF NOT EXISTS devotions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_type         devotion_author_type NOT NULL DEFAULT 'self',
    author_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name         VARCHAR(255) NOT NULL,
    author_title        VARCHAR(255),
    author_custom_text  VARCHAR(255),
    author_image_url    TEXT,
    title               VARCHAR(255) NOT NULL,
    format              devotion_format NOT NULL DEFAULT 'single_block',
    content             TEXT,
    liturgical_day      VARCHAR(255),
    scripture_reference VARCHAR(255),
    scripture_text      TEXT,
    meditation_content  TEXT,
    closing_prayer      TEXT,
    hymn_suggestion     VARCHAR(255),
    audio_url           TEXT,
    target_date         DATE NOT NULL,
    is_published        BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_devotion_tenant_date UNIQUE (tenant_id, target_date)
);

CREATE INDEX IF NOT EXISTS idx_devotions_tenant_date ON devotions(tenant_id, target_date);
CREATE INDEX IF NOT EXISTS idx_devotions_published ON devotions(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_devotions_author_user ON devotions(author_user_id);
CREATE INDEX IF NOT EXISTS idx_devotions_created_by ON devotions(created_by_user_id);
