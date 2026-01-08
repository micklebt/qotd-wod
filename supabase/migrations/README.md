# Database Migrations

## Running Migrations

To apply the participants table migration to your Supabase database:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `001_create_participants_table.sql`
4. Paste and run the SQL in the SQL Editor

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or to apply a specific migration:

```bash
supabase migration up
```

## Migration: Create Participants Table

This migration creates a `participants` table with the following structure:

- `id` (UUID, Primary Key) - Uses the same UUIDs as the constants file
- `name` (VARCHAR) - Participant name
- `mobile_phone` (VARCHAR, nullable) - Mobile phone number
- `email` (VARCHAR, nullable) - Email address
- `created_at` (TIMESTAMP) - Auto-set on creation
- `updated_at` (TIMESTAMP) - Auto-updated on changes

The migration also:
- Inserts the three existing participants (Brian Mickley, Erik Beachy, Ryan Mann)
- Creates a foreign key constraint linking `entries.submitted_by_user_id` to `participants.id`
- Sets up automatic `updated_at` timestamp updates

## After Running the Migration

Once the migration is complete, you can:
1. Update participant information (phone, email) directly in the Supabase dashboard
2. The application will automatically use the database participants instead of constants
3. Add new participants by inserting rows into the `participants` table


