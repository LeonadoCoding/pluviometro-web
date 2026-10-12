const TOKEN_KEY = 'pluviometro_supabase_session';
const USER_KEY = 'pluviometro_user_info';

export function getSupabaseConfig() {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) {
    throw new Error('O Supabase ainda não foi configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis do GitHub Actions.');
  }
  return { url, anonKey };
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage disabled */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch { /* storage disabled */ }
}
function readSession() {
  try { return JSON.parse(safeGet(TOKEN_KEY) || 'null'); } catch { return null; }
}
function saveSession(session) {
  safeSet(TOKEN_KEY, JSON.stringify(session));
  const user = session?.user;
  if (user) {
    safeSet(USER_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      username: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Administrador',
      isAdmin: true
    }));
  }
}
export function getToken() {
  return readSession()?.access_token || null;
}
export function getCurrentUser() {
  const session = readSession();
  if (!session?.access_token || !session?.user) return null;
  try { return JSON.parse(safeGet(USER_KEY) || 'null'); } catch { return null; }
}
export function isAuthenticated() {
  const session = readSession();
  return Boolean(session?.access_token && session?.user);
}

async function authRequest(path, body, accessToken = null) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.msg || data.message || data.error_description || data.error || 'Falha na autenticação.';
    if (response.status === 400 || response.status === 401) {
      throw new Error('E-mail ou senha incorretos. Confirme também se o usuário foi criado no Supabase.');
    }
    throw new Error(message);
  }
  return data;
}

export async function getValidAccessToken() {
  let session = readSession();
  if (!session?.access_token) return null;
  const expiresAt = Number(session.expires_at || 0);
  if (expiresAt && expiresAt * 1000 > Date.now() + 60_000) return session.access_token;
  if (!session.refresh_token) {
    logoutUser();
    return null;
  }
  try {
    const refreshed = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    session = { ...refreshed, expires_at: refreshed.expires_at || Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600) };
    saveSession(session);
    return session.access_token;
  } catch {
    logoutUser();
    return null;
  }
}

export async function loginUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error('Informe o e-mail e a senha.');
  const data = await authRequest('token?grant_type=password', { email: cleanEmail, password });
  const session = { ...data, expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600) };
  saveSession(session);

  // Acesso só para usuários explicitamente cadastrados como administradores no banco.
  const { url, anonKey } = getSupabaseConfig();
  const check = await fetch(`${url}/rest/v1/rpc/is_pluviometro_admin`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const isAdmin = check.ok ? await check.json().catch(() => false) : false;
  if (isAdmin !== true) {
    await authRequest('logout', {}, session.access_token).catch(() => {});
    logoutUser();
    throw new Error('Este usuário ainda não foi autorizado como administrador. Execute o passo de cadastro de administrador no SQL Editor do Supabase.');
  }
  const user = { id: data.user.id, email: data.user.email, username: data.user.email, name: data.user.user_metadata?.name || data.user.email, isAdmin: true };
  safeSet(USER_KEY, JSON.stringify(user));
  return { success: true, user };
}

export async function changePassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
  const user = getCurrentUser();
  if (!user?.email) throw new Error('Sua sessão expirou. Entre novamente.');
  await authRequest('token?grant_type=password', { email: user.email, password: currentPassword });
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || 'Não foi possível alterar a senha.');
  return { success: true, message: 'Senha alterada com sucesso!' };
}

export function logoutUser() {
  const session = readSession();
  const token = session?.access_token;
  if (token) {
    try {
      const { url, anonKey } = getSupabaseConfig();
      fetch(`${url}/auth/v1/logout`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }).catch(() => {});
    } catch { /* ignore missing config */ }
  }
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
