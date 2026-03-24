import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { clientId, clientName, month } = await req.json();
  const adminClient = createAdminClient();

  // Fetch last 30 days of metrics
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: metrics } = await adminClient
    .from('metrics')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date');

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(month + '-01'));

  const metricsText = metrics?.length
    ? metrics.map(m =>
        `${m.date}: Investido R$${m.spend}, ${m.impressions} impressões, ${m.clicks} cliques, CTR ${m.ctr}%, CPC R$${m.cpc}, ROAS ${m.roas}x`
      ).join('\n')
    : 'Sem dados históricos disponíveis.';

  const prompt = `Com base nos dados históricos desse cliente, crie um planejamento estratégico para o mês de ${monthLabel}.

Entregue no seguinte formato:

**OBJETIVO DO MÊS**
[Defina o principal objetivo estratégico]

**ORÇAMENTO RECOMENDADO**
[Valor total sugerido em R$ e justificativa]

**DISTRIBUIÇÃO POR CAMPANHA**
[Liste as campanhas recomendadas com orçamento individual, objetivo e período]

**ESTRATÉGIAS PLANEJADAS**
[Descreva as estratégias táticas para o período]

**METAS DE PERFORMANCE**
- ROAS meta: [valor]
- CPC máximo: R$ [valor]
- CTR mínimo: [valor]%
- Conversões meta: [valor]

**OBSERVAÇÕES GERAIS**
[Pontos de atenção e contexto adicional]

Cliente: ${clientName}
Histórico dos últimos 30 dias:
${metricsText}

Seja específico e realista com base nos dados históricos.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text')
    return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 500 });

  return NextResponse.json({ content: content.text });
}
