-- Moderation digest: daily/weekly summary of the moderator's automatic decisions.
-- Idempotent: safe to run more than once.
--
-- moderation_reject_counts holds COUNTS and finding TYPES only, never text. Hard rejects are
-- not stored as prayers, so they have no moderation_decisions rows; this table keeps their tally.
-- Public prayers have tenant_id NULL (visible to every tenant), so the uniqueness uses
-- NULLS NOT DISTINCT (PostgreSQL 15+) to make the upsert conflict on the NULL bucket too.

CREATE TABLE IF NOT EXISTS moderation_reject_counts (
    id          SERIAL PRIMARY KEY,
    day         DATE NOT NULL,
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    reasons     JSONB NOT NULL DEFAULT '{}'::jsonb,
    count       INT NOT NULL DEFAULT 0 CHECK (count >= 0),
    CONSTRAINT moderation_reject_counts_day_tenant_key UNIQUE NULLS NOT DISTINCT (day, tenant_id)
);

-- Subscriptions: one per user. Only moderators (worker and above) are expected to hold one;
-- the scheduler re-checks the role before sending.
CREATE TABLE IF NOT EXISTS moderation_digest_subscriptions (
    id            SERIAL PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    frequency     VARCHAR(10) NOT NULL CHECK (frequency IN ('daily', 'weekly')),
    channel       VARCHAR(10) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'inapp')),
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    last_sent_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT moderation_digest_subscriptions_user_key UNIQUE (user_id)
);
