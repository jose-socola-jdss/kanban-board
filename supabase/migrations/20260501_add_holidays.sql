create table if not exists public.holidays (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists holidays_user_id_idx on public.holidays(user_id);
create index if not exists holidays_user_id_date_idx on public.holidays(user_id, date);

alter table public.holidays enable row level security;

drop policy if exists "holidays_select_own" on public.holidays;
create policy "holidays_select_own"
on public.holidays for select
using (auth.uid() = user_id);

drop policy if exists "holidays_insert_own" on public.holidays;
create policy "holidays_insert_own"
on public.holidays for insert
with check (auth.uid() = user_id);

drop policy if exists "holidays_update_own" on public.holidays;
create policy "holidays_update_own"
on public.holidays for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "holidays_delete_own" on public.holidays;
create policy "holidays_delete_own"
on public.holidays for delete
using (auth.uid() = user_id);
