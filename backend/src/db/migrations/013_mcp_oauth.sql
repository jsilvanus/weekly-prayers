-- Migration 013: Add tables for MCP OAuth 2.1 PKCE authorization server

CREATE TABLE IF NOT EXISTS mcp_authorization_codes (
    code VARCHAR(128) PRIMARY KEY,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    challenge VARCHAR(128) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    scope VARCHAR(255) NOT NULL DEFAULT 'mcp',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_codes_expires ON mcp_authorization_codes(expires_at);

CREATE TABLE IF NOT EXISTS mcp_refresh_tokens (
    token VARCHAR(128) PRIMARY KEY,
    client_id TEXT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    scope VARCHAR(255) NOT NULL DEFAULT 'mcp',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_refresh_tokens ON mcp_refresh_tokens(token, client_id);
