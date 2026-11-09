-- Migration 003: Allow 'bishop' prayer type in prayer_requests check constraint

ALTER TABLE prayer_requests DROP CONSTRAINT IF EXISTS prayer_requests_type_check;

ALTER TABLE prayer_requests ADD CONSTRAINT prayer_requests_type_check
CHECK (type IN ('pastor', 'staff', 'public', 'bishop'));
