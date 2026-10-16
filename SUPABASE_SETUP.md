# Configuração do Supabase (GitHub Pages)

O frontend é hospedado no GitHub Pages e usa Supabase Auth + Postgres via API REST. Não é necessário executar Node.js nem usar a VPS para esse modo.

## 1. Criar projeto Supabase
1. Crie um projeto em https://supabase.com/dashboard.
2. Em **Project Settings → API** (ou **Connect**, dependendo da interface), copie a **Project URL** e a chave pública **anon/publishable**. Nunca use a chave **service_role/secret** no frontend.
3. Em **SQL Editor**, execute todo o arquivo `supabase/schema.sql` deste repositório.

## 2. Criar a conta administradora
1. Vá a **Authentication → Users → Add user / Create new user**.
2. Crie o usuário com seu e-mail e uma senha forte. Para simplificar o primeiro acesso, você pode confirmar o e-mail ao criar o usuário, se essa opção aparecer.
3. Copie o **User UID** desse usuário.
4. No SQL Editor, execute a instrução abaixo substituindo UUID e e-mail:
   ```sql
   insert into public.pluviometro_admins (user_id, email)
   values ('UUID-DO-USUARIO', 'seu-email@exemplo.com');
   ```
5. Em **Authentication → URL Configuration**, adicione `https://leonadocoding.github.io` à lista de URLs permitidas. Se pedir uma URL de redirecionamento, use `https://leonadocoding.github.io/pluviometro-web/`.

## 3. Configurar o GitHub Actions
No repositório **Settings → Secrets and variables → Actions → Variables**, crie estas **Repository variables**:
- `VITE_SUPABASE_URL` = Project URL do Supabase.
- `VITE_SUPABASE_ANON_KEY` = chave pública anon/publishable do Supabase.

Esses dois valores são públicos por definição e são incorporados ao frontend; a segurança depende de RLS e nunca da ocultação da chave pública. Não crie uma variável com a chave `service_role`/secret.

## 4. Publicar
1. Vá a **Settings → Pages** e selecione **GitHub Actions** como fonte.
2. Faça um commit ou abra **Actions → Deploy Pluviômetro Web to GitHub Pages → Run workflow**.
3. Quando o workflow terminar com sucesso, abra https://leonadocoding.github.io/pluviometro-web/ e entre com o e-mail e senha criados no Supabase.

O banco começa vazio e o primeiro login administrativo inicializa os registros históricos de demonstração automaticamente. Se você já tiver dados reais, faça backup antes de usar **Restaurar base**: essa ação apaga os registros atuais e recria os dados iniciais.

## 5. Avisos de chuva por e-mail (Brevo)
Cada leitura registrada pode gerar um e-mail automático para uma lista de destinatários, configurada no site pelo ícone de sino (🔔) no cabeçalho (computador/tablet).

Como funciona: ao salvar um registro, um gatilho no banco chama a **Edge Function** `notify-rain`, que lê as configurações e envia o e-mail pelo **Brevo**. A chave do Brevo fica só no Supabase, nunca no site.

### 5.1 Brevo
1. Crie uma conta gratuita em https://www.brevo.com (300 e-mails/dia).
2. Em **Senders, Domains & Dedicated IPs → Senders → Add a sender**, cadastre o e-mail remetente (ex.: `avisos@suaempresa.com.br` ou seu Gmail) e confirme pelo link que o Brevo envia.
3. Em **SMTP & API → API Keys → Generate a new API key**, crie uma chave e copie-a (ela começa com `xkeysib-`).

### 5.2 Banco de dados
No **SQL Editor** do Supabase, execute todo o arquivo `supabase/notifications.sql`. Ele cria as tabelas de configuração e histórico, gera um segredo no **Vault** e instala o gatilho que chama a função a cada registro salvo. Não é preciso criar Database Webhook nem copiar segredo manualmente.

> Projeto **Central-Pluviometrica**: este passo já foi aplicado.

### 5.3 Publicar a função
**Pelo painel (sem instalar nada):**
1. **Edge Functions → Deploy a new function → Via Editor**.
2. Nome: `notify-rain`. Apague o código de exemplo e cole todo o conteúdo de `supabase/functions/notify-rain/index.ts`. Clique em **Deploy**.
3. Na função, abra **Details/Settings** e **desligue** a opção **Enforce JWT verification** (Verify JWT). A função valida o acesso por conta própria.

**Ou pelo terminal:**
```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase functions deploy notify-rain --no-verify-jwt
```

> Projeto **Central-Pluviometrica**: a função já está publicada.

Se usar outro projeto, troque o endereço `https://vnsnolwciccklwlpnoui.supabase.co` dentro de `supabase/notifications.sql` pelo endereço do seu projeto.

### 5.4 Segredos da função
Em **Edge Functions → Secrets** (ou **Project Settings → Edge Functions → Secrets**), adicione:
| Nome | Valor |
|---|---|
| `BREVO_API_KEY` | a chave `xkeysib-...` do passo 5.1 |
| `BREVO_SENDER_EMAIL` | o remetente confirmado no Brevo |
| `BREVO_SENDER_NAME` | (opcional) nome exibido, padrão "Pluviômetro Oilema" |
| `SITE_URL` | (opcional) endereço do painel, padrão `https://leonadocoding.github.io/pluviometro-web/` |

### 5.5 Ativar no site
1. Entre no painel e clique no sino (🔔) no cabeçalho.
2. Adicione os destinatários, ligue **Enviar avisos de chuva** e clique em **Salvar**.
3. Clique em **Enviar teste** e confira a caixa de entrada (e o spam, no primeiro envio).

Regras de envio configuráveis na tela: volume mínimo para avisar, aviso de correções e prazo máximo da leitura (padrão 3 dias). O prazo evita que importar um backup ou usar **Restaurar base** dispare centenas de e-mails. O histórico dos últimos envios, inclusive falhas e o motivo, aparece na própria tela.

## Segurança
- Nunca publique a chave `service_role`, senhas ou arquivos `.env`.
- Contas devem ser criadas manualmente no Supabase; não habilite cadastro público para este app administrativo.
- A tabela só permite escrita a usuários listados em `pluviometro_admins`; a chave pública, sozinha, não concede acesso administrativo.
- A chave do Brevo fica apenas nos segredos das Edge Functions e o segredo do gatilho fica no Vault do Supabase; nunca os coloque no GitHub.
