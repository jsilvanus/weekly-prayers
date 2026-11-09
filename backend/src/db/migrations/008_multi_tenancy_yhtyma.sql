-- Migration 008: Multi-tenancy with Seurakunta (basic entity) and Seurakuntayhtymä (consists of parishes)
-- Enables yhtymä-wide prayers and parish dropdown in prayer views

-- 1. Create tenant_type enum if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'seurakunta'
        AND enumtypid = 'tenant_type'::regtype
    ) THEN
        CREATE TYPE tenant_type AS ENUM ('seurakunta', 'seurakuntayhtyma');
    END IF;
END $$;

-- 2. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    type            tenant_type NOT NULL DEFAULT 'seurakunta',
    parent_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
    diocese         VARCHAR(255) DEFAULT 'Tampereen hiippakunta',
    logo_url        TEXT,
    color_palette   VARCHAR(50) DEFAULT 'cathedral_blue',
    custom_color    VARCHAR(20) DEFAULT '#1e3a5f',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tenant_parent CHECK (
        (type = 'seurakuntayhtyma' AND parent_id IS NULL) OR
        (type = 'seurakunta')
    )
);

CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(type);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 3. Add multi-tenancy columns to prayer_requests
ALTER TABLE prayer_requests
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_yhtyma_wide BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_prayers_tenant ON prayer_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prayers_yhtyma_wide ON prayer_requests(is_yhtyma_wide) WHERE is_yhtyma_wide = true;

-- 4. Add tenant_id to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- 5. Add tenant_id to prayer_counts
ALTER TABLE prayer_counts
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prayer_counts_tenant ON prayer_counts(tenant_id);

-- 6. Add tenant_id to site_settings (for tenant-specific branding)
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 7. Seed initial tenant hierarchy: Tampereen seurakuntayhtymä with member parishes and an independent parish
INSERT INTO tenants (id, name, slug, type, parent_id, diocese, color_palette, custom_color)
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'Tampereen seurakuntayhtymä', 'tampereen-seurakuntayhtyma', 'seurakuntayhtyma', NULL, 'Tampereen hiippakunta', 'cathedral_blue', '#1e3a5f')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (id, name, slug, type, parent_id, diocese, color_palette, custom_color)
VALUES
    ('e2000000-0000-0000-0000-000000000001', 'Tuomiokirkkoseurakunta', 'tuomiokirkko', 'seurakunta', 'e1000000-0000-0000-0000-000000000001', 'Tampereen hiippakunta', 'cathedral_blue', '#1e3a5f'),
    ('e2000000-0000-0000-0000-000000000002', 'Harjun seurakunta', 'harju', 'seurakunta', 'e1000000-0000-0000-0000-000000000001', 'Tampereen hiippakunta', 'liturgical_green', '#2d5a3f'),
    ('e2000000-0000-0000-0000-000000000003', 'Messukylän seurakunta', 'messukyla', 'seurakunta', 'e1000000-0000-0000-0000-000000000001', 'Tampereen hiippakunta', 'liturgical_gold', '#b45309'),
    ('e2000000-0000-0000-0000-000000000004', 'Kangasalan seurakunta', 'kangasala', 'seurakunta', NULL, 'Tampereen hiippakunta', 'cathedral_blue', '#1e3a5f')
ON CONFLICT (slug) DO NOTHING;

-- 8. Backfill existing records to Tuomiokirkkoseurakunta default tenant
UPDATE prayer_requests
SET tenant_id = 'e2000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE users
SET tenant_id = 'e2000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

UPDATE prayer_counts
SET tenant_id = 'e2000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- 9. Seed a sample yhtymä-wide prayer request
INSERT INTO prayer_requests (
    id,
    type,
    original_content,
    sanitized_content,
    start_date,
    end_date,
    is_approved,
    highlight_priority,
    ministry_group,
    ministry_tag,
    is_yhtyma_wide,
    tenant_id
) VALUES (
    'f1000000-0000-0000-0000-000000000001',
    'staff',
    'Rukoilemme Tampereen seurakuntayhtymän yhteisen ruoka-apu- ja diakoniatoiminnan puolesta sekä taloudellisessa ahdingossa kamppailevien perheiden tukemiseksi koko yhtymän alueella.',
    'Rukoilemme Tampereen seurakuntayhtymän yhteisen ruoka-apu- ja diakoniatoiminnan puolesta sekä taloudellisessa ahdingossa kamppailevien perheiden tukemiseksi koko yhtymän alueella.',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '27 days',
    true,
    15,
    'diaconal_care',
    'Diakonia',
    true,
    'e2000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
