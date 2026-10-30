-- Usuários e perfis de acesso: administrador, alimentador e visualizador.
-- Execute no SQL Editor do Supabase DEPOIS de schema.sql e notifications.sql.
-- Pode ser executado de novo sem perder os usuários cadastrados.
--
-- admin        tudo (lançar, editar, excluir, importar, avisos por e-mail, usuários)
-- alimentador  vê tudo, gera PDF e lança/corrige chuvas
-- visualizador vê tudo e gera PDF

create table if not exists public.pluviometro_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role text not null check (role in ('admin', 'alimentador', 'visualizador')),
  created_at timestamptz not null default now()
);
alter table public.pluviometro_users enable row level security;
revoke all on public.pluviometro_users from anon;
grant select on public.pluviometro_users to authenticated;

-- Administradores já cadastrados continuam administradores
insert into public.pluviometro_users (user_id, email, role)
select user_id, email, 'admin' from public.pluviometro_admins
on conflict (user_id) do nothing;

-- Perfil de quem está logado (null = conta sem acesso ao painel)
create or replace function public.pluviometro_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.role from public.pluviometro_users u where u.user_id = (select auth.uid())),
    (select 'admin' from public.pluviometro_admins a where a.user_id = (select auth.uid()))
  );
$$;

create or replace function public.is_pluviometro_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.pluviometro_role() = 'admin', false);
$$;

create or replace function public.can_launch_rain()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.pluviometro_role() in ('admin', 'alimentador'), false);
$$;

revoke all on function public.pluviometro_role() from public, anon;
revoke all on function public.can_launch_rain() from public, anon;
grant execute on function public.pluviometro_role() to authenticated;
grant execute on function public.can_launch_rain() to authenticated;

-- Cada pessoa lê o próprio cadastro; administradores leem todos.
-- Criar, alterar e remover usuários só pela Edge Function manage-users (chave de serviço).
drop policy if exists "Users read own row, admins read all" on public.pluviometro_users;
create policy "Users read own row, admins read all"
  on public.pluviometro_users for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_pluviometro_admin()));

-- Chuvas: qualquer perfil lê; admin e alimentador lançam e corrigem; só admin exclui.
alter policy "Authenticated users can read rain records" on public.rain_records
  using ((select public.pluviometro_role()) is not null);
alter policy "Admins can insert rain records" on public.rain_records
  with check ((select public.can_launch_rain()));
alter policy "Admins can update rain records" on public.rain_records
  using ((select public.can_launch_rain()))
  with check ((select public.can_launch_rain()));
