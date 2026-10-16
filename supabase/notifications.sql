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

-- ---------------------------------------------------------------------------
-- Disparo automático: gatilho em rain_records → Edge Function notify-rain
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

-- Segredo compartilhado entre o gatilho e a função, gerado e guardado no Vault (ninguém precisa copiá-lo)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notify_rain_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'notify_rain_webhook_secret',
      'Segredo do gatilho de avisos de chuva (notify-rain)');
  end if;
end $$;

-- Usada pela Edge Function para validar o cabeçalho recebido; só a chave de serviço pode executá-la
create or replace function public.verify_notify_rain_secret(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'notify_rain_webhook_secret' and decrypted_secret = candidate
  );
$$;
revoke all on function public.verify_notify_rain_secret(text) from public, anon, authenticated;
grant execute on function public.verify_notify_rain_secret(text) to service_role;

create or replace function public.notify_rain_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  -- Leituras com mais de 60 dias (importações de backup) nem chamam a função
  if new.date < (now() at time zone 'America/Bahia')::date - 60 then
    return new;
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'notify_rain_webhook_secret';
  if secret is null then
    return new;
  end if;
  perform net.http_post(
    url := 'https://vnsnolwciccklwlpnoui.supabase.co/functions/v1/notify-rain',
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;
revoke all on function public.notify_rain_after_write() from public, anon, authenticated;

drop trigger if exists notify_rain_after_write on public.rain_records;
create trigger notify_rain_after_write
  after insert or update on public.rain_records
  for each row execute function public.notify_rain_after_write();
