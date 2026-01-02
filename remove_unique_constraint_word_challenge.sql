-- Migration: Remove UNIQUE constraint from word_challenge_responses
-- This allows multiple responses per participant per word to track learning journey
-- Run this in your Supabase SQL editor

-- Drop the unique constraint if it exists
ALTER TABLE word_challenge_responses 
DROP CONSTRAINT IF EXISTS word_challenge_responses_entry_id_participant_id_key;

-- Verify the constraint is removed
-- You can check with: SELECT * FROM pg_constraint WHERE conrelid = 'word_challenge_responses'::regclass;

