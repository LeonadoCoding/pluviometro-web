// Edge Function: cadastro de usuários do Pluviômetro (somente administradores).
//
// Ações (POST, corpo JSON com "action"):
//   list                                   lista os usuários cadastrados
//   create        {email, password, name, role}
//   update_role   {user_id, role}
//   set_password  {user_id, password}
//   remove        {user_id}
//
// Perfis: admin, alimentador, visualizador (ver supabase/users.sql).
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ROLES = ['admin', 'alimentador', 'visualizador'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function requireAdmin(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  const { data: row } = await admin.from('pluviometro_users').select('role').eq('user_id', data.user.id).maybeSingle();
  let role = row?.role;
  if (!role) {
    const { data: legacy } = await admin.from('pluviometro_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (legacy) role = 'admin';
  }
  if (role !== 'admin') throw new HttpError(403, 'Apenas administradores podem gerenciar usuários.');
  return data.user;
}

function checkRole(role: unknown) {
  if (!ROLES.includes(String(role))) throw new HttpError(400, 'Perfil inválido. Use administrador, alimentador ou visualizador.');
  return String(role);
}

function checkPassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'A senha deve ter no mínimo 8 caracteres.');
  return password;
}

async function adminCount() {
  const { count } = await admin.from('pluviometro_users').select('user_id', { count: 'exact', head: true }).eq('role', 'admin');
  return count ?? 0;
}

async function findAuthUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const found = data.users.find(u => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function listUsers() {
  const { data, error } = await admin.from('pluviometro_users').select('user_id, email, name, role, created_at').order('created_at');
  if (error) throw new Error(error.message);
  return json({ users: data });
}

async function createUser(body: any) {
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Digite um e-mail válido.');
  const name = String(body.name ?? '').trim().slice(0, 120) || null;
  const role = checkRole(body.role);
  const password = checkPassword(body.password);

  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: name ? { name } : {}
  });

  let userId = created?.user?.id;
  let existed = false;
  if (error) {
    // Conta já existente no Supabase (criada antes pelo painel): só dá o acesso ao Pluviômetro
    const existing = await findAuthUserByEmail(email);
    if (!existing) throw new HttpError(400, `Não foi possível criar o usuário: ${error.message}`);
    const { data: member } = await admin.from('pluviometro_users').select('user_id').eq('user_id', existing.id).maybeSingle();
    if (member) throw new HttpError(409, 'Este e-mail já está cadastrado no Pluviômetro.');
    userId = existing.id;
    existed = true;
  }

  const { error: insertError } = await admin.from('pluviometro_users').insert({ user_id: userId, email, name, role });
  if (insertError) {
    if (!existed && userId) await admin.auth.admin.deleteUser(userId);
    throw new Error(insertError.message);
  }
  return json({ ok: true, existed });
}

async function updateRole(body: any, me: { id: string }) {
  const userId = String(body.user_id ?? '');
  const role = checkRole(body.role);
  if (userId === me.id) throw new HttpError(400, 'Você não pode alterar o seu próprio perfil.');
  const { data: target } = await admin.from('pluviometro_users').select('role').eq('user_id', userId).maybeSingle();
  if (!target) throw new HttpError(404, 'Usuário não encontrado.');
  if (target.role === 'admin' && role !== 'admin' && (await adminCount()) <= 1) {
    throw new HttpError(400, 'O painel precisa de pelo menos um administrador.');
  }
  const { error } = await admin.from('pluviometro_users').update({ role }).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return json({ ok: true });
}

async function setPassword(body: any) {
  const userId = String(body.user_id ?? '');
  const password = checkPassword(body.password);
  const { data: target } = await admin.from('pluviometro_users').select('user_id').eq('user_id', userId).maybeSingle();
  if (!target) throw new HttpError(404, 'Usuário não encontrado.');
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new HttpError(400, `Não foi possível definir a senha: ${error.message}`);
  return json({ ok: true });
}

async function removeUser(body: any, me: { id: string }) {
  const userId = String(body.user_id ?? '');
  if (userId === me.id) throw new HttpError(400, 'Você não pode remover o seu próprio usuário.');
  const { data: target } = await admin.from('pluviometro_users').select('role').eq('user_id', userId).maybeSingle();
  if (!target) throw new HttpError(404, 'Usuário não encontrado.');
  if (target.role === 'admin' && (await adminCount()) <= 1) {
    throw new HttpError(400, 'O painel precisa de pelo menos um administrador.');
  }
  // Remove o acesso e a conta de login
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  await admin.from('pluviometro_users').delete().eq('user_id', userId);
  await admin.from('pluviometro_admins').delete().eq('user_id', userId);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const me = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    switch (body?.action) {
      case 'list': return await listUsers();
      case 'create': return await createUser(body);
      case 'update_role': return await updateRole(body, me);
      case 'set_password': return await setPassword(body);
      case 'remove': return await removeUser(body, me);
      default: return json({ error: 'Ação desconhecida.' }, 400);
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});
