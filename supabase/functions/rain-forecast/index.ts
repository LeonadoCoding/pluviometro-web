// Edge Function: previsão de chuva dos próximos dias para a UBS (OpenWeatherMap, plano gratuito).
//
// Chamada pelo site com o token do usuário logado (qualquer perfil do Pluviômetro)
// ou pelo banco com o cabeçalho x-webhook-secret (segredo do Vault, ver notifications.sql).
// A resposta da OpenWeatherMap fica em cache por 1 hora na tabela forecast_cache
// (supabase/forecast.sql), o que mantém o uso bem abaixo do limite gratuito.
//
// Segredo necessário (Edge Functions → Secrets): OPENWEATHER_API_KEY
// Opcionais: FORECAST_LAT, FORECAST_LON (padrão: UBS Placas, as mesmas de src/config/location.js)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TIME_ZONE = 'America/Bahia';
const CACHE_MINUTES = 60;
const LAT = Number(Deno.env.get('FORECAST_LAT') ?? '-11.834958');
const LON = Number(Deno.env.get('FORECAST_LON') ?? '-46.293266');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Qualquer usuário cadastrado no Pluviômetro (admin, alimentador ou visualizador),
// ou uma chamada do próprio banco com o segredo do Vault (testes e pré-carregamento)
async function requireMember(req: Request) {
  const secret = req.headers.get('x-webhook-secret');
  if (secret) {
    const { data: valid } = await admin.rpc('verify_notify_rain_secret', { candidate: secret });
    if (valid) return;
    throw new HttpError(401, 'Não autorizado.');
  }
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  const { data: member } = await admin.from('pluviometro_users').select('role').eq('user_id', data.user.id).maybeSingle();
  if (member) return;
  const { data: legacy } = await admin.from('pluviometro_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!legacy) throw new HttpError(403, 'Seu usuário não tem acesso ao Pluviômetro.');
}

const localDate = (unixSeconds: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(unixSeconds * 1000));
const localHour = (unixSeconds: number) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hour12: false }).format(new Date(unixSeconds * 1000)));

type DaySummary = {
  date: string;
  rain_mm: number;
  pop_max: number;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  periods: number;
};

// Resume os períodos de 3 horas da OpenWeatherMap por dia (horário da Bahia)
function summarize(raw: any) {
  const days = new Map<string, DaySummary & { _descHour: number }>();
  for (const item of raw.list ?? []) {
    const date = localDate(item.dt);
    const hour = localHour(item.dt);
    const rain = Number(item.rain?.['3h'] ?? 0);
    const weather = item.weather?.[0] ?? {};
    let day = days.get(date);
    if (!day) {
      day = { date, rain_mm: 0, pop_max: 0, temp_min: Infinity, temp_max: -Infinity, description: '', icon: '', periods: 0, _descHour: 99 };
      days.set(date, day);
    }
    day.rain_mm += rain;
    day.pop_max = Math.max(day.pop_max, Number(item.pop ?? 0));
    day.temp_min = Math.min(day.temp_min, Number(item.main?.temp_min ?? item.main?.temp));
    day.temp_max = Math.max(day.temp_max, Number(item.main?.temp_max ?? item.main?.temp));
    day.periods += 1;
    // Descrição do período mais próximo do meio-dia
    if (Math.abs(hour - 12) < Math.abs(day._descHour - 12)) {
      day._descHour = hour;
      day.description = weather.description ?? '';
      day.icon = weather.icon ?? '';
    }
  }
  return [...days.values()].map(({ _descHour, ...d }) => ({
    ...d,
    rain_mm: Math.round(d.rain_mm * 10) / 10,
    pop_max: Math.round(d.pop_max * 100),
    temp_min: Math.round(d.temp_min),
    temp_max: Math.round(d.temp_max)
  }));
}

async function fetchForecast() {
  const key = Deno.env.get('OPENWEATHER_API_KEY');
  if (!key) throw new HttpError(503, 'A chave da OpenWeatherMap ainda não foi configurada no Supabase.');
  const base = Deno.env.get('OPENWEATHER_API_URL') ?? 'https://api.openweathermap.org';
  const url = `${base}/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&lang=pt_br&appid=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (res.status === 401) throw new HttpError(503, 'A OpenWeatherMap recusou a chave. Chaves novas podem levar até 2 horas para serem ativadas.');
  if (!res.ok) throw new HttpError(502, `A OpenWeatherMap respondeu ${res.status}. Tente novamente mais tarde.`);
  const raw = await res.json();
  return {
    source: 'OpenWeatherMap',
    location: { lat: LAT, lon: LON, name: raw.city?.name ?? null },
    days: summarize(raw)
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    await requireMember(req);

    const { data: cached } = await admin.from('forecast_cache').select('fetched_at, payload').eq('id', 1).maybeSingle();
    const age = cached ? (Date.now() - Date.parse(cached.fetched_at)) / 60_000 : Infinity;
    if (cached && age < CACHE_MINUTES) return json({ ...cached.payload, fetched_at: cached.fetched_at });

    try {
      const payload = await fetchForecast();
      const fetched_at = new Date().toISOString();
      await admin.from('forecast_cache').upsert({ id: 1, fetched_at, payload });
      return json({ ...payload, fetched_at });
    } catch (err) {
      // Falhou agora, mas há uma previsão anterior: devolve a anterior, marcada como desatualizada
      if (cached) return json({ ...cached.payload, fetched_at: cached.fetched_at, stale: true });
      throw err;
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: 'Não foi possível obter a previsão agora.' }, 500);
  }
});
