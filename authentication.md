# Acesso ao site

O login usa Netlify Identity, com contas individuais por e-mail. A senha padrão e o acesso offline foram removidos. Senhas e tokens não são gravados no código nem no armazenamento local do navegador. As sessões usam cookies seguros e HttpOnly, e as operações de autenticação validam a origem da solicitação.

## Ativação após a publicação

1. Na configuração de Identity do projeto Netlify, selecione registro **Invite only** e mantenha a confirmação de e-mail habilitada.
2. Convide o administrador usando o e-mail dele. Convites aceitos recebem a função `admin`; cadastros públicos são rejeitados pelos eventos de Identity.
3. Abra o link do convite no próprio site e defina a senha no formulário. A senha desejada deve ser digitada ali, não adicionada ao repositório.
4. Para contas existentes, atribua a função `admin` em Identity e use **Esqueci minha senha** no site.

Nenhuma conta foi criada ou teve a senha alterada durante esta migração. O antigo usuário local não era uma conta de Identity. O proprietário precisa convidar o administrador ou identificar uma conta existente para concluir a definição de senha.

## Recuperação e sessão

Links de convite e recuperação são processados no site e retirados da barra de endereço. O serviço valida o token antes de aceitar uma nova senha. As mensagens de recuperação não revelam se um e-mail está cadastrado. Alterações de senha durante uma sessão exigem a senha atual e só podem modificar a própria conta autenticada.

O login não aceita credenciais padrão, sessões antigas em localStorage ou falhas de rede como prova de autenticação. Uma indisponibilidade do serviço impede o login, em vez de liberar acesso local.

Esta alteração não migra os registros pluviométricos já armazenados no navegador. Esses registros e os dados estáticos do aplicativo não passam a ser dados privados no servidor. A eventual migração e proteção desses dados requerem uma implementação específica com Netlify Database.
