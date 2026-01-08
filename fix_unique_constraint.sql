-- Step 1: Find ALL constraints on the word_challenge_responses table
-- Run this first to see what constraints exist
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        WHEN 'x' THEN 'EXCLUSION'
        ELSE 'OTHER'
    END AS constraint_type_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'word_challenge_responses'::regclass
ORDER BY contype, conname;

-- Step 2: After running Step 1, look for a UNIQUE constraint that involves entry_id and participant_id
-- Then run this, replacing 'CONSTRAINT_NAME_HERE' with the actual name from Step 1:
-- ALTER TABLE word_challenge_responses DROP CONSTRAINT CONSTRAINT_NAME_HERE;

-- Step 3: OR, try this automated approach to drop ALL unique constraints except primary key:
DO $$
DECLARE
    constraint_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint 
        WHERE conrelid = 'word_challenge_responses'::regclass 
          AND contype = 'u'
          AND conname != 'word_challenge_responses_pkey'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE word_challenge_responses DROP CONSTRAINT ' || quote_ident(constraint_record.conname);
            RAISE NOTICE 'Successfully dropped constraint: % (Definition: %)', constraint_record.conname, constraint_record.definition;
            dropped_count := dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop constraint %: %', constraint_record.conname, SQLERRM;
        END;
    END LOOP;
    
    IF dropped_count = 0 THEN
        RAISE NOTICE 'No unique constraints found to drop (excluding primary key)';
    ELSE
        RAISE NOTICE 'Total constraints dropped: %', dropped_count;
    END IF;
END $$;

-- Step 4: Verify - this should return only the primary key (or nothing if no unique constraints remain)
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'word_challenge_responses'::regclass
  AND contype = 'u';


