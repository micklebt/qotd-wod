-- Simple script to find and remove the UNIQUE constraint
-- Run this ENTIRE script in your Supabase SQL editor

-- Step 1: Show all constraints on the table
SELECT 
    conname AS constraint_name,
    CASE contype
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'p' THEN 'PRIMARY KEY'
        ELSE 'OTHER'
    END AS type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'word_challenge_responses'::regclass
ORDER BY contype;

-- Step 2: Remove the unique constraint (run this after seeing the constraint name above)
-- Replace 'YOUR_CONSTRAINT_NAME' with the actual name from Step 1
-- Common names might be:
--   - word_challenge_responses_entry_id_participant_id_key
--   - word_challenge_responses_pkey (this is the PRIMARY KEY - DON'T drop this!)
--   - Or some other auto-generated name

-- Try these common names first:
ALTER TABLE word_challenge_responses DROP CONSTRAINT IF EXISTS word_challenge_responses_entry_id_participant_id_key;

-- If that doesn't work, use this to drop ALL unique constraints except primary key:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'word_challenge_responses'::regclass 
          AND contype = 'u'
          AND conname != 'word_challenge_responses_pkey'
    LOOP
        EXECUTE format('ALTER TABLE word_challenge_responses DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Step 3: Verify it's gone (should only show primary key now)
SELECT 
    conname AS constraint_name,
    contype AS type
FROM pg_constraint
WHERE conrelid = 'word_challenge_responses'::regclass
  AND contype = 'u';

