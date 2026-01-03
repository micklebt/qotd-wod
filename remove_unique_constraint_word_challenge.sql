-- -- Migration: Remove UNIQUE constraint from word_challenge_responses
-- -- This allows multiple responses per participant per word to track learning journey
-- -- Run this in your Supabase SQL editor

-- -- Method 1: Try dropping with common constraint names
-- ALTER TABLE word_challenge_responses 
-- DROP CONSTRAINT IF EXISTS word_challenge_responses_entry_id_participant_id_key;

-- -- Method 2: Find and drop all unique constraints (except primary key)
-- DO $$
-- DECLARE
--     constraint_name text;
-- BEGIN
--     FOR constraint_name IN 
--         SELECT conname 
--         FROM pg_constraint 
--         WHERE conrelid = 'word_challenge_responses'::regclass 
--           AND contype = 'u'
--           AND conname != 'word_challenge_responses_pkey'
--     LOOP
--         EXECUTE 'ALTER TABLE word_challenge_responses DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
--         RAISE NOTICE 'Dropped constraint: %', constraint_name;
--     END LOOP;
-- END $$;

-- -- Verify the constraint is removed (should return no rows)
-- SELECT 
--     conname AS constraint_name,
--     contype AS constraint_type,
--     pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conrelid = 'word_challenge_responses'::regclass
--   AND contype = 'u'
--   AND conname != 'word_challenge_responses_pkey';

