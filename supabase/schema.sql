create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits_remaining integer not null default 1,
  last_credit_granted_on date,
  offer_started_at timestamptz,
  offer_expires_at timestamptz,
  billing_info text default 'Billing not connected',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text,
  video_url text not null,
  video_title text,
  transcript text not null,
  language text,
  transcript_method text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.transcripts enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can view own transcripts" on public.transcripts;
create policy "Users can view own transcripts"
on public.transcripts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own transcripts" on public.transcripts;
create policy "Users can insert own transcripts"
on public.transcripts
for insert
with check (auth.uid() = user_id);
