import { getSupabaseConfig, getValidAccessToken } from './auth';

// Chama a Edge Function manage-users (só administradores; a chave de serviço fica no Supabase).
async function callManageUsers(action, payload = {}) {
  const { url, anonKey } = getSupabaseConfig();
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch(`${url}/functions/v1/manage-users`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) throw new Error('A função manage-users ainda não foi publicada no Supabase.');
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}

export async function listUsers() {
  return (await callManageUsers('list')).users || [];
}

export function createUser({ name, email, password, role }) {
  return callManageUsers('create', { name, email, password, role });
}

export function updateUserRole(userId, role) {
  return callManageUsers('update_role', { user_id: userId, role });
}

export function setUserPassword(userId, password) {
  return callManageUsers('set_password', { user_id: userId, password });
}

export function removeUser(userId) {
  return callManageUsers('remove', { user_id: userId });
}
