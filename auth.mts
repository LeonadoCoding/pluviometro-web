import {
  acceptInvite,
  admin,
  AuthError,
  getUser,
  login,
  logout,
  recoverPassword,
  refreshSession,
  requestPasswordRecovery,
  verifyRequestOrigin,
} from '@netlify/identity'
import type { Config, Context } from '@netlify/functions'

type AuthCookie = {
  name: string
  value: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
  path?: string
}

function secureCookies(context: Context) {
  const originalSet = context.cookies.set.bind(context.cookies)
  function setCookie(cookie: AuthCookie): void
  function setCookie(name: string, value: string): void
  function setCookie(cookie: AuthCookie | string, value?: string) {
    const normalized = typeof cookie === 'string' ? { name: cookie, value: value ?? '' } : cookie
    if (normalized.name === 'nf_jwt' || normalized.name === 'nf_refresh') {
      originalSet({ ...normalized, httpOnly: true, secure: true, sameSite: 'Lax', path: '/' })
    } else {
      originalSet(normalized)
    }
  }
  context.cookies.set = setCookie
}

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

function publicUser(user: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  return { id: user.id, username: user.email, name: user.name || user.email, role: 'admin' }
}

function requireAdmin(user: Awaited<ReturnType<typeof getUser>>) {
  if (!user?.roles?.includes('admin')) throw new AuthError('Acesso não autorizado.', 401)
  return user
}

function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
    throw new AuthError('A senha deve ter entre 8 e 256 caracteres.', 400)
  }
}

export default async (request: Request, context: Context) => {
  secureCookies(context)
  const action = context.params.action ?? new URL(request.url).pathname.split('/').pop()
  if (action === 'session' && request.method === 'GET') {
    try {
      if (!context.cookies.get('nf_jwt')) return response({ user: null }, 401)
      await refreshSession()
      return response({ user: publicUser(requireAdmin(await getUser())) })
    } catch {
      return response({ user: null }, 401)
    }
  }
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)
  try {
    verifyRequestOrigin(request)
    if (action === 'logout') {
      await logout()
      return response({ success: true })
    }
    if (!['login', 'change-password', 'recovery', 'reset-password', 'accept-invite'].includes(action ?? '')) {
      return response({ error: 'Operação não encontrada.' }, 404)
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return response({ error: 'Formato inválido.' }, 415)
    }
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response({ error: 'Solicitação inválida.' }, 400)
    }
    if (action === 'login' || action === 'recovery') {
      if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return response({ error: 'Informe um e-mail válido.' }, 400)
      }
      const email = body.email.trim().toLowerCase()
      if (action === 'recovery') {
        try {
          await requestPasswordRecovery(email)
        } catch (error) {
          if (!(error instanceof AuthError) || ![400, 404, 422].includes(error.status ?? 0)) throw error
        }
        return response({ success: true, message: 'Se a conta existir, você receberá um link de recuperação por e-mail.' })
      }
      if (typeof body.password !== 'string' || !body.password || body.password.length > 256) {
        return response({ error: 'Informe a senha.' }, 400)
      }
      const user = await login(email, body.password)
      if (!user.roles?.includes('admin')) {
        await logout()
        return response({ error: 'E-mail ou senha inválidos, ou acesso não autorizado.' }, 401)
      }
      return response({ success: true, user: publicUser(user) })
    }
    validatePassword(body.newPassword)
    if (action === 'change-password') {
      if (!context.cookies.get('nf_jwt')) throw new AuthError('Acesso não autorizado.', 401)
      await refreshSession()
      const user = requireAdmin(await getUser())
      if (!user.email || typeof body.currentPassword !== 'string' || !body.currentPassword || body.currentPassword.length > 256) {
        return response({ error: 'Informe a senha atual.' }, 400)
      }
      const verified = requireAdmin(await login(user.email, body.currentPassword))
      if (verified.id !== user.id) throw new AuthError('Acesso não autorizado.', 401)
      await admin.updateUser(user.id, { password: body.newPassword })
      await login(user.email, body.newPassword)
      return response({ success: true, message: 'Senha alterada com sucesso.' })
    }
    if (typeof body.token !== 'string' || !body.token || body.token.length > 2048) {
      return response({ error: 'Link inválido. Solicite um novo link por e-mail.' }, 400)
    }
    if (action === 'accept-invite') await acceptInvite(body.token, body.newPassword)
    else await recoverPassword(body.token, body.newPassword)
    await logout()
    return response({ success: true, message: 'Senha definida. Entre com seu e-mail e a nova senha.' })
  } catch (error) {
    if (error instanceof AuthError && error.status === 403) {
      return response({ error: 'Solicitação não autorizada.' }, 403)
    }
    if (error instanceof AuthError && error.status === 429) {
      return response({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, 429)
    }
    if (error instanceof AuthError && error.status && error.status < 500) {
      return response({ error: 'Não foi possível autenticar. Confira os dados ou solicite um novo link de recuperação.' }, 400)
    }
    return response({ error: 'Autenticação indisponível. Tente novamente mais tarde.' }, 503)
  }
}

export const config: Config = { path: ['/api/auth/:action', '/.netlify/functions/auth/:action'] }
