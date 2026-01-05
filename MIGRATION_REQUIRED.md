# Database Migration Required

## Issue
If you're getting an error: "Could not find the pronunciation_IPA column of word_metadata in the schema cache"

This means the pronunciation fields migration hasn't been run yet.

## Solution

### Step 1: Run the Pronunciation Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add_pronunciation_fields.sql`
4. Run the SQL script

This will add the `pronunciation_ipa` and `pronunciation_respelling` columns to the `word_metadata` table.

### Step 2: Run the Streak Gamification Migration

If you haven't already, also run:
- `create_streak_gamification_tables.sql`

## What the Code Does Now

The code has been updated to handle missing columns gracefully:
- If `pronunciation_ipa` or `pronunciation_respelling` columns don't exist, they won't be included in the insert
- The code will still work with the legacy `pronunciation` field
- You'll get a helpful error message pointing you to the migration if something else goes wrong

However, **you should still run the migration** to get the full functionality of the pronunciation fields.

