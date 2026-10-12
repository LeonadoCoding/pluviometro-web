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

## Segurança
- Nunca publique a chave `service_role`, senhas ou arquivos `.env`.
- Contas devem ser criadas manualmente no Supabase; não habilite cadastro público para este app administrativo.
- A tabela só permite escrita a usuários listados em `pluviometro_admins`; a chave pública, sozinha, não concede acesso administrativo.
