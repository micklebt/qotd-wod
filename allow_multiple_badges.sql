-- Allow multiple Bronze and Silver badges per participant
-- This removes the unique constraint on (participant_id, badge_type)
-- to allow earning multiple lower-level badges

-- Drop the existing unique constraint
ALTER TABLE participant_badges DROP CONSTRAINT IF EXISTS participant_badges_participant_id_badge_type_key;

-- Add an index for faster lookups (non-unique)
CREATE INDEX IF NOT EXISTS idx_participant_badges_participant_badge_type 
ON participant_badges(participant_id, badge_type);
