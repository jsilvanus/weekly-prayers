-- Rule-based moderation of public prayer requests (two gates, human-editable).
-- Idempotent: safe to run more than once.
--
-- redacted_content is the ONLY text that may be shown publicly for type = 'public'.
-- original_content of public prayers is visible to staff only.
-- moderation_findings stores finding types and offsets only, never matched values.

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS redacted_content TEXT;
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS redaction_status VARCHAR(20);
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS redaction_source VARCHAR(10);
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS moderation_findings JSONB;

CREATE TABLE IF NOT EXISTS moderation_decisions (
    id          SERIAL PRIMARY KEY,
    prayer_id   UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
    actor       VARCHAR(100) NOT NULL,
    decision    VARCHAR(30) NOT NULL,
    reasons     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_decisions_prayer_id ON moderation_decisions(prayer_id);

-- Backfill legacy public prayers. Only rows that have not been given a status yet are touched,
-- so re-running this migration never overwrites decisions made by the new flow.
UPDATE prayer_requests
SET redacted_content = COALESCE(sanitized_content, original_content),
    redaction_source = 'legacy',
    redaction_status = 'redacted'
WHERE type = 'public'
  AND is_approved = true
  AND redaction_status IS NULL;

UPDATE prayer_requests
SET redacted_content = sanitized_content,
    redaction_source = 'legacy',
    redaction_status = 'needs_review'
WHERE type = 'public'
  AND is_approved = false
  AND redaction_status IS NULL;
