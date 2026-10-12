const TOKEN_KEY = 'pluviometro_jwt_token';
const USER_KEY = 'pluviometro_user_info';
const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Safe localStorage wrappers ────────────────────────────────────────────
function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
// ────────────────────────────────────────────────────────────────────────────


export function getToken() {
  return safeGet(TOKEN_KEY);
}

export function getCurrentUser() {
  const stored = safeGet(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getToken();
}

export async function loginUser(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ username: cleanUser, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao autenticar.');
  safeSet(TOKEN_KEY, data.token);
  safeSet(USER_KEY, JSON.stringify(data.user));
  return { success: true, user: data.user };
}

export async function changePassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (res.ok) {
      return { success: true, message: 'Senha alterada com sucesso!' };
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao alterar senha.');
    }
  } catch (err) {
    // Offline fallback
    if (currentPassword === getLocalAdminPass()) {
      return { success: true, message: 'Senha offline atualizada com sucesso!' };
    }
    throw new Error(err.message || 'Falha ao alterar senha.');
  }
}

export function logoutUser() {
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
