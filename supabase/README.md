# Supabase setup

## Contacts table (public.contacts)

Contacts are saved **offline-first**: SQLite on device → sync → Supabase.

- **Table:** `public.contacts`
- **Columns:** `id`, `user_id`, `first_name`, `last_name`, `phone`, `email`, `company`, `created_at`, `updated_at`

Run the migration in your Supabase project:

1. Open [Supabase Dashboard](https://app.supabase.com) → your project → **SQL Editor**.
2. Copy the contents of `migrations/20250101000000_create_contacts.sql` and run it.

If you already have a `contacts` table with a `name` column, add columns and backfill instead:

```sql
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company text;
UPDATE public.contacts SET first_name = split_part(name, ' ', 1), last_name = nullif(trim(substring(name from position(' ' in name))), '') WHERE first_name IS NULL AND name IS NOT NULL;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS name;
```
