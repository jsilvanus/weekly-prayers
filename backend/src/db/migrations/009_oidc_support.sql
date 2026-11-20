-- Migration 009: Make microsoft_oid optional and add oidc_sub for OIDC / Tunnus authentication

ALTER TABLE users ALTER COLUMN microsoft_oid DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_sub VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_oidc_sub ON users(oidc_sub);
