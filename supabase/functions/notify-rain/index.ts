// Edge Function: envia aviso de chuva por e-mail (Brevo) quando um registro é salvo.
//
// Chamada de duas formas:
//  1. Database Webhook do Supabase (INSERT/UPDATE em rain_records), com o cabeçalho
//     "x-webhook-secret" igual ao segredo WEBHOOK_SECRET.
//  2. Pelo site (botão "Enviar e-mail de teste"), com o token do administrador logado.
//
// Segredos necessários (Edge Functions → Secrets):
//  BREVO_API_KEY, BREVO_SENDER_EMAIL, WEBHOOK_SECRET
// Opcionais: BREVO_SENDER_NAME, SITE_URL
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://leonadocoding.github.io/pluviometro-web/';
const LOGO_URL = `${SITE_URL.replace(/\/$/, '')}/logo-oilema.png`;
const TIME_ZONE = 'America/Bahia';

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

const fmt = (n: number, digits = 1) =>
  (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const dateBR = (iso: string) => iso.split('-').reverse().join('/');
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Settings = {
  enabled: boolean;
  recipients: string[];
  min_rain_mm: number;
  notify_on_update: boolean;
  max_age_days: number;
};

type RainRecord = { date: string; rain_mm: number; safra: string; notes?: string | null };

async function loadSettings(): Promise<Settings> {
  const { data, error } = await admin.from('notification_settings').select('*').eq('id', 1).single();
  if (error) throw new Error(`Configurações não encontradas: ${error.message}`);
  return data as Settings;
}

async function logSend(entry: Record<string, unknown>) {
  await admin.from('notification_log').insert(entry);
}

async function sendBrevo(recipients: string[], subject: string, html: string) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  if (!apiKey || !senderEmail) throw new Error('BREVO_API_KEY ou BREVO_SENDER_EMAIL não configurados.');

  const res = await fetch(Deno.env.get('BREVO_API_URL') ?? 'https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: Deno.env.get('BREVO_SENDER_NAME') ?? 'Pluviômetro Oilema', email: senderEmail },
      subject,
      htmlContent: html,
      // Uma mensagem por destinatário: ninguém vê o e-mail dos outros
      messageVersions: recipients.map(email => ({ to: [{ email }] }))
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function safraTotals(record: RainRecord) {
  const { data, error } = await admin.from('rain_records').select('date, rain_mm').eq('safra', record.safra);
  if (error) throw new Error(error.message);
  const monthPrefix = record.date.slice(0, 7);
  let safra = 0;
  let month = 0;
  for (const r of data ?? []) {
    safra += Number(r.rain_mm) || 0;
    if (String(r.date).startsWith(monthPrefix)) month += Number(r.rain_mm) || 0;
  }
  return { safra, month };
}

function emailLayout(title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F2F2;font-family:Arial,Helvetica,sans-serif;color:#1A2B31">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F2;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FCFCFC;border-radius:12px;overflow:hidden;border:1px solid #DCE3E5">
        <tr><td style="padding:20px 24px 16px"><img src="${LOGO_URL}" alt="Oilema" height="44" style="display:block;height:44px"></td></tr>
        <tr><td style="height:4px;background:#F28322;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 16px;font-size:20px;color:#385059">${title}</h1>
          ${body}
          <p style="margin:24px 0 0"><a href="${SITE_URL}" style="display:inline-block;background:#F28322;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">Abrir o painel pluviométrico</a></p>
        </td></tr>
        <tr><td style="padding:14px 24px;background:#ECF0F1;font-size:12px;color:#627880">UBS Placas • Barreiras/BA — aviso automático do Pluviômetro Oilema. Para deixar de receber, peça a um administrador para remover seu e-mail na tela de Notificações.</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function rainEmail(record: RainRecord, totals: { safra: number; month: number }, isUpdate: boolean) {
  const month = MONTHS[Number(record.date.slice(5, 7)) - 1];
  const stat = (label: string, value: string) =>
    `<td style="padding:12px;background:#F5F7F7;border-radius:8px;width:50%"><div style="font-size:11px;color:#627880;text-transform:uppercase;letter-spacing:.5px">${label}</div><div style="font-size:18px;font-weight:bold;color:#1A2B31;margin-top:4px">${value}</div></td>`;
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${isUpdate ? 'Um registro de chuva foi <strong>corrigido</strong>' : 'Foi registrada uma nova leitura'} no pluviômetro da UBS Placas.</p>
    <p style="margin:0 0 20px;font-size:40px;font-weight:bold;color:#D2651B">${fmt(record.rain_mm)} mm <span style="font-size:15px;color:#627880;font-weight:normal">em ${dateBR(record.date)}</span></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
      ${stat(`Total de ${month}`, `${fmt(totals.month)} mm`)}
      ${stat(`Safra ${record.safra}`, `${fmt(totals.safra)} mm`)}
    </tr></table>
    ${record.notes ? `<p style="margin:16px 0 0;font-size:14px;color:#4A626B"><strong>Observação:</strong> ${escapeHtml(record.notes)}</p>` : ''}`;
  const subject = `${isUpdate ? 'Correção: ' : ''}🌧️ ${fmt(record.rain_mm)} mm em ${dateBR(record.date)} • UBS Placas`;
  return { subject, html: emailLayout(isUpdate ? 'Registro de chuva corrigido' : 'Nova chuva registrada', body) };
}

async function handleTest(req: Request) {
  // Só administradores logados podem disparar o teste
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Não autenticado.' }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Sessão inválida.' }, 401);
  const { data: isAdmin } = await admin.from('pluviometro_admins').select('user_id').eq('user_id', userData.user.id).maybeSingle();
  if (!isAdmin) return json({ error: 'Apenas administradores podem enviar testes.' }, 403);

  const settings = await loadSettings();
  if (!settings.recipients?.length) return json({ error: 'Cadastre pelo menos um destinatário.' }, 400);

  const html = emailLayout('E-mail de teste', `<p style="margin:0;font-size:15px;line-height:1.5">Os avisos de chuva do Pluviômetro Oilema estão configurados corretamente. Quando uma nova leitura for registrada, os destinatários cadastrados receberão um e-mail como este.</p>`);
  try {
    await sendBrevo(settings.recipients, 'Teste • Avisos de chuva do Pluviômetro Oilema', html);
    await logSend({ kind: 'test', recipients: settings.recipients, status: 'sent' });
    return json({ ok: true, sent: settings.recipients.length });
  } catch (err) {
    await logSend({ kind: 'test', recipients: settings.recipients, status: 'error', error: String(err) });
    return json({ error: String(err) }, 502);
  }
}

async function handleWebhook(req: Request, payload: any) {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'Não autorizado.' }, 401);
  if (payload.table !== 'rain_records' || !['INSERT', 'UPDATE'].includes(payload.type)) return json({ skipped: 'evento ignorado' });

  const record = payload.record as RainRecord;
  const isUpdate = payload.type === 'UPDATE';
  const settings = await loadSettings();

  if (!settings.enabled) return json({ skipped: 'avisos desligados' });
  if (!settings.recipients?.length) return json({ skipped: 'sem destinatários' });
  if (isUpdate && !settings.notify_on_update) return json({ skipped: 'correções não avisam' });
  if (isUpdate && Number(payload.old_record?.rain_mm) === Number(record.rain_mm)) return json({ skipped: 'volume não mudou' });
  if (Number(record.rain_mm) < Number(settings.min_rain_mm)) return json({ skipped: 'abaixo do limite mínimo' });
  if (daysBetween(record.date, todayISO()) > settings.max_age_days) return json({ skipped: 'leitura antiga (importação)' });

  const totals = await safraTotals(record);
  const { subject, html } = rainEmail(record, totals, isUpdate);
  try {
    await sendBrevo(settings.recipients, subject, html);
    await logSend({ kind: 'rain', record_date: record.date, rain_mm: record.rain_mm, recipients: settings.recipients, status: 'sent' });
    return json({ ok: true });
  } catch (err) {
    await logSend({ kind: 'rain', record_date: record.date, rain_mm: record.rain_mm, recipients: settings.recipients, status: 'error', error: String(err) });
    return json({ error: String(err) }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const payload = await req.json().catch(() => ({}));
    return payload?.type === 'test' ? await handleTest(req) : await handleWebhook(req, payload);
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
