-- Boletim mensal em PDF por e-mail (mesmos destinatários dos avisos de chuva).
-- Execute no SQL Editor do Supabase DEPOIS do notifications.sql.
-- Pode ser executado de novo sem perder dados.

-- Liga/desliga o envio do boletim no fechamento de cada mês
alter table public.notification_settings
  add column if not exists monthly_report boolean not null default false;

-- O histórico passa a registrar o boletim mensal (período AAAA-MM) e os envios de teste do boletim
alter table public.notification_log add column if not exists period text;

alter table public.notification_log drop constraint if exists notification_log_kind_check;
alter table public.notification_log
  add constraint notification_log_kind_check check (kind in ('rain', 'test', 'monthly', 'report_test'));

-- 'sending' reserva o período enquanto o e-mail sai: dois navegadores abertos no
-- mesmo dia não enviam o boletim duas vezes
alter table public.notification_log drop constraint if exists notification_log_status_check;
alter table public.notification_log
  add constraint notification_log_status_check check (status in ('sending', 'sent', 'error'));

create unique index if not exists notification_log_monthly_once
  on public.notification_log (period)
  where kind = 'monthly' and status in ('sending', 'sent');
