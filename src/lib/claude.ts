import Anthropic from '@anthropic-ai/sdk';
import type { Metric, Client } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export type ReportType = 'weekly' | 'biweekly' | 'monthly';

const periodLabels: Record<ReportType, string> = {
  weekly: 'semanal',
  biweekly: 'quinzenal',
  monthly: 'mensal',
};

function buildMetricsText(metrics: Metric[]): string {
  if (!metrics.length) return 'Sem dados disponíveis para o período.';

  const totals = metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const avgCtr = metrics.reduce((s, m) => s + m.ctr, 0) / metrics.length;
  const avgCpc = metrics.reduce((s, m) => s + m.cpc, 0) / metrics.length;
  const avgCpm = metrics.reduce((s, m) => s + m.cpm, 0) / metrics.length;
  const avgRoas = metrics.reduce((s, m) => s + m.roas, 0) / metrics.length;

  const daily = metrics
    .map(
      (m) =>
        `  ${m.date}: Investido R$${m.spend.toFixed(2)}, ${m.impressions} impressões, ${m.clicks} cliques, CTR ${m.ctr.toFixed(2)}%`
    )
    .join('\n');

  return `
RESUMO DO PERÍODO:
- Investimento total: R$ ${totals.spend.toFixed(2)}
- Impressões totais: ${totals.impressions.toLocaleString('pt-BR')}
- Cliques totais: ${totals.clicks.toLocaleString('pt-BR')}
- Conversões totais: ${totals.conversions}
- CTR médio: ${avgCtr.toFixed(2)}%
- CPC médio: R$ ${avgCpc.toFixed(2)}
- CPM médio: R$ ${avgCpm.toFixed(2)}
- ROAS médio: ${avgRoas.toFixed(2)}x

DADOS DIÁRIOS:
${daily}
  `.trim();
}

export async function generateReport(
  client: Client,
  metrics: Metric[],
  type: ReportType
): Promise<string> {
  const periodLabel = periodLabels[type];
  const metricsText = buildMetricsText(metrics);

  const prompt = `Você é um analista sênior de mídia digital da agência Zenith.

Analise os dados de Meta Ads abaixo e escreva um relatório ${periodLabel} em português brasileiro com as seguintes seções:

1. **Resumo Executivo** — visão geral concisa do período
2. **Destaques de Performance** — resultados positivos e conquistas
3. **Pontos de Atenção** — métricas abaixo do esperado ou tendências negativas
4. **Recomendações Estratégicas** — ações práticas para os próximos dias

Cliente: ${client.name}
Segmento: ${client.segment ?? 'Não informado'}
Período: ${type === 'weekly' ? '7 dias' : type === 'biweekly' ? '15 dias' : '30 dias'}

${metricsText}

Escreva de forma profissional mas acessível, sem jargões excessivos. Foco em insights acionáveis.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}
