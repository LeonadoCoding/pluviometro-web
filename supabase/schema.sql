-- Pluviômetro Oilema: execute este script no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.rain_records (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  rain_mm numeric(8,1) not null check (rain_mm >= 0),
  safra text not null,
  property text not null default 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS',
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pluviometro_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.rain_records enable row level security;
alter table public.pluviometro_admins enable row level security;

drop policy if exists "Authenticated users can read rain records" on public.rain_records;
create policy "Authenticated users can read rain records"
  on public.rain_records for select to authenticated using (true);

drop policy if exists "Admins can insert rain records" on public.rain_records;
create policy "Admins can insert rain records"
  on public.rain_records for insert to authenticated
  with check (exists (select 1 from public.pluviometro_admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can update rain records" on public.rain_records;
create policy "Admins can update rain records"
  on public.rain_records for update to authenticated
  using (exists (select 1 from public.pluviometro_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.pluviometro_admins a where a.user_id = (select auth.uid())));

drop policy if exists "Admins can delete rain records" on public.rain_records;
create policy "Admins can delete rain records"
  on public.rain_records for delete to authenticated
  using (exists (select 1 from public.pluviometro_admins a where a.user_id = (select auth.uid())));

revoke all on public.pluviometro_admins from anon, authenticated;
grant select, insert, update, delete on public.rain_records to authenticated;
grant execute on function public.is_pluviometro_admin() to authenticated;

create or replace function public.is_pluviometro_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pluviometro_admins a
    where a.user_id = (select auth.uid())
  );
$$;

-- Depois de criar seu usuário em Authentication > Users, rode:
-- substitua pelo UUID e e-mail reais exibidos no painel Supabase.
-- insert into public.pluviometro_admins (user_id, email)
-- values ('UUID-DO-USUARIO', 'seu-email@exemplo.com');
