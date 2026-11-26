-- Retention of public prayer requests: counts of what was removed, per Helsinki day and tenant.
-- Idempotent: safe to run more than once.
--
-- Holds COUNTS only: purged_* totals, by_status (redaction status) and by_reason (finding type).
-- Never prayer text. Public prayers have tenant_id NULL, so the uniqueness uses NULLS NOT DISTINCT
-- (PostgreSQL 15+), the same as moderation_reject_counts. A row with tenant_id NULL and zero counts
-- marks that the purge already ran for the day.

CREATE TABLE IF NOT EXISTS prayer_retention_stats (
    id                  SERIAL PRIMARY KEY,
    day                 DATE NOT NULL,
    tenant_id           UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
    purged_unpublished  INT NOT NULL DEFAULT 0 CHECK (purged_unpublished >= 0),
    purged_published    INT NOT NULL DEFAULT 0 CHECK (purged_published >= 0),
    by_status           JSONB NOT NULL DEFAULT '{}'::jsonb,
    by_reason           JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT prayer_retention_stats_day_tenant_key UNIQUE NULLS NOT DISTINCT (day, tenant_id)
);
