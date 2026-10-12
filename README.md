# 🌧️ Pluviômetro Web - UBS Sementes Oilema

Webapp moderno, responsivo (mobile-first) e de alto desempenho para registro, consolidação e análise pluviométrica agrícola.

Projetado especificamente para atender a regra de negócio do ciclo pluviométrico agronômico da região do Cerrado / Oeste Baiano (**Barreiras / Placas / BA**), onde a safra tem início em **Outubro** e término em **Setembro** do ano seguinte.

---

## 🚀 Destaques e Funcionalidades

1. **Ciclo Pluviométrico Agronômico (Safra)**:
   - Ordenação cronológica correta: `OUT -> NOV -> DEZ -> JAN -> FEV -> MAR -> ABR -> MAI -> JUN -> JUL -> AGO -> SET`.
   - Compatível com a marcação original da planilha Excel `PLUVIOMETRSem media.xlsx`.

2. **Cálculos e Métricas Oficiais**:
   - **Registro Total do Mês**: Soma exata de todas as precipitações diárias do mês ($\sum mm$).
   - **Média Diária do Mês (Automática)**: $\frac{\text{Total do Mês Corrente}}{\text{Quantidade Exata de Dias do Mês Calendário}}$ (calculado de forma automática sem necessidade de seleção manual).
   - **Volume Acumulado da Safra**: Soma progressiva dos 12 meses da safra.

3. **Autenticação Segura (Acesso Aberto na Internet)**:
   - Proteção de rotas de escrita contra edições não autorizadas (`POST`, `DELETE`, importação e reset).
   - Autenticação via **JWT** no servidor VPS e controle de sessão no Netlify.
   - Não há credenciais padrão no código. Para inicializar um banco novo, configure `ADMIN_USER` e `ADMIN_PASSWORD` no ambiente do servidor. Use uma senha forte com pelo menos 16 caracteres e configure `JWT_SECRET` com um valor aleatório seguro.

4. **Temas Claro e Escuro (Light & Dark Mode)**:
   - Alternância com 1 clique no botão de Sol/Lua no topo.
   - Persistência automática da preferência do usuário no navegador.

5. **Diário de Lançamentos em Destaque**:
   - Reposicionado estrategicamente entre o cabeçalho de identificação da propriedade e os indicadores/gráficos para agilizar a rotina operacional no campo.
   - Busca instantânea, paginação, edição e exclusão de leituras.

6. **Resumo Executivo em PDF**:
   - Geração de relatório/boletim pluviométrico oficial em formato **A4** com 1 clique (botão **PDF** no cabeçalho).
   - Contém: Identificação da propriedade, indicadores de KPIs, tabela mensal completa do ciclo agronômico, comparativo com todas as safras anteriores e últimas leituras diárias.
   - Perfeito para compartilhamento imediato no **WhatsApp**, **e-mail** ou impressão.

7. **Dashboard e Visualização Interativa**:
   - **Cards de KPIs**: Acumulado da safra ativa, média diária do mês atual com fórmula explícita, recorde diário absoluto de todos os tempos (127 mm em 20/10/2024) e extremos históricos (safra mais chuvosa vs mais seca).
   - **Gráfico de Progresso**: Barras mensais de precipitação sobrepostas pela curva de acúmulo da safra.
   - **Histórico Comparativo**: Sobreposição das curvas de acúmulo de todas as safras registradas (2022/2023 até 2026/2027) na mesma escala temporal de 12 meses.
   - **Tabela Matricial Consolidada**: Visão lado a lado com todos os meses, safras, médias diárias e linha de total acumulado, com exportação instantânea para CSV.
   - **Input Diário Mobile-First**: Lançamento ágil com teclado numérico automático (`inputMode="decimal"`), atalhos numéricos (`+1`, `+5`, `+10`, `+20`, `+50 mm`) e botões rápidos para "Hoje" e "Ontem".

8. **Base Pré-Carregada (Seed)**:
   - Vem com todos os **271 registros históricos** da planilha original desde a safra 2022/2023 até o início de 2026/2027.

9. **Arquitetura Dinâmica Híbrida (VPS + Netlify Ready)**:
   - **Modo VPS / Docker**: Backend Node.js Express com banco de dados **SQLite** persistente (`data/pluviometro.db`).
   - **Modo Netlify / Estático**: Se hospedado no Netlify, Vercel ou executado sem servidor, opera via IndexedDB / LocalStorage pré-populado.
   - **Backup e Restauração**: Exportação/importação em JSON e CSV a qualquer momento.

---

## 📦 Como Rodar Localmente

### Opção 1: Desenvolvimento com Hot-Reload

1. **Iniciar o Backend API**:
   ```bash
   cd server
   npm run dev
   # Rodará na porta 3001 com SQLite ativo
   ```

2. **Iniciar o Frontend Vite**:
   ```bash
   cd client
   npm run dev
   # Abrirá em http://localhost:5173
   ```

### Opção 2: Servidor Unificado

```bash
cd server
node src/server.js
# Acesse http://localhost:3001
```

---

## 🌐 Deploy no Netlify

O repositório já inclui o arquivo `netlify.toml` pré-configurado.

1. Conecte o repositório ao Netlify ou suba a pasta `client/dist` no **Netlify Drop**.
2. Parâmetros detectados automaticamente:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Configure `VITE_API_URL` com a URL HTTPS da API do backend. A hospedagem estática sozinha não fornece autenticação nem persistência de dados; o backend precisa estar implantado e acessível.
4. Os registros históricos de demonstração são incluídos no código-fonte. Não publique exportações de dados reais, bancos SQLite, segredos JWT ou arquivos `.env`.

---

## 🐳 Deploy na VPS com Docker

1. Na sua VPS (com Docker e docker-compose instalados):
   ```bash
   cd pluviometro-web
   docker compose up -d --build
   ```

2. O container unificado rodará na porta `3000` (`http://SEU_IP_VPS:3000`), gravando os dados no volume persistente `pluviometro_data`.


## Variáveis de ambiente do servidor

Configure estas variáveis no ambiente de execução, nunca no repositório:

- `ADMIN_USER`: usuário administrador inicial (opcional; padrão `admin`).
- `ADMIN_PASSWORD`: senha inicial obrigatória para criar um banco novo; use pelo menos 16 caracteres.
- `JWT_SECRET`: segredo aleatório forte para assinar tokens.
- `CORS_ORIGIN`: origem permitida do frontend, em vez de deixar acesso irrestrito.
- `DATA_DIR`: diretório persistente para o banco e o segredo JWT.

O banco SQLite e o arquivo `jwt.secret` são dados de runtime e devem permanecer fora do Git.
