-- Avisos de chuva por e-mail (Brevo).
-- Execute este script no SQL Editor do Supabase DEPOIS do schema.sql.
-- Pode ser executado de novo sem perder as configurações salvas.

-- Configuração única (linha id = 1) editada pela tela "Notificações" do site
create table if not exists public.notification_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  recipients text[] not null default '{}',
  min_rain_mm numeric(8,1) not null default 0 check (min_rain_mm >= 0),
  notify_on_update boolean not null default false,
  -- Só avisa leituras recentes: evita uma enxurrada de e-mails ao importar backups
  max_age_days smallint not null default 3 check (max_age_days between 0 and 60),
  updated_at timestamptz not null default now()
);
insert into public.notification_settings (id) values (1) on conflict (id) do nothing;

-- Histórico dos envios (exibido na tela de Notificações)
create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('rain', 'test')),
  record_date date,
  rain_mm numeric(8,1),
  recipients text[] not null default '{}',
  status text not null check (status in ('sent', 'error')),
  error text
);

alter table public.notification_settings enable row level security;
alter table public.notification_log enable row level security;
revoke all on public.notification_settings from anon;
revoke all on public.notification_log from anon;
grant select, update on public.notification_settings to authenticated;
grant select on public.notification_log to authenticated;

-- Apenas administradores leem e alteram as configurações e o histórico.
-- A Edge Function usa a chave de serviço (não passa pelo RLS) para ler e registrar envios.
drop policy if exists "Admins can read notification settings" on public.notification_settings;
create policy "Admins can read notification settings"
  on public.notification_settings for select to authenticated
  using ((select public.is_pluviometro_admin()));

drop policy if exists "Admins can update notification settings" on public.notification_settings;
create policy "Admins can update notification settings"
  on public.notification_settings for update to authenticated
  using ((select public.is_pluviometro_admin()))
  with check ((select public.is_pluviometro_admin()));

drop policy if exists "Admins can read notification log" on public.notification_log;
create policy "Admins can read notification log"
  on public.notification_log for select to authenticated
  using ((select public.is_pluviometro_admin()));
