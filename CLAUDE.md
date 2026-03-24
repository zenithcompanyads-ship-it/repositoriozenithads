# ZENITH — Portal SaaS de Gestão de Tráfego Pago

## Visão Geral

Portal SaaS para gestão de clientes de Meta Ads (tráfego pago).
Permite ao admin (gestor de tráfego) monitorar todos os clientes, gerar
relatórios com IA (Claude) e publicar para os clientes finais.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS + CSS custom |
| Banco | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| IA | Anthropic Claude (claude-sonnet-4-6) |
| Ads API | Meta Graph API v19.0 |
| Deploy | Vercel (com Cron Jobs) |
| Gráficos | Recharts |

## Identidade Visual

- **Primária:** `#4040E8` (azul/roxo)
- **Gradiente logo:** `#6B4EFF → #FF4D00`
- **Sidebar:** `#111827` (dark)
- **Background:** `#F9F9FA`
- **Cards:** `#FFFFFF` com borda sutil e radius 12px
- **Fonte:** Inter
- **Logo:** SVG do Z com 3 barras diagonais

## Estrutura de Roles

### admin
- Acesso total a todos os clientes
- Pode gerar e editar relatórios antes de publicar
- Vê alertas, metas, histórico completo
- Gerencia usuários

### client
- Vê apenas seus próprios dados
- Relatórios só aparecem após admin publicar (`visible_to_client = true`)
- Não vê alertas, metas internas ou outros clientes

## Estrutura de Pastas

```
src/
├── app/
│   ├── login/           # Tela de login
│   ├── admin/           # Layout + páginas admin
│   │   ├── dashboard/
│   │   ├── clients/
│   │   │   ├── [id]/    # Detail com tabs
│   │   │   └── new/
│   │   ├── campaigns/
│   │   └── users/
│   ├── client/          # Layout + páginas cliente
│   │   ├── dashboard/
│   │   ├── reports/
│   │   │   ├── weekly/
│   │   │   ├── biweekly/
│   │   │   └── monthly/
│   │   ├── campaigns/
│   │   └── plan/
│   └── api/
│       ├── admin/       # Endpoints protegidos para admin
│       ├── claude/      # Geração de relatórios
│       └── cron/        # Cron jobs do Vercel
├── components/
│   ├── admin/           # Sidebar admin
│   ├── client/          # Sidebar + ReportView
│   └── ui/              # Componentes compartilhados
├── lib/
│   ├── supabase/        # client.ts, server.ts, admin.ts
│   ├── claude.ts        # Integração Anthropic
│   ├── meta.ts          # Integração Meta Graph API
│   └── utils.ts
└── types/
    └── index.ts
```

## Banco de Dados

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Estende auth.users com role e client_id |
| `clients` | Clientes de tráfego pago |
| `metrics` | Métricas diárias por cliente |
| `campaigns` | Campanhas sincronizadas da Meta |
| `reports` | Relatórios gerados pelo Claude |
| `goals` | Metas por métrica (só admin vê) |
| `monthly_plans` | Planejamento mensal |
| `alerts` | Alertas automáticos (só admin vê) |

### RLS (Row Level Security)

- `clients`: admin vê todos, client vê só o próprio
- `reports`: client só vê `visible_to_client = true`
- `alerts`, `goals`: apenas admin
- `campaigns`, `metrics`: client vê só os próprios

## Integrações

### Meta Graph API
- Base URL: `https://graph.facebook.com/v19.0`
- Endpoint: `act_{ad_account_id}/insights`
- Campos: spend, impressions, clicks, ctr, cpc, cpm, reach, actions
- Sincronização: diária via cron (7h)

### Claude API
- Modelo: `claude-sonnet-4-6`
- Prompt em português com identidade de "analista sênior da agência Zenith"
- Seções: Resumo Executivo, Destaques, Pontos de Atenção, Recomendações
- Relatórios ficam em rascunho até admin publicar

## Cron Jobs (Vercel)

| Rota | Schedule | Descrição |
|------|----------|-----------|
| `/api/cron/daily-metrics` | `0 7 * * *` | Sincroniza métricas do dia anterior |
| `/api/cron/weekly-report` | `0 8 * * 1` | Gera relatório semanal |
| `/api/cron/biweekly-report` | `0 8 1,16 * *` | Gera relatório quinzenal |
| `/api/cron/monthly-report` | `0 9 1 * *` | Gera relatório mensal |
| `/api/cron/check-alerts` | `0 */6 * * *` | Verifica metas e cria alertas |

Todos protegidos com `Authorization: Bearer {CRON_SECRET}`.

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
META_APP_ID=
META_APP_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

## Middleware

`src/middleware.ts` intercepta todas as rotas:
1. Rotas públicas (`/login`, `/`) — redireciona usuários logados
2. Rotas `/admin/*` — exige `role = admin`
3. Rotas `/client/*` — exige `role = client`
4. Rotas `/api/cron/*` — exclui do middleware (protegidas por CRON_SECRET)
