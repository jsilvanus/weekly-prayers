-- Migration 002: Add coordinator role, highlight priorities, and ministry tags/groups

-- Add 'coordinator' to user_role enum if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'coordinator' 
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'coordinator' AFTER 'worker';
    END IF;
END $$;

-- Add highlight priority (z-value) and ministry categorization to prayer_requests
ALTER TABLE prayer_requests 
ADD COLUMN IF NOT EXISTS highlight_priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ministry_group VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS ministry_tag VARCHAR(100);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_prayers_highlight ON prayer_requests(highlight_priority DESC);
CREATE INDEX IF NOT EXISTS idx_prayers_ministry ON prayer_requests(ministry_group, ministry_tag);
