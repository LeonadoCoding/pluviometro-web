import { supabaseFetch } from './api';
import { getSupabaseConfig, getValidAccessToken } from './auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => EMAIL_RE.test(String(email).trim());

export async function fetchNotificationSettings() {
  const rows = await supabaseFetch('notification_settings?id=eq.1&select=*');
  if (!rows?.length) {
    throw new Error('Configuração de avisos não encontrada. Execute o arquivo supabase/notifications.sql no Supabase.');
  }
  return rows[0];
}

export async function saveNotificationSettings(settings) {
  const recipients = [...new Set((settings.recipients || []).map(e => e.trim().toLowerCase()).filter(Boolean))];
  const invalid = recipients.find(e => !isValidEmail(e));
  if (invalid) throw new Error(`E-mail inválido: ${invalid}`);
  const rows = await supabaseFetch('notification_settings?id=eq.1', {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      enabled: Boolean(settings.enabled),
      recipients,
      min_rain_mm: Math.max(0, Number(settings.min_rain_mm) || 0),
      notify_on_update: Boolean(settings.notify_on_update),
      max_age_days: Math.min(60, Math.max(0, parseInt(settings.max_age_days, 10) || 0)),
      updated_at: new Date().toISOString()
    })
  });
  return rows?.[0];
}

export async function fetchNotificationLog(limit = 8) {
  return (await supabaseFetch(`notification_log?select=*&order=created_at.desc&limit=${limit}`)) || [];
}

export async function sendTestEmail() {
  const { url, anonKey } = getSupabaseConfig();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch(`${url}/functions/v1/notify-rain`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'test' })
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) throw new Error('A função notify-rain ainda não foi publicada no Supabase.');
  if (!response.ok) throw new Error(data.error || 'Falha ao enviar o e-mail de teste.');
  return data;
}
