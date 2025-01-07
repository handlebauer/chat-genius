# Database Seeds

This directory contains SQL seed files for initializing the database with default data.

## Files

- `01_channels.sql`: Creates default channels (#general and #ai)

## How to Use

1. Make sure you have Supabase CLI installed:
   ```bash
   npx supabase --version
   ```

2. Start your local Supabase instance:
   ```bash
   npx supabase start
   ```

3. Run the seed files:
   ```bash
   npx supabase db reset
   ```
   This will automatically run all SQL files in the `supabase/seed.sql` file.

4. Alternatively, you can run specific seed files:
   ```bash
   npx supabase db push --db-only
   ```

## Project Setup

1. Create a `supabase/seed.sql` file in your project root:
   ```bash
   mkdir -p supabase
   cat src/lib/supabase/seeds/01_channels.sql > supabase/seed.sql
   ```

2. The seeds will automatically run when you:
   - Run `npx supabase db reset`
   - Deploy to Supabase using `npx supabase db push`

## Notes

- The seed files use `ON CONFLICT DO NOTHING` to prevent duplicate entries
- The `created_by` field uses 'system' as a placeholder. In production, you should update this to use the first admin user's ID
- Indexes are created automatically for better query performance
