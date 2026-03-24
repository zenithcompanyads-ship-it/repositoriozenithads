# ZENITH — Portal de Gestão de Tráfego Pago

Portal SaaS para gestão de clientes de Meta Ads, com relatórios automáticos gerados por IA (Claude).

## Setup

### 1. Clone e instale dependências

```bash
cd zenith-portal
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha todas as variáveis:

| Variável | Onde obter |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `META_APP_ID` | developers.facebook.com |
| `META_APP_SECRET` | developers.facebook.com |
| `CRON_SECRET` | Gere uma string aleatória segura |

### 3. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o arquivo `supabase/migrations/001_initial_schema.sql`
3. (Opcional) Execute `supabase/migrations/002_seed_data.sql` para dados de exemplo

### 4. Crie o usuário admin

1. No Supabase, vá em **Authentication → Users → Add user**
2. Crie o usuário com seu e-mail e senha
3. Execute no SQL Editor:
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE email = 'seu@email.com';
   ```

### 5. Rode localmente

```bash
npm run dev
```

Acesse `http://localhost:3000` e faça login.

---

## Deploy no Vercel

### 1. Push para GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/zenith-portal.git
git push -u origin main
```

### 2. Importe no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Importe o repositório
3. Adicione todas as variáveis de ambiente
4. Deploy!

### 3. Configure os Cron Jobs

Os crons são definidos em `vercel.json` e ativam automaticamente no plano Pro do Vercel.

Para testar manualmente:
```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://seu-app.vercel.app/api/cron/daily-metrics
```

---

## Adicionando clientes

1. Faça login como admin
2. Vá em **Clientes → Novo cliente**
3. Preencha:
   - Nome e segmento
   - Meta Ad Account ID (só o número, sem `act_`)
   - Meta Access Token (token de longa duração)
   - Orçamento mensal

4. Vá em **Usuários → Novo usuário** para criar o login do cliente
5. Vincule o usuário ao cliente criado

---

## Fluxo de relatórios

1. Cron gera métricas diárias às 7h
2. Cron gera relatório via Claude (semanal/quinzenal/mensal)
3. Admin acessa **Clientes → [Cliente] → Editor**
4. Admin edita o texto se necessário
5. Admin clica em **"Publicar para cliente"**
6. Cliente vê o relatório na área dele

---

## Arquitetura

Veja `CLAUDE.md` para documentação técnica completa.

---

## Licença

Privado — uso interno da agência Zenith.
