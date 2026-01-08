-- Find and remove UNIQUE constraint from word_challenge_responses table
-- Run this in your Supabase SQL editor

-- Step 1: Find the constraint name
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'word_challenge_responses'::regclass
  AND contype = 'u'
  AND (pg_get_constraintdef(oid) LIKE '%entry_id%' OR pg_get_constraintdef(oid) LIKE '%participant_id%');

-- Step 2: After running the above, you'll see the constraint name
-- Then run this (replace 'constraint_name_here' with the actual name from Step 1):
-- ALTER TABLE word_challenge_responses DROP CONSTRAINT constraint_name_here;

-- OR, if the constraint name follows the pattern, try this:
ALTER TABLE word_challenge_responses 
DROP CONSTRAINT IF EXISTS word_challenge_responses_entry_id_participant_id_key;

ALTER TABLE word_challenge_responses 
DROP CONSTRAINT IF EXISTS word_challenge_responses_pkey;

-- If the above doesn't work, try finding all unique constraints:
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'word_challenge_responses'::regclass 
          AND contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE word_challenge_responses DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Verify the constraint is removed
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'word_challenge_responses'::regclass
  AND contype = 'u';


