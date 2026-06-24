create extension if not exists pgcrypto with schema extensions;

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "Users can read their own saves" on public.saves;
create policy "Users can read their own saves"
on public.saves
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own saves" on public.saves;
create policy "Users can create their own saves"
on public.saves
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own saves" on public.saves;
create policy "Users can update their own saves"
on public.saves
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saves" on public.saves;
create policy "Users can delete their own saves"
on public.saves
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_saves_updated_at on public.saves;

create trigger set_saves_updated_at
before update on public.saves
for each row
execute function public.set_updated_at();
