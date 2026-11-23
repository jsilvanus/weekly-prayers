-- Migration 021: Pyhäpäivä & Kirkkovuosi module and Parish Holy Day Overrides

CREATE TABLE IF NOT EXISTS holy_day_overrides (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    target_date         DATE NOT NULL,
    holy_day_code       VARCHAR(100),
    custom_heading      VARCHAR(255),
    custom_description  TEXT,
    pastoral_reflection TEXT,
    custom_collect      TEXT,
    custom_hymns        JSONB DEFAULT '[]'::jsonb,
    service_info        JSONB DEFAULT '{}'::jsonb,
    readings_override   JSONB DEFAULT NULL,
    blocks              JSONB DEFAULT NULL,
    portal_position     VARCHAR(16) DEFAULT NULL,
    is_published        BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_holy_day_override_tenant_date UNIQUE (tenant_id, target_date)
);

CREATE INDEX IF NOT EXISTS idx_holy_day_overrides_tenant_date ON holy_day_overrides(tenant_id, target_date);
CREATE INDEX IF NOT EXISTS idx_holy_day_overrides_portal ON holy_day_overrides(portal_position) WHERE portal_position IS NOT NULL;
