-- Migration 023: Weekly prayer email
-- Mailing lists (tenant-scoped), subscribers with consent tracking,
-- prayer mailings (one-off week or recurring weekly) and a send log
-- whose unique key is the idempotency claim for scheduled sends.

-- 1. Lists
CREATE TABLE IF NOT EXISTS mailing_lists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(120) NOT NULL,
    description         TEXT,
    allow_public_signup BOOLEAN NOT NULL DEFAULT FALSE,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mailing_lists_tenant ON mailing_lists(tenant_id);

-- 2. Subscribers (only status 'active' receives mail; 'unsubscribed' rows are kept as suppression)
CREATE TABLE IF NOT EXISTS mailing_subscribers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id         UUID NOT NULL REFERENCES mailing_lists(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(120),
    status          VARCHAR(16) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'unsubscribed')),
    consent_source  VARCHAR(20) NOT NULL
                    CHECK (consent_source IN ('self_signup', 'admin_attested')),
    consent_at      TIMESTAMPTZ,
    added_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mailing_subscribers_list_email_key UNIQUE (list_id, email),
    CONSTRAINT mailing_subscribers_email_lower CHECK (email = lower(email)),
    CONSTRAINT mailing_subscribers_active_consent CHECK (status <> 'active' OR consent_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mailing_subscribers_list_status ON mailing_subscribers(list_id, status);

-- 3. Mailings: 'week' = one specific week on given send dates, 'recurring' = every week on a weekday
CREATE TABLE IF NOT EXISTS prayer_mailings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    -- Target: exactly one of a mailing list (target_type 'list') or a user role in the tenant ('role')
    list_id         UUID REFERENCES mailing_lists(id) ON DELETE RESTRICT,
    target_type     VARCHAR(8) NOT NULL DEFAULT 'list' CHECK (target_type IN ('list', 'role')),
    target_role     VARCHAR(20) CHECK (target_role IN ('coordinator', 'worker', 'bishop', 'devotion', 'prayer_group', 'user')),
    name            VARCHAR(120) NOT NULL,
    kind            VARCHAR(12) NOT NULL CHECK (kind IN ('week', 'recurring')),
    week            INT CHECK (week BETWEEN 1 AND 53),
    year            INT,
    send_dates      DATE[],
    send_weekday    SMALLINT CHECK (send_weekday BETWEEN 0 AND 6),
    start_date      DATE,
    end_date        DATE,
    send_hour       SMALLINT NOT NULL DEFAULT 8 CHECK (send_hour BETWEEN 0 AND 23),
    subject         VARCHAR(200),
    include_public  BOOLEAN NOT NULL DEFAULT FALSE,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT prayer_mailings_target_check CHECK (
        (target_type = 'list' AND list_id IS NOT NULL AND target_role IS NULL)
        OR
        (target_type = 'role' AND target_role IS NOT NULL AND list_id IS NULL)
    ),
    CONSTRAINT prayer_mailings_schedule_check CHECK (
        (kind = 'week'
            AND week IS NOT NULL AND year IS NOT NULL
            AND send_dates IS NOT NULL AND cardinality(send_dates) > 0)
        OR
        (kind = 'recurring'
            AND send_weekday IS NOT NULL AND start_date IS NOT NULL
            AND (end_date IS NULL OR end_date >= start_date))
    )
);

CREATE INDEX IF NOT EXISTS idx_prayer_mailings_tenant ON prayer_mailings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prayer_mailings_list ON prayer_mailings(list_id);

-- 4. Opt-outs for role-targeted mailings (users have no list; the unsubscribe link opts the user out per tenant)
CREATE TABLE IF NOT EXISTS mailing_optouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mailing_optouts_tenant_email_key UNIQUE (tenant_id, email),
    CONSTRAINT mailing_optouts_email_lower CHECK (email = lower(email))
);

-- 5. Send log; (mailing_id, send_date) is the idempotency claim for the scheduler
CREATE TABLE IF NOT EXISTS mailing_sends (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mailing_id      UUID NOT NULL REFERENCES prayer_mailings(id) ON DELETE CASCADE,
    send_date       DATE NOT NULL,
    status          VARCHAR(12) NOT NULL CHECK (status IN ('sending', 'sent', 'failed', 'skipped')),
    recipients      INT NOT NULL DEFAULT 0,
    failed          INT NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    CONSTRAINT mailing_sends_mailing_date_key UNIQUE (mailing_id, send_date)
);
