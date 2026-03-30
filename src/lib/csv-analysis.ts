import Anthropic from '@anthropic-ai/sdk';

// Legacy type kept for PDF template backward compatibility
export interface AIAnalysis {
  resumo_executivo: string;
  destaques_performance: string[];
  pontos_atencao: string[];
  leitura_estrategica: string;
  proximos_passos: string[];
}

export interface StructuredInsight {
  icon: string;
  title: string;
  text: string;
}

export interface StructuredRecommendation {
  title: string;
  text: string;
}

export interface StructuredAnalysis {
  periodSummary: string;
  nextMonthName: string;
  insights: StructuredInsight[];
  recommendations: StructuredRecommendation[];
}

export interface CSVAnalysisResult {
  text: string;
  structured: StructuredAnalysis | null;
}

export interface CSVAnalysisInput {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  numDays: number;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalConversions: number;
  globalResultType: string | null;
  activeCampaigns: Array<{
    name: string;
    spend: number;
    conversions: number;
    impressions: number;
    reach: number;
    resultType: string | null;
    objective: string | null;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function num(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

function detectType(rt: string | null, obj: string | null): 'messaging' | 'profile_visit' | 'thruplay' | 'awareness' | 'generic' {
  const s = (rt ?? obj ?? '').toLowerCase();
  if (s.includes('messaging') || s.includes('message') || s.includes('onsite')) return 'messaging';
  if (s.includes('profile_visit') || s.includes('profile visit')) return 'profile_visit';
  if (s.includes('thruplay') || s.includes('video_view')) return 'thruplay';
  if (s.includes('reach') || s.includes('awareness') || s.includes('brand')) return 'awareness';
  return 'generic';
}

const TYPE_META = {
  messaging:     { emoji: '💬', label: 'Mensagens',       costLabel: 'Custo por mensagem' },
  profile_visit: { emoji: '👤', label: 'Visitas ao perfil', costLabel: 'Custo por visita' },
  thruplay:      { emoji: '▶️', label: 'ThruPlays',        costLabel: 'Custo por ThruPlay' },
  awareness:     { emoji: '📡', label: 'Alcance',          costLabel: 'CPM' },
  generic:       { emoji: '🎯', label: 'Resultados',       costLabel: 'Custo por resultado' },
} as const;

// ── Report builder ────────────────────────────────────────────────────────────

export async function generateCSVAnalysis(data: CSVAnalysisInput): Promise<CSVAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado.');

  const periodLabel = data.numDays <= 7 ? 'Semanal' : data.numDays <= 16 ? 'Quinzenal' : 'Mensal';
  const dateStr = new Date(data.periodEnd + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const frequency = data.totalReach > 0 ? data.totalImpressions / data.totalReach : 0;
  const cplGlobal = data.totalConversions > 0 ? data.totalSpend / data.totalConversions : 0;
  const globalType = detectType(data.globalResultType, null);
  const globalMeta = TYPE_META[globalType];

  // ── Section 1: Header ────────────────────────────────────────────────────────
  const header = `📊 Relatório ${periodLabel} — ${data.clientName} → ${dateStr}\n💰 Investimento: ${brl(data.totalSpend)}`;

  // ── Section 2: Results ───────────────────────────────────────────────────────
  const resultLines: string[] = ['\nResultados do período 👇'];
  if (data.totalConversions > 0) {
    resultLines.push(`• ${globalMeta.emoji} ${globalMeta.label}: ${num(data.totalConversions)}`);
    if (cplGlobal > 0) resultLines.push(`• 🎯 ${globalMeta.costLabel}: ${brl(cplGlobal)}`);
  }
  if (data.totalReach > 0)       resultLines.push(`• 👀 Alcance: ${num(data.totalReach)}`);
  if (data.totalImpressions > 0) resultLines.push(`• 📢 Impressões: ${num(data.totalImpressions)}`);
  if (frequency > 0)             resultLines.push(`• 🔁 Frequência: ${frequency.toFixed(2)}`);
  const resultsSection = resultLines.join('\n');

  // ── Section 3: Campaign highlights ──────────────────────────────────────────
  let campaignsSection = '';
  if (data.activeCampaigns.length > 0) {
    const campLines: string[] = ['\nCampanhas em destaque'];
    for (const c of data.activeCampaigns.slice(0, 4)) {
      const type = detectType(c.resultType, c.objective);
      const meta = TYPE_META[type];
      const cpl = c.conversions > 0 ? c.spend / c.conversions : 0;

      campLines.push(`\n${meta.emoji} ${c.name}`);
      if (c.conversions > 0) campLines.push(`• ${num(c.conversions)} ${meta.label.toLowerCase()}`);
      if (cpl > 0)           campLines.push(`• ${brl(cpl)} por ${meta.label.split(' ')[0].toLowerCase()}`);
      campLines.push(`• ${brl(c.spend)} investido`);
      if (c.impressions > 0) campLines.push(`• ${num(c.impressions)} impressões`);
    }
    campaignsSection = campLines.join('\n');
  }

  const textSummary = [header, resultsSection, campaignsSection].filter(Boolean).join('\n');

  // ── Section 4: Claude JSON analysis ─────────────────────────────────────────
  const campContext = data.activeCampaigns
    .map(c => {
      const type = detectType(c.resultType, c.objective);
      const cpl = c.conversions > 0 ? c.spend / c.conversions : 0;
      return `- ${c.name}: ${num(c.conversions)} ${TYPE_META[type].label.toLowerCase()}, investimento ${brl(c.spend)}${cpl > 0 ? `, custo por resultado ${brl(cpl)}` : ''}, alcance ${num(c.reach)}, impressões ${num(c.impressions)}`;
    })
    .join('\n');

  const prompt = `Você é o analista sênior da Zenith Company. Analise os dados de Meta Ads abaixo e retorne APENAS um JSON válido (sem markdown, sem explicações, apenas o JSON bruto) com insights e recomendações estratégicas.

DADOS DO PERÍODO:
- Cliente: ${data.clientName}
- Período: ${periodLabel} (${data.numDays} dias, ${data.periodStart} a ${data.periodEnd})
- Investimento total: ${brl(data.totalSpend)}
- Total de resultados: ${num(data.totalConversions)} (${globalMeta.label})
- Custo por resultado: ${cplGlobal > 0 ? brl(cplGlobal) : 'N/A'}
- Alcance: ${num(data.totalReach)}
- Impressões: ${num(data.totalImpressions)}
- Frequência média: ${frequency.toFixed(2)}
- Número de campanhas: ${data.activeCampaigns.length}

CAMPANHAS:
${campContext || 'Nenhuma campanha ativa'}

Retorne EXATAMENTE este JSON (sem texto adicional antes ou depois):
{
  "periodSummary": "1-2 frases descrevendo o período para o cabeçalho do relatório (mencione período, número de campanhas e resultado principal)",
  "nextMonthName": "nome do próximo mês em português (ex: Abril)",
  "insights": [
    {"icon": "emoji", "title": "título curto", "text": "2-3 frases com <strong>valores destacados</strong> para números chave."},
    {"icon": "emoji", "title": "título curto", "text": "2-3 frases com <strong>valores destacados</strong>."},
    {"icon": "emoji", "title": "título curto", "text": "2-3 frases com <strong>valores destacados</strong>."},
    {"icon": "emoji", "title": "título curto", "text": "2-3 frases com <strong>valores destacados</strong>."},
    {"icon": "emoji", "title": "título curto", "text": "2-3 frases com <strong>valores destacados</strong>."},
    {"icon": "emoji", "title": "título curto", "text": "2-3 frases com <strong>valores destacados</strong>."}
  ],
  "recommendations": [
    {"title": "título da ação", "text": "1-2 frases com <strong>números específicos/sugestões</strong>."},
    {"title": "título da ação", "text": "1-2 frases com <strong>números específicos/sugestões</strong>."},
    {"title": "título da ação", "text": "1-2 frases com <strong>números específicos/sugestões</strong>."},
    {"title": "título da ação", "text": "1-2 frases com <strong>números específicos/sugestões</strong>."},
    {"title": "título da ação", "text": "1-2 frases com <strong>números específicos/sugestões</strong>."},
    {"title": "título da ação", "text": "1-2 frases com <strong>números específicos/sugestões</strong>."}
  ]
}

Regras:
- Use APENAS os dados fornecidos, não invente números
- Insights devem ser observações sobre o que os dados mostram (performance, eficiência, padrões)
- Recomendações devem ser ações concretas para o próximo mês
- Use <strong> ao redor de números e métricas importantes
- Linguagem direta, profissional, em português brasileiro
- 6 insights e 6 recomendações exatamente`;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const aiContent = message.content[0];
  if (aiContent.type !== 'text') throw new Error('Resposta inesperada da IA.');

  let structured: StructuredAnalysis | null = null;
  try {
    const rawText = aiContent.text.trim();
    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    structured = JSON.parse(jsonText) as StructuredAnalysis;
  } catch {
    console.warn('Failed to parse structured JSON from Claude:', aiContent.text.slice(0, 200));
    structured = null;
  }

  return { text: textSummary, structured };
}
