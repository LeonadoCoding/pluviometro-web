// Edge Function: envia o boletim pluviométrico em PDF no fechamento de cada mês (Brevo, com anexo).
//
// O PDF é o mesmo do botão "Boletim em PDF": o site o gera (os gráficos vêm da tela) e o envia aqui.
// No 1º acesso de um administrador ou alimentador a partir do dia 1, o site pergunta se o boletim
// do mês anterior está pendente ({ action: 'check' }) e, se estiver, gera e envia ({ action: 'send' }).
// Um índice único no banco (monthly-report.sql) garante um único envio por mês.
//
// { action: 'test' } envia o boletim atual na hora (só administradores), sem marcar o mês como enviado.
//
// Segredos: BREVO_API_KEY, BREVO_SENDER_EMAIL (opcionais: BREVO_SENDER_NAME, SITE_URL).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://leonadocoding.github.io/pluviometro-web/';
const LOGO_URL = `${SITE_URL.replace(/\/$/, '')}/logo-oilema.png`;
const TIME_ZONE = 'America/Bahia';
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const fmt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());

// Mês anterior ao de hoje (fuso da Bahia), no formato AAAA-MM
function previousPeriod() {
  const [y, m] = todayISO().split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]}/${p.slice(0, 4)}`;

async function requireMember(req: Request, roles: string[]) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: member } = await admin.from('pluviometro_users').select('role').eq('user_id', data.user.id).maybeSingle();
  const { data: legacy } = await admin.from('pluviometro_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  const role = legacy ? 'admin' : member?.role;
  return role && roles.includes(role) ? { id: data.user.id, role } : null;
}

async function loadSettings() {
  const { data, error } = await admin.from('notification_settings').select('*').eq('id', 1).single();
  if (error) throw new Error(`Configurações não encontradas: ${error.message}`);
  return data as { monthly_report: boolean; recipients: string[] };
}

async function alreadySent(period: string) {
  const { data } = await admin.from('notification_log').select('id').eq('kind', 'monthly').eq('period', period).in('status', ['sending', 'sent']).limit(1);
  return Boolean(data?.length);
}

async function monthTotals(period: string) {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const { data } = await admin.from('rain_records').select('rain_mm').gte('date', `${period}-01`).lte('date', `${period}-${last}`);
  const rows = data ?? [];
  return { total: rows.reduce((a, r) => a + (Number(r.rain_mm) || 0), 0), rainyDays: rows.filter(r => Number(r.rain_mm) > 0).length };
}

function emailHtml(title: string, intro: string, stats: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F2F2;font-family:Arial,Helvetica,sans-serif;color:#1A2B31">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F2;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FCFCFC;border-radius:12px;overflow:hidden;border:1px solid #DCE3E5">
      <tr><td style="padding:20px 24px 16px"><img src="${LOGO_URL}" alt="Oilema" height="44" style="display:block;height:44px"></td></tr>
      <tr><td style="height:4px;background:#F28322;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#385059">${title}</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.5">${intro}</p>
        ${stats}
        <p style="margin:22px 0 0"><a href="${SITE_URL}" style="display:inline-block;background:#F28322;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">Abrir o painel pluviométrico</a></p>
      </td></tr>
      <tr><td style="padding:14px 24px;background:#ECF0F1;font-size:12px;color:#627880">UBS Placas • Barreiras/BA — boletim automático do Pluviômetro Oilema. Para deixar de receber, peça a um administrador para remover seu e-mail em Avisos por e-mail.</td></tr>
    </table></td></tr></table></body></html>`;
}

async function sendBrevo(recipients: string[], subject: string, html: string, pdfBase64: string, filename: string) {
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
      attachment: [{ content: pdfBase64, name: filename }],
      messageVersions: recipients.map(email => ({ to: [{ email }] }))
    })
  });
  if (!res.ok) throw new Error(`Brevo respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

function validPdf(b64: unknown, filename: unknown) {
  if (typeof b64 !== 'string' || typeof filename !== 'string') return 'Envie o PDF e o nome do arquivo.';
  if (!/^[\w.-]+\.pdf$/i.test(filename)) return 'Nome de arquivo inválido.';
  if (b64.length * 0.75 > MAX_PDF_BYTES) return 'O PDF passou do tamanho permitido.';
  if (!b64.startsWith('JVBER')) return 'O arquivo enviado não é um PDF.'; // "%PDF" em base64
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === 'check' || action === 'send') {
    const user = await requireMember(req, ['admin', 'alimentador']);
    if (!user) return json({ error: 'Sem permissão.' }, 403);
    const settings = await loadSettings();
    const period = previousPeriod();
    // Só o mês que acabou de fechar: nada de reenviar meses antigos
    if (body.period !== period) return json({ due: false, reason: 'period' });
    if (!settings.monthly_report || !settings.recipients?.length) return json({ due: false, reason: 'disabled' });
    if (await alreadySent(period)) return json({ due: false, reason: 'sent' });
    if (action === 'check') return json({ due: true, period, recipients: settings.recipients.length });

    const invalid = validPdf(body.pdf_base64, body.filename);
    if (invalid) return json({ error: invalid }, 400);

    // Reserva o período (índice único); se outro navegador já reservou, não envia de novo
    const { data: claim, error: claimError } = await admin.from('notification_log')
      .insert({ kind: 'monthly', period, recipients: settings.recipients, status: 'sending' }).select('id').single();
    if (claimError) return json({ due: false, reason: 'sent' });

    try {
      const { total, rainyDays } = await monthTotals(period);
      const stats = `<table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
        <td style="padding:12px;background:#F5F7F7;border-radius:8px;width:50%"><div style="font-size:11px;color:#627880;text-transform:uppercase;letter-spacing:.5px">Chuva em ${periodLabel(period)}</div><div style="font-size:20px;font-weight:bold;color:#D2651B;margin-top:4px">${fmt(total)} mm</div></td>
        <td style="padding:12px;background:#F5F7F7;border-radius:8px;width:50%"><div style="font-size:11px;color:#627880;text-transform:uppercase;letter-spacing:.5px">Dias com chuva</div><div style="font-size:20px;font-weight:bold;color:#1A2B31;margin-top:4px">${rainyDays}</div></td>
      </tr></table>`;
      const html = emailHtml(`Boletim de ${periodLabel(period)}`, `O mês fechou. Segue em anexo o boletim pluviométrico da UBS Placas com os indicadores, os gráficos e o detalhamento da safra.`, stats);
      await sendBrevo(settings.recipients, `Boletim pluviométrico de ${periodLabel(period)} • UBS Placas`, html, body.pdf_base64, body.filename);
      await admin.from('notification_log').update({ status: 'sent' }).eq('id', claim.id);
      return json({ ok: true, sent: settings.recipients.length, period });
    } catch (err) {
      // Libera o período para uma nova tentativa no próximo acesso
      await admin.from('notification_log').update({ status: 'error', error: String(err) }).eq('id', claim.id);
      return json({ error: String(err) }, 502);
    }
  }

  if (action === 'test') {
    const user = await requireMember(req, ['admin']);
    if (!user) return json({ error: 'Apenas administradores podem enviar o boletim de teste.' }, 403);
    const settings = await loadSettings();
    if (!settings.recipients?.length) return json({ error: 'Cadastre pelo menos um destinatário.' }, 400);
    const invalid = validPdf(body.pdf_base64, body.filename);
    if (invalid) return json({ error: invalid }, 400);
    const html = emailHtml('Boletim pluviométrico (teste)', 'Este é um envio de teste do boletim mensal. No fechamento de cada mês, os destinatários recebem este PDF automaticamente.', '');
    try {
      await sendBrevo(settings.recipients, 'Teste • Boletim pluviométrico da UBS Placas', html, body.pdf_base64, body.filename);
      await admin.from('notification_log').insert({ kind: 'report_test', recipients: settings.recipients, status: 'sent' });
      return json({ ok: true, sent: settings.recipients.length });
    } catch (err) {
      await admin.from('notification_log').insert({ kind: 'report_test', recipients: settings.recipients, status: 'error', error: String(err) });
      return json({ error: String(err) }, 502);
    }
  }

  return json({ error: 'Ação desconhecida.' }, 400);
});
