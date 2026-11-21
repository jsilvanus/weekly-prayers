-- Migration 010: Add domain support for multi-tenancy URL routing and seed Riihimäen seurakunta

-- 1. Add domain column to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS domain VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- 2. Seed / Update Riihimäen seurakunta
INSERT INTO tenants (id, name, slug, type, parent_id, diocese, color_palette, custom_color, domain)
VALUES
    ('e2000000-0000-0000-0000-000000000010', 'Riihimäen seurakunta', 'riihimaki', 'seurakunta', NULL, 'Tampereen hiippakunta', 'cathedral_blue', '#1e3a5f', 'riihimaenseurakunta.fi')
ON CONFLICT (slug) DO UPDATE
SET domain = EXCLUDED.domain,
    name = EXCLUDED.name,
    diocese = EXCLUDED.diocese;

-- 3. Set domain for Tampereen seurakuntayhtymä
UPDATE tenants
SET domain = 'tampereenseurakunnat.fi'
WHERE slug = 'tampereen-seurakuntayhtyma' AND domain IS NULL;
