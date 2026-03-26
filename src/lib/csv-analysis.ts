import Anthropic from '@anthropic-ai/sdk';

// Legacy type kept for PDF template backward compatibility
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

export async function generateCSVAnalysis(data: CSVAnalysisInput): Promise<string> {
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

  // ── Section 4: Micro vitórias (Claude) ──────────────────────────────────────
  const campContext = data.activeCampaigns
    .slice(0, 4)
    .map(c => {
      const type = detectType(c.resultType, c.objective);
      return `${c.name}: ${num(c.conversions)} ${TYPE_META[type].label.toLowerCase()}, ${brl(c.spend)}`;
    })
    .join('; ');

  const prompt = `Você é o analista sênior da Zenith Company. Com base nos dados abaixo, escreva SOMENTE 2-3 bullets de "Micro vitórias" — insights estratégicos curtos, motivadores e baseados nos números reais.

Dados:
- Cliente: ${data.clientName}
- Período: ${periodLabel} (${data.numDays} dias)
- Investimento: ${brl(data.totalSpend)}
- ${data.totalConversions > 0 ? `${num(data.totalConversions)} ${globalMeta.label.toLowerCase()} · ${brl(cplGlobal)} por resultado` : 'Sem conversões registradas'}
- Alcance: ${num(data.totalReach)} · Frequência: ${frequency.toFixed(2)}
- Campanhas: ${campContext || 'N/A'}

Regras:
- Cada bullet começa com "• "
- Linguagem simples, direta, sem jargões técnicos
- Foque no que está funcionando
- Não invente dados, use apenas os fornecidos
- Responda APENAS os bullets, sem título nem texto extra`;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  });

  const aiContent = message.content[0];
  if (aiContent.type !== 'text') throw new Error('Resposta inesperada da IA.');
  const victoriesSection = `\n🔥 Micro vitórias do período\n${aiContent.text.trim()}`;

  return [header, resultsSection, campaignsSection, victoriesSection].filter(Boolean).join('\n');
}
