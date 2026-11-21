-- Migration 011: Add highlight_start_date and highlight_end_date to prayer_requests
-- Allows prayer highlights to have an active time window, defaulting to one week

ALTER TABLE prayer_requests 
ADD COLUMN IF NOT EXISTS highlight_start_date DATE,
ADD COLUMN IF NOT EXISTS highlight_end_date DATE;

-- Backfill any existing highlighted prayers that don't have highlight dates
UPDATE prayer_requests
SET highlight_start_date = COALESCE(start_date, CURRENT_DATE),
    highlight_end_date = COALESCE(end_date, CURRENT_DATE + INTERVAL '6 days')
WHERE highlight_priority > 0 AND highlight_start_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_prayers_highlight_dates 
ON prayer_requests(highlight_start_date, highlight_end_date)
WHERE highlight_priority > 0;
