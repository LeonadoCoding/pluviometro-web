import { getSupabaseConfig, getValidAccessToken } from './auth';

// Previsão de chuva dos próximos dias (Edge Function rain-forecast → OpenWeatherMap, com cache de 1 hora)
export async function fetchRainForecast() {
  const { url, anonKey } = getSupabaseConfig();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch(`${url}/functions/v1/rain-forecast`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) throw new Error('A função de previsão ainda não foi publicada no Supabase.');
  if (!response.ok) throw new Error(data.error || 'Não foi possível obter a previsão agora.');
  return data;
}
