import type { UserSignupEvent, UserValidateEvent } from '@netlify/functions'

// O bloqueio de cadastro publico e feito pela configuracao
// Identity > Registration > "Invite only" no painel do Netlify.
// Nao negar aqui por falta de `invitedAt`: no momento em que o convite e
// enviado pelo painel, o evento chega sem esse campo e o envio falhava com 422.
export default {
  userValidate(_event: UserValidateEvent) {
    // permite a validacao
  },
  userSignup(event: UserSignupEvent) {
    console.log('identity signup', {
      email: event.user.email,
      invitedAt: event.user.invitedAt ?? null,
    })
    return {
      user: {
        ...event.user,
        appMetadata: { ...event.user.appMetadata, roles: ['admin'] },
      },
    }
  },
}
