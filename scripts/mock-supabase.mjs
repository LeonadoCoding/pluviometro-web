// Instância de teste do Pluviômetro: imita as rotas do Supabase usadas pelo app
// (auth, rest/v1 e as Edge Functions), sem tocar no banco real.
//
//   npm run test:server        → sobe na porta 54321 com dados em .test-data/
//   npm run dev:test           → sobe o app apontando para esta instância
//
// Contas de teste (senha igual para as três): ver TEST_PASSWORD abaixo.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.MOCK_PORT || 54321);
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || '.test-data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TEST_PASSWORD = 'teste-oilema-2026';
// Com MOCK_TODAY (data simulada), o token dura 60 dias para não expirar no relógio adiantado do navegador
const TOKEN_TTL = process.env.MOCK_TODAY ? 60 * 86400 : 3600;

// ---------- banco em arquivo ----------
function seedDb() {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/seedData.json'), 'utf8'));
  const users = [
    { id: crypto.randomUUID(), email: 'admin@teste.local', name: 'Leonardo (teste)', role: 'admin' },
    { id: crypto.randomUUID(), email: 'alimentador@teste.local', name: 'Operador de campo', role: 'alimentador' },
    { id: crypto.randomUUID(), email: 'visualizador@teste.local', name: 'Gerência', role: 'visualizador' }
  ].map(u => ({ ...u, password: TEST_PASSWORD, created_at: new Date().toISOString() }));
  // A planilha termina no início da safra atual: completa até ontem com leituras de exemplo
  // (padrão de outubro/novembro no oeste baiano), marcadas como teste na observação.
  const records = seed.map((r, i) => ({ id: i + 1, notes: null, ...r, created_at: new Date().toISOString(), updated_at: null }));
  const last = seed.reduce((a, r) => (r.date > a ? r.date : a), '');
  const d = new Date(`${last}T12:00:00`);
  const end = new Date(); end.setDate(end.getDate() - 1);
  let k = 1;
  const rnd = () => { const x = Math.sin(k++ * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (d.setDate(d.getDate() + 1); d <= end; d.setDate(d.getDate() + 1)) {
    const month = d.getMonth() + 1;
    const chance = month === 10 ? 0.22 : month === 11 ? 0.45 : month === 12 ? 0.55 : 0.15;
    if (rnd() > chance) continue;
    const mm = Math.round((2 + rnd() ** 2 * (month === 11 ? 48 : 30)) * 10) / 10;
    const date = d.toISOString().slice(0, 10);
    const [y, m] = date.split('-').map(Number);
    records.push({ id: records.length + 1, date, rain_mm: mm, safra: m >= 10 ? `${y}/${y + 1}` : `${y - 1}/${y}`, property: 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS', notes: mm > 30 ? 'Leitura de teste · chuva forte à tarde' : null, created_at: new Date().toISOString(), updated_at: null });
  }
  return {
    users,
    rain_records: records,
    nextId: records.length + 1,
    notification_settings: { id: 1, enabled: true, recipients: ['campo@teste.local', 'gerencia@teste.local'], min_rain_mm: 1, notify_on_update: false, max_age_days: 7, monthly_report: false, updated_at: new Date().toISOString() },
    notification_log: [],
    sessions: {}
  };
}
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : seedDb();
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1));
save();

// ---------- utilidades ----------
const send = (res, status, body, extra = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    ...extra
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', c => { data += c; });
  req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
});
const publicUser = (u) => ({ id: u.id, email: u.email, user_metadata: { name: u.name }, role: 'authenticated' });
function issueSession(user) {
  const access_token = crypto.randomBytes(24).toString('hex');
  const refresh_token = crypto.randomBytes(24).toString('hex');
  db.sessions[access_token] = { userId: user.id, exp: Date.now() + TOKEN_TTL * 1000, refresh_token };
  save();
  return { access_token, refresh_token, token_type: 'bearer', expires_in: TOKEN_TTL, expires_at: Math.floor(Date.now() / 1000) + TOKEN_TTL, user: publicUser(user) };
}
function authUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const s = db.sessions[token];
  if (!s || s.exp < Date.now()) return null;
  return db.users.find(u => u.id === s.userId) || null;
}
const can = (user, what) => {
  if (!user) return false;
  if (what === 'write') return user.role === 'admin' || user.role === 'alimentador';
  if (what === 'admin') return user.role === 'admin';
  return true;
};
const safraOf = (date) => {
  const [y, m] = date.split('-').map(Number);
  return m >= 10 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};

// ---------- previsão sintética (estável dentro da mesma hora) ----------
function fakeForecast() {
  const seed = Math.floor(Date.now() / 3_600_000);
  const rnd = (i) => { const x = Math.sin(seed * 31 + i * 7.13) * 10000; return x - Math.floor(x); };
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const mm = rnd(i) > 0.45 ? Math.round(rnd(i + 20) * 28 * 10) / 10 : 0;
    return { date: d.toISOString().slice(0, 10), rain_mm: mm, pop_max: mm > 0 ? Math.round(40 + rnd(i + 40) * 55) : Math.round(rnd(i + 40) * 20) };
  });
  return { location: { lat: -11.834958, lon: -46.293266 }, days, cached: false, source: 'teste' };
}

// ---------- rotas ----------
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const q = url.searchParams;
  // Atraso curto e realista, para os estados de carregamento aparecerem
  await new Promise(r => setTimeout(r, 120 + Math.random() * 180));

  try {
    // ----- auth -----
    if (p === '/auth/v1/token') {
      const body = await readBody(req);
      if (q.get('grant_type') === 'password') {
        const user = db.users.find(u => u.email === String(body.email || '').toLowerCase());
        if (!user || user.password !== body.password) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
        return send(res, 200, issueSession(user));
      }
      if (q.get('grant_type') === 'refresh_token') {
        const entry = Object.entries(db.sessions).find(([, s]) => s.refresh_token === body.refresh_token);
        if (!entry) return send(res, 400, { error: 'invalid_grant' });
        delete db.sessions[entry[0]];
        const user = db.users.find(u => u.id === entry[1].userId);
        return send(res, 200, issueSession(user));
      }
    }
    if (p === '/auth/v1/logout') {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      delete db.sessions[token]; save();
      return send(res, 204);
    }
    if (p === '/auth/v1/user' && req.method === 'PUT') {
      const user = authUser(req);
      if (!user) return send(res, 401, { message: 'Sessão inválida' });
      const body = await readBody(req);
      if (body.password) { user.password = body.password; save(); }
      return send(res, 200, publicUser(user));
    }

    const user = authUser(req);
    if (p.startsWith('/rest/v1/') || p.startsWith('/functions/v1/')) {
      if (!user) return send(res, 401, { message: 'JWT expired' });
    }

    // ----- rpc -----
    if (p === '/rest/v1/rpc/pluviometro_role') return send(res, 200, user.role);

    // ----- rain_records -----
    if (p === '/rest/v1/rain_records') {
      if (req.method === 'GET') {
        let rows = [...db.rain_records];
        const order = q.get('order');
        if (order) {
          const [col, dir] = order.split('.');
          rows.sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (dir === 'desc' ? -1 : 1));
        }
        const offset = Number(q.get('offset') || 0);
        const limit = Number(q.get('limit') || rows.length);
        rows = rows.slice(offset, offset + limit);
        if (q.get('select') === 'id') rows = rows.map(r => ({ id: r.id }));
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        if (!can(user, 'write')) return send(res, 403, { code: '42501', message: 'permission denied' });
        const body = await readBody(req);
        const list = Array.isArray(body) ? body : [body];
        const merge = (req.headers.prefer || '').includes('merge-duplicates');
        const out = [];
        for (const r of list) {
          const existing = db.rain_records.find(x => x.date === r.date);
          if (existing) {
            if (merge) { Object.assign(existing, r, { safra: r.safra || safraOf(r.date) }); out.push(existing); }
          } else {
            const row = { id: db.nextId++, notes: null, created_at: new Date().toISOString(), ...r, safra: r.safra || safraOf(r.date) };
            db.rain_records.push(row); out.push(row);
          }
        }
        save();
        return send(res, 201, out);
      }
      if (req.method === 'DELETE') {
        if (!can(user, 'admin')) return send(res, 403, { code: '42501', message: 'permission denied' });
        const idEq = q.get('id');
        if (idEq === 'not.is.null') db.rain_records = [];
        else if (idEq?.startsWith('eq.')) db.rain_records = db.rain_records.filter(r => String(r.id) !== idEq.slice(3));
        save();
        return send(res, 204);
      }
    }

    // ----- avisos -----
    if (p === '/rest/v1/notification_settings') {
      if (!can(user, 'admin')) return send(res, 403, { code: '42501', message: 'permission denied' });
      if (req.method === 'GET') return send(res, 200, [db.notification_settings]);
      if (req.method === 'PATCH') {
        Object.assign(db.notification_settings, await readBody(req)); save();
        return send(res, 200, [db.notification_settings]);
      }
    }
    if (p === '/rest/v1/notification_log') {
      const limit = Number(q.get('limit') || 8);
      return send(res, 200, [...db.notification_log].reverse().slice(0, limit));
    }

    // ----- Edge Functions -----
    if (p === '/functions/v1/rain-forecast') return send(res, 200, fakeForecast());
    if (p === '/functions/v1/notify-rain') {
      if (!can(user, 'admin')) return send(res, 403, { error: 'Somente administradores.' });
      const recipients = db.notification_settings.recipients;
      db.notification_log.push({ id: db.notification_log.length + 1, kind: 'test', status: 'sent', recipients, created_at: new Date().toISOString(), rain_mm: null, record_date: null, error: null });
      save();
      return send(res, 200, { ok: true, sent: recipients.length });
    }
    // Boletim mensal: mesmas regras da função real; o "e-mail" vira um PDF em .test-data/outbox
    if (p === '/functions/v1/monthly-report') {
      const body = await readBody(req);
      const s = db.notification_settings;
      // MOCK_TODAY=AAAA-MM-DD simula outro dia (para testar o envio do dia 1)
      const today = process.env.MOCK_TODAY || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date());
      const now = new Date(`${today}T12:00:00`);
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      const outbox = path.join(DATA_DIR, 'outbox');
      const store = (name) => { fs.mkdirSync(outbox, { recursive: true }); fs.writeFileSync(path.join(outbox, name), Buffer.from(body.pdf_base64 || '', 'base64')); };
      const pdfError = () => (!String(body.pdf_base64 || '').startsWith('JVBER') ? 'O arquivo enviado não é um PDF.' : !/^[\w.-]+\.pdf$/i.test(body.filename || '') ? 'Nome de arquivo inválido.' : null);
      if (body.action === 'check' || body.action === 'send') {
        if (!can(user, 'write')) return send(res, 403, { error: 'Sem permissão.' });
        if (body.period !== period) return send(res, 200, { due: false, reason: 'period' });
        if (!s.monthly_report || !s.recipients.length) return send(res, 200, { due: false, reason: 'disabled' });
        if (!today.endsWith('-01')) return send(res, 200, { due: false, reason: 'not_day_one' });
        if (!(db.rain_records.filter(r => r.date.startsWith(period)).reduce((a, r) => a + Number(r.rain_mm || 0), 0) > 0)) return send(res, 200, { due: false, reason: 'no_rain' });
        if (db.notification_log.some(l => l.kind === 'monthly' && l.period === period && l.status === 'sent')) return send(res, 200, { due: false, reason: 'sent' });
        if (body.action === 'check') return send(res, 200, { due: true, period, recipients: s.recipients.length });
        if (pdfError()) return send(res, 400, { error: pdfError() });
        store(`${period}_${body.filename}`);
        db.notification_log.push({ id: db.notification_log.length + 1, kind: 'monthly', period, status: 'sent', recipients: s.recipients, created_at: new Date().toISOString(), rain_mm: null, record_date: null, error: null });
        save();
        return send(res, 200, { ok: true, sent: s.recipients.length, period });
      }
      if (body.action === 'test') {
        if (!can(user, 'admin')) return send(res, 403, { error: 'Apenas administradores podem enviar o boletim de teste.' });
        if (!s.recipients.length) return send(res, 400, { error: 'Cadastre pelo menos um destinatário.' });
        if (pdfError()) return send(res, 400, { error: pdfError() });
        store(`teste_${Date.now()}_${body.filename}`);
        db.notification_log.push({ id: db.notification_log.length + 1, kind: 'report_test', status: 'sent', recipients: s.recipients, created_at: new Date().toISOString(), rain_mm: null, record_date: null, error: null });
        save();
        return send(res, 200, { ok: true, sent: s.recipients.length });
      }
      return send(res, 400, { error: 'Ação desconhecida.' });
    }
    if (p === '/functions/v1/manage-users') {
      if (!can(user, 'admin')) return send(res, 403, { error: 'Somente administradores.' });
      const body = await readBody(req);
      const find = (id) => db.users.find(u => u.id === id);
      switch (body.action) {
        case 'list':
          return send(res, 200, { users: db.users.map(u => ({ user_id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at })) });
        case 'create': {
          const email = String(body.email || '').trim().toLowerCase();
          if (!email || String(body.password || '').length < 8) return send(res, 400, { error: 'Informe e-mail e senha com 8 caracteres ou mais.' });
          const existing = db.users.find(u => u.email === email);
          if (existing) { existing.role = body.role; save(); return send(res, 200, { ok: true, existed: true }); }
          db.users.push({ id: crypto.randomUUID(), email, name: body.name || null, role: body.role || 'visualizador', password: body.password, created_at: new Date().toISOString() });
          save();
          return send(res, 200, { ok: true, existed: false });
        }
        case 'update_role': { const u = find(body.user_id); if (u) u.role = body.role; save(); return send(res, 200, { ok: true }); }
        case 'set_password': { const u = find(body.user_id); if (u) u.password = body.password; save(); return send(res, 200, { ok: true }); }
        case 'remove': db.users = db.users.filter(u => u.id !== body.user_id); save(); return send(res, 200, { ok: true });
        default: return send(res, 400, { error: 'Ação desconhecida.' });
      }
    }

    return send(res, 404, { message: `Rota de teste não implementada: ${req.method} ${p}` });
  } catch (err) {
    console.error(err);
    return send(res, 500, { message: String(err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Instância de teste do Pluviômetro em http://127.0.0.1:${PORT}`);
  console.log(`Dados: ${DB_FILE}`);
  console.log(`Contas: admin@teste.local, alimentador@teste.local, visualizador@teste.local — senha ${TEST_PASSWORD}`);
});
