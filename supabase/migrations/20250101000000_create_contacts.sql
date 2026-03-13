-- Contacts table: first_name, last_name, phone, email, company (aligned with shared types).
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_created_at_idx on public.contacts(created_at desc);

alter table public.contacts enable row level security;

create policy "Users can read own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);
