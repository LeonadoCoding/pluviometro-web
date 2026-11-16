-- Cache da previsão de chuva (OpenWeatherMap), usado pela Edge Function rain-forecast.
-- Execute no SQL Editor do Supabase. Pode ser executado de novo.
-- Nenhum acesso pelo site: só a função (chave de serviço) lê e grava.

create table if not exists public.forecast_cache (
  id smallint primary key default 1 check (id = 1),
  fetched_at timestamptz not null,
  payload jsonb not null
);
alter table public.forecast_cache enable row level security;
revoke all on public.forecast_cache from anon, authenticated;
