-- Initial database schema for Weekly Prayers application

-- User role enum
CREATE TYPE user_role AS ENUM ('admin', 'worker', 'user');

-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microsoft_oid   VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    role            user_role DEFAULT 'user',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login      TIMESTAMPTZ
);

-- Prayer requests table
CREATE TABLE prayer_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    type                VARCHAR(20) NOT NULL CHECK (type IN ('pastor', 'staff', 'public')),
    original_content    TEXT NOT NULL,
    sanitized_content   TEXT,
    ai_flagged          BOOLEAN DEFAULT FALSE,
    ai_flag_reason      TEXT,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    is_approved         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Prayer counts table for weekly statistics
CREATE TABLE prayer_counts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_number INTEGER NOT NULL,
    year        INTEGER NOT NULL,
    count       INTEGER DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(week_number, year)
);

-- Indexes for performance
CREATE INDEX idx_prayers_dates ON prayer_requests(start_date, end_date);
CREATE INDEX idx_prayers_type ON prayer_requests(type);
CREATE INDEX idx_prayers_approved ON prayer_requests(is_approved) WHERE is_approved = true;
CREATE INDEX idx_users_microsoft ON users(microsoft_oid);
CREATE INDEX idx_users_email ON users(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for prayer_requests updated_at
CREATE TRIGGER update_prayer_requests_updated_at
    BEFORE UPDATE ON prayer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
