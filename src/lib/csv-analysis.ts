import Anthropic from '@anthropic-ai/sdk';

export interface AIAnalysis {
  resumo_executivo: string;
  destaques_performance: string[];
  pontos_atencao: string[];
  leitura_estrategica: string;
  proximos_passos: string[];
}

export interface CSVAnalysisInput {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  numDays: number;
  periodType: 'weekly' | 'biweekly' | 'monthly';
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalConversions: number;
  monthlyProjection: number;
  ctr: number;
  cpc: number;
  cpm: number;
  activeCampaigns: Array<{
    name: string;
    spend: number;
    conversions: number;
    cpc: number;
    objective: string | null;
  }>;
}

function buildPrompt(data: CSVAnalysisInput): string {
  const periodLabel =
    data.periodType === 'weekly' ? `semanal (${data.numDays} dias)`
    : data.periodType === 'biweekly' ? `quinzenal (${data.numDays} dias)`
    : `mensal (${data.numDays} dias)`;

  const campsText = data.activeCampaigns.slice(0, 5)
    .map((c, i) =>
      `  ${i + 1}. ${c.name}${c.objective ? ` [${c.objective}]` : ''} — R$${c.spend.toFixed(2)}, ${c.conversions} resultados, CPC R$${c.cpc.toFixed(2)}`
    ).join('\n') || '  Nenhuma campanha ativa.';

  return `Você é um analista sênior de mídia digital da agência Zenith Company.

Analise os dados de Meta Ads abaixo e escreva um relatório profissional em português brasileiro. Use linguagem consultiva, objetiva e orientada a resultado.

CLIENTE: ${data.clientName}
PERÍODO: ${data.periodStart} a ${data.periodEnd} (${periodLabel})

MÉTRICAS DO PERÍODO:
- Investimento total: R$ ${data.totalSpend.toFixed(2)}
- Projeção mensal: R$ ${data.monthlyProjection.toFixed(2)}
- Impressões: ${data.totalImpressions.toLocaleString('pt-BR')}
- Alcance: ${data.totalReach.toLocaleString('pt-BR')}
- Cliques: ${data.totalClicks.toLocaleString('pt-BR')}
- Conversões/Resultados: ${data.totalConversions}
- CTR médio: ${data.ctr.toFixed(2)}%
- CPC médio: R$ ${data.cpc.toFixed(2)}
- CPM médio: R$ ${data.cpm.toFixed(2)}

TOP CAMPANHAS ATIVAS:
${campsText}

Responda APENAS com JSON válido neste formato exato (sem texto antes ou depois, sem markdown):
{
  "resumo_executivo": "2-3 parágrafos com visão geral do período, resultados principais e avaliação geral. Mencione números concretos.",
  "destaques_performance": [
    "Destaque específico baseado nos dados (ex: CTR acima da média, campanha com melhor CPA)",
    "Destaque 2",
    "Destaque 3"
  ],
  "pontos_atencao": [
    "Ponto de atenção com métrica específica (ex: CPM elevado comparado ao benchmark)",
    "Ponto de atenção 2"
  ],
  "leitura_estrategica": "1-2 parágrafos de análise estratégica: posicionamento das campanhas, eficiência do funil e oportunidades.",
  "proximos_passos": [
    "Ação concreta e específica para o próximo período",
    "Ação 2",
    "Ação 3"
  ]
}`;
}

export async function generateCSVAnalysis(data: CSVAnalysisInput): Promise<AIAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado.');

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(data) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Resposta inesperada da IA.');

  const text = content.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('A IA não retornou JSON válido.');

  const parsed = JSON.parse(jsonMatch[0]) as AIAnalysis;

  if (typeof parsed.resumo_executivo !== 'string' || !Array.isArray(parsed.destaques_performance)) {
    throw new Error('Estrutura da análise inválida retornada pela IA.');
  }

  return parsed;
}
