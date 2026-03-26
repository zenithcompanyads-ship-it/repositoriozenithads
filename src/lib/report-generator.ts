// Pure server-side HTML report generator — zero external dependencies
import { isActiveCampaign, getResultLabel } from '@/lib/utils';

export interface CSVReportData {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  numDays: number;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalConversions: number;
  monthlyProjection: number;
  daysInMonth: number;
  globalResultType?: string | null;
  globalFrequency?: number;
  portalLogin?: string;
  portalPassword?: string;
  portalHandle?: string;
  aiSummary?: string | null;
  campaigns: Array<{
    name: string;
    spend: number;
    conversions: number;
    cpc: number;
    cpm?: number;
    ctr?: number;
    status: string;
    budget: number;
    impressions: number;
    clicks: number;
    reach: number;
    frequency?: number;
    resultType?: string | null;
    objective?: string | null;
  }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function num(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v));
}

function fdate(d: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d + 'T12:00:00'));
}

function fdateShort(d: string): string {
  const dt = new Date(d + 'T12:00:00');
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${String(dt.getDate()).padStart(2,'0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function monthLabel(d: string): string {
  const dt = new Date(d + 'T12:00:00');
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T12:00:00Z');
  const last = new Date(end + 'T12:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export interface MonthRow {
  label: string;
  days: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export function monthlyBreakdown(
  periodStart: string,
  periodEnd: string,
  totalSpend: number,
  totalImpressions: number,
  totalClicks: number,
  totalConversions: number,
): MonthRow[] {
  const days = datesBetween(periodStart, periodEnd);
  if (!days.length) return [];
  const map = new Map<string, number>();
  for (const d of days) {
    const k = d.substring(0, 7);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, daysCount]) => {
      const [, m] = month.split('-').map(Number);
      const prop = daysCount / days.length;
      return {
        label: `${MONTHS[m - 1]}/${month.substring(2, 4)}`,
        days: daysCount,
        spend: totalSpend * prop,
        impressions: Math.round(totalImpressions * prop),
        clicks: Math.round(totalClicks * prop),
        conversions: Math.round(totalConversions * prop),
      };
    });
}

// ── AI victory extraction ────────────────────────────────────────────────────

function extractAiVictories(summary: string): string[] {
  const idx = summary.indexOf('🔥');
  if (idx === -1) return [];
  const after = summary.slice(idx);
  const nextSection = after.indexOf('\n\n', 2);
  const section = nextSection > 0 ? after.slice(0, nextSection) : after;
  return section.split('\n')
    .filter(l => l.trimStart().startsWith('•'))
    .map(l => l.trimStart().replace(/^•\s*/, '').trim())
    .filter(Boolean);
}

// ── Campaign categorization ──────────────────────────────────────────────────

type CampType = 'conversas' | 'visitas' | 'video' | 'alcance' | 'outros';

function categoryCamp(resultType: string | null | undefined, name?: string): CampType {
  const rt = (resultType ?? '').toLowerCase();
  const label = getResultLabel(resultType);
  if (rt.includes('thruplay') || rt.includes('video_view') || rt.includes('2_second') || label === 'ThruPlays') return 'video';
  if (['Conversas Iniciadas', 'Mensagens', 'Leads', 'Compras'].includes(label)) return 'conversas';
  if (label === 'Visitas ao Perfil') return 'visitas';
  if (label === 'Alcance') return 'alcance';
  const n = (name ?? '').toLowerCase();
  if (n.includes('thruplay') || n.includes('video') || n.includes('vídeo')) return 'video';
  if (n.includes('whatsapp') || n.includes('mensagem') || n.includes('engj') || n.includes('eng |') || n.includes('remarketing') || n.includes('conversão') || n.includes('pursh')) return 'conversas';
  if (n.includes('perfil') || n.includes('traf') || n.includes('acesso')) return 'visitas';
  return 'outros';
}

// ── Campaign type label for display ─────────────────────────────────────────

function campTypeLabel(c: CSVReportData['campaigns'][0]): string {
  const type = categoryCamp(c.resultType, c.name);
  const n = c.name.toLowerCase();
  if (n.includes('remarketing')) return 'REMARKETING';
  if (type === 'visitas') return 'TRÁFEGO';
  if (type === 'conversas') return 'CONVERSÃO';
  if (type === 'alcance') return 'ALCANCE';
  return 'CAMPANHA';
}

// ── Campaign objective description ───────────────────────────────────────────

function campObjectiveDesc(c: CSVReportData['campaigns'][0]): string {
  if (c.objective) return esc(c.objective);
  const type = categoryCamp(c.resultType, c.name);
  const n = c.name.toLowerCase();
  if (n.includes('remarketing')) return 'Reengajamento de audiência quente';
  if (type === 'visitas') return 'Visitas ao perfil do Instagram';
  if (type === 'conversas') return 'Mensagens iniciadas no DM';
  return 'Objetivo de campanha';
}

// ── Campaign result label ────────────────────────────────────────────────────

function campResultLabel(c: CSVReportData['campaigns'][0]): string {
  const type = categoryCamp(c.resultType, c.name);
  const n = c.name.toLowerCase();
  if (n.includes('remarketing')) return 'msgs remarketing mês';
  if (type === 'visitas') return 'visitas no mês';
  if (type === 'conversas') return 'mensagens no mês';
  return 'resultados no mês';
}

// ── Main generator ───────────────────────────────────────────────────────────

export function generateCSVReport(data: CSVReportData): string {
  const {
    clientName, periodStart, periodEnd, numDays,
    totalSpend, totalImpressions, totalReach,
    monthlyProjection, daysInMonth,
    campaigns,
  } = data;

  const aiSummary = data.aiSummary ?? null;
  const portalLogin = data.portalLogin ?? 'cliente';
  const portalPassword = data.portalPassword ?? 'zenith2026';
  const portalHandle = data.portalHandle ?? ('@' + portalLogin);
  const avatarLetter = clientName.charAt(0).toUpperCase();

  // Campaign groups
  const activeCampaigns = campaigns.filter(c => isActiveCampaign(c.status));

  const byType = (type: CampType) => campaigns.filter(c => categoryCamp(c.resultType, c.name) === type);

  const conversasCamps = byType('conversas');
  const visitasCamps = byType('visitas');

  // Aggregate metrics
  const totalLeads = conversasCamps.reduce((s, c) => s + c.conversions, 0);
  const totalProfileVisits = visitasCamps.reduce((s, c) => s + c.conversions, 0);
  const totalAllResults = totalLeads + totalProfileVisits;
  const spendConversas = conversasCamps.reduce((s, c) => s + c.spend, 0);
  const spendVisitas = visitasCamps.reduce((s, c) => s + c.spend, 0);

  const videoCamps = byType('video');
  const totalThruPlays = videoCamps.reduce((s, c) => s + c.conversions, 0);
  const spendVideo = videoCamps.reduce((s, c) => s + c.spend, 0);
  const avgCPThru = totalThruPlays > 0 ? spendVideo / totalThruPlays : 0;

  const avgCPL = totalLeads > 0 ? spendConversas / totalLeads : 0;
  const avgCPV = totalProfileVisits > 0 ? spendVisitas / totalProfileVisits : 0;
  const avgCPRAll = totalAllResults > 0 ? totalSpend / totalAllResults : 0;

  const dailyRate = totalSpend / Math.max(numDays, 1);
  const weekFactor = 7 / Math.max(numDays, 1);

  // Weekly estimates
  const weekSpend = totalSpend * weekFactor;
  const weekReach = Math.round(totalReach * weekFactor);
  const weekImpressions = Math.round(totalImpressions * weekFactor);
  const weekAllResults = Math.round(totalAllResults * weekFactor);

  // Funnel rates
  const alcanceRate = totalImpressions > 0 ? totalReach / totalImpressions * 100 : 0;
  const visitaRate = totalReach > 0 ? totalProfileVisits / totalReach * 100 : 0;
  const conversaRate = totalProfileVisits > 0 ? totalLeads / totalProfileVisits * 100 : 0;

  // Donut SVG
  const circumference = 251.3;
  const visitasPct = totalAllResults > 0 ? totalProfileVisits / totalAllResults : 0;
  const conversasPct = totalAllResults > 0 ? totalLeads / totalAllResults : 0;
  const visitasDash = `${(visitasPct * circumference).toFixed(1)} ${(conversasPct * circumference).toFixed(1)}`;
  const conversasDash = `${(conversasPct * circumference).toFixed(1)} ${(visitasPct * circumference).toFixed(1)}`;
  const conversasOffset = -(circumference - visitasPct * circumference);

  // Sorted campaigns by conversions desc
  const sortedByCampaigns = [...campaigns].sort((a, b) => b.conversions - a.conversions);

  // Investment distribution (sorted by spend desc)
  const sortedBySpend = [...campaigns].sort((a, b) => b.spend - a.spend);
  const investColors = ['#9FE870', '#5fa83a', '#3a7d22', '#265714'];

  // CPR ranking (sorted by CPR ascending, filter campaigns with conversions > 0)
  const rankedByCPR = [...campaigns]
    .filter(c => c.conversions > 0)
    .map(c => ({ ...c, cpr: c.spend / c.conversions }))
    .sort((a, b) => a.cpr - b.cpr);
  const cprIcons = ['🟢', '🟡', '🟠', '🔴'];

  // Best campaigns for insights
  const bestVisitasCamp = visitasCamps.filter(c => c.conversions > 0)
    .sort((a, b) => (a.spend / Math.max(a.conversions, 1)) - (b.spend / Math.max(b.conversions, 1)))[0];
  const bestConversasCamp = conversasCamps.filter(c => c.conversions > 0)
    .sort((a, b) => (a.spend / Math.max(a.conversions, 1)) - (b.spend / Math.max(b.conversions, 1)))[0];
  const remarketingCamp = campaigns.find(c => c.name.toLowerCase().includes('remarketing'));

  // Total active budget per day
  const totalBudgetPerDay = activeCampaigns.reduce((s, c) => s + (c.budget || 0), 0);

  // Period label
  const periodLabel = `${fdateShort(periodStart)} → ${fdateShort(periodEnd)}`;
  const week7Start = (() => {
    const d = new Date(periodEnd + 'T12:00:00');
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  })();
  const weekPeriodLabel = `${fdateShort(week7Start)} → ${fdateShort(periodEnd)}`;
  const mLabel = monthLabel(periodStart);

  // JS data for bar chart
  const barChartData = sortedByCampaigns.slice(0, 6).map((c, i) => {
    const color = investColors[Math.min(i, investColors.length - 1)];
    const shortName = c.name.replace(/^ZENITH\s*\|\s*/i, '').replace(/^ZNT\s*\|\s*/i, '').split('|')[0].trim().substring(0, 12);
    return `{ label: '${esc(shortName)}', val: ${c.conversions}, color: '${color}' }`;
  }).join(',\n      ');

  // panelMeta for JS
  const panelMetaJS = `{
    'mes':          { title: 'Resultado do Mês',      sub: '${periodLabel}' },
    'semana':       { title: 'Últimos 7 Dias',         sub: '${weekPeriodLabel}' },
    'campanhas':    { title: 'Campanhas Ativas',       sub: '${activeCampaigns.length} campanhas em veiculação agora' },
    'funil':        { title: 'Funil de Resultados',    sub: 'Jornada completa do lead — ${mLabel}' },
    'investimento': { title: 'Investimento',           sub: 'Distribuição e eficiência do budget' },
  }`;

  // Render campaign table rows (monthly)
  function renderCampTableRows(camps: typeof campaigns, weekly: boolean): string {
    return camps.map(c => {
      const factor = weekly ? weekFactor : 1;
      const convs = weekly ? Math.round(c.conversions * factor) : c.conversions;
      const reach = weekly ? Math.round(c.reach * factor) : c.reach;
      const imps = weekly ? Math.round(c.impressions * factor) : c.impressions;
      const sp = weekly ? c.spend * factor : c.spend;
      const cpr = convs > 0 ? sp / convs : (c.conversions > 0 ? c.spend / c.conversions : 0);
      const statusBadge = isActiveCampaign(c.status)
        ? '<span class="badge-active">Ativo</span>'
        : '<span style="font-size:10px;color:var(--text-muted);padding:3px 10px;border-radius:20px;border:1px solid var(--border-soft);">Pausado</span>';
      const type = categoryCamp(c.resultType, c.name);
      const typeHint = type === 'visitas' ? 'Visitas ao perfil' : type === 'conversas' ? 'Mensagens via DM' : 'Resultado';
      return `<tr>
              <td><div class="camp-name">${esc(c.name)}<span>${typeHint}</span></div></td>
              <td>${statusBadge}</td>
              <td><span class="num num-green">${num(convs)}</span></td>
              <td><span class="num">${num(reach)}</span></td>
              <td><span class="num">${num(imps)}</span></td>
              <td><span class="num">${brl(cpr)}</span></td>
              <td><span class="num">${brl(sp)}</span></td>
            </tr>`;
    }).join('\n');
  }

  // Render campaign cards (panel campanhas)
  function renderCampCards(): string {
    return activeCampaigns.map(c => {
      const typeTag = campTypeLabel(c);
      const budgetLabel = c.budget > 0 ? `${typeTag} · R$ ${Math.round(c.budget)}/DIA` : `${typeTag} · META ADS`;
      const objDesc = campObjectiveDesc(c);
      const resultLbl = campResultLabel(c);
      const cpr = c.conversions > 0 ? c.spend / c.conversions : 0;
      return `<div class="card" style="border-color:rgba(159,232,112,0.25);">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span class="badge-active">Ativo</span>
                <span style="font-size:10px;color:var(--text-muted);letter-spacing:1px;">${esc(budgetLabel)}</span>
              </div>
              <div style="font-size:16px;font-weight:500;margin-bottom:4px;">${esc(c.name)}</div>
              <div style="font-size:12px;color:var(--text-muted);">Objetivo: ${objDesc} · Contínuo</div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--primary);">${num(c.conversions)}</div>
              <div style="font-size:11px;color:var(--text-muted);">${resultLbl}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft);">
            <div><div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">CPR</div><div class="num">${brl(cpr)}</div></div>
            <div><div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">Alcance</div><div class="num">${num(c.reach)}</div></div>
            <div><div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">Impressões</div><div class="num">${num(c.impressions)}</div></div>
            <div><div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">Investido</div><div class="num num-green">${brl(c.spend)}</div></div>
          </div>
        </div>`;
    }).join('\n');
  }

  // Render investment distribution bars
  function renderInvestBars(): string {
    return sortedBySpend.map((c, i) => {
      const pct = totalSpend > 0 ? (c.spend / totalSpend * 100) : 0;
      const color = investColors[Math.min(i, investColors.length - 1)];
      const shortName = c.name.replace(/^ZENITH\s*\|\s*/i, '').replace(/^ZNT\s*\|\s*/i, '').split('|')[0].trim().substring(0, 22);
      return `<div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span>${esc(shortName)}</span><span class="num">${brl(c.spend)} — ${pct.toFixed(1)}%</span>
              </div>
              <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden">
                <div style="width:${Math.min(pct, 100).toFixed(1)}%;height:100%;background:${color};border-radius:6px"></div>
              </div>
            </div>`;
    }).join('\n');
  }

  // Weekly investment breakdown grid
  function renderWeekInvestGrid(): string {
    return activeCampaigns.map((c, i) => {
      const weekSp = c.spend * weekFactor;
      const weekConv = Math.round(c.conversions * weekFactor);
      const type = categoryCamp(c.resultType, c.name);
      const n = c.name.toLowerCase();
      let label = 'RESULTADO';
      let convLabel = 'resultados';
      if (n.includes('remarketing')) { label = 'REMARKETING'; convLabel = 'msgs'; }
      else if (type === 'visitas') { label = 'TRÁFEGO'; convLabel = 'visitas'; }
      else if (type === 'conversas') { label = 'CONVERSÃO'; convLabel = 'mensagens'; }
      const valueColor = i === 0 ? 'var(--primary)' : 'var(--white)';
      return `<div>
            <div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:8px;">${label}</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:${valueColor};">${brl(weekSp)}</div>
            <div style="font-size:11px;color:var(--text-muted);">${num(weekConv)} ${convLabel}</div>
          </div>`;
    }).join('\n');
  }

  // Insights panel MÊS
  const insight1 = bestVisitasCamp
    ? `Campanha de Tráfego foi a estrela do mês — <strong>${num(bestVisitasCamp.conversions)} visitas</strong> ao perfil com custo por resultado de apenas <strong>${brl(bestVisitasCamp.conversions > 0 ? bestVisitasCamp.spend / bestVisitasCamp.conversions : 0)}</strong>. Excelente eficiência.`
    : `Total de <strong>${num(totalProfileVisits)} visitas ao perfil</strong> demonstrando forte presença digital da marca.`;

  const insight2 = bestConversasCamp
    ? `A campanha de <strong>Conversão</strong> gerou <strong>${num(bestConversasCamp.conversions)} mensagens iniciadas</strong> no mês — pessoas realmente interessadas em agendar ou tirar dúvidas.`
    : `Total de <strong>${num(totalLeads)} conversas iniciadas</strong> no período com investimento de ${brl(spendConversas)}.`;

  const insight3 = remarketingCamp
    ? `O <strong>Remarketing</strong> reconectou <strong>${num(remarketingCamp.conversions)} leads</strong> de audiência quente, com budget controlado de R$ ${Math.round((remarketingCamp.budget || 0))}/dia. Estratégia de retenção funcionando.`
    : `<strong>${activeCampaigns.length} campanhas ativas</strong> operando em paralelo, cobrindo diferentes etapas do funil de resultados.`;

  const insight4 = `Total de <strong>${num(totalImpressions)} impressões</strong> e <strong>${num(totalReach)} pessoas alcançadas</strong> — a marca ${esc(clientName)} está sendo vista com consistência.`;

  // Insights investimento
  const invInsight1 = avgCPV > 0
    ? `Para cada <strong>R$ 1,00</strong> investido em tráfego, recebeu <strong>${(1 / avgCPV).toFixed(1)} visitas</strong> ao perfil — custo extremamente competitivo.`
    : `Investimento total de <strong>${brl(totalSpend)}</strong> com média diária de <strong>${brl(dailyRate)}</strong>.`;

  const invInsight2 = avgCPL > 0
    ? `Cada <strong>mensagem iniciada</strong> custou em média <strong>${brl(avgCPL)}</strong> considerando todas as campanhas de conversão — excelente para o segmento.`
    : `<strong>${num(totalLeads)} conversas iniciadas</strong> geradas com investimento total em conversão de ${brl(spendConversas)}.`;

  const invInsight3 = `<strong>${num(totalReach)} pessoas</strong> foram impactadas pela marca por apenas <strong>${brl(totalSpend)}</strong> no mês.`;

  // Week comparison bars
  const weekResultPct = totalAllResults > 0 ? (weekAllResults / totalAllResults * 100) : 0;
  const weekReachPct = totalReach > 0 ? (weekReach / totalReach * 100) : 0;
  const weekImpPct = totalImpressions > 0 ? (weekImpressions / totalImpressions * 100) : 0;
  const weekSpendPct = totalSpend > 0 ? (weekSpend / totalSpend * 100) : 0;


  // Extract victories from AI summary
  const aiVictories = aiSummary ? extractAiVictories(aiSummary) : [];

  // Computed victories (fallback when no AI)
  const computedVictories: string[] = [];
  const globalFreq = data.globalFrequency ?? (totalReach > 0 ? totalImpressions / totalReach : 0);
  if (globalFreq > 0 && globalFreq < 2.5) computedVictories.push(`Frequência saudável de ${globalFreq.toFixed(2)}x — audiência sendo renovada com consistência`);
  if (avgCPL > 0 && totalLeads > 0) computedVictories.push(`${num(totalLeads)} mensagens iniciadas com custo médio de ${brl(avgCPL)} — conversão funcionando`);
  if (avgCPV > 0 && totalProfileVisits > 0) computedVictories.push(`${num(totalProfileVisits)} visitas ao perfil por apenas ${brl(avgCPV)} cada — tráfego qualificado`);
  if (activeCampaigns.length > 0) computedVictories.push(`${activeCampaigns.length} campanha${activeCampaigns.length > 1 ? 's ativas' : ' ativa'} em veiculação simultânea`);

  const victories = aiVictories.length > 0 ? aiVictories : computedVictories.slice(0, 3);

  // Render objective blocks
  function renderObjBlock(
    emoji: string, title: string, total: number, cost: number, costLabel: string,
    spend: number, camps: typeof campaigns
  ): string {
    if (total === 0 && camps.length === 0) return '';
    const activeCampsOfType = camps.filter(c => isActiveCampaign(c.status));
    return `<div class="obj-block">
      <div class="obj-header">
        <span class="obj-emoji">${emoji}</span>
        <div>
          <div class="obj-title">${title}</div>
          <div class="obj-sub">${activeCampsOfType.length} campanha${activeCampsOfType.length !== 1 ? 's' : ''} ativa${activeCampsOfType.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="obj-total">${num(total)}<span>${title.toLowerCase()}</span></div>
      </div>
      <div class="obj-metrics">
        <div class="obj-metric"><span class="om-label">${costLabel}</span><span class="om-val primary">${cost > 0 ? brl(cost) : '—'}</span></div>
        <div class="obj-metric"><span class="om-label">Investido</span><span class="om-val">${brl(spend)}</span></div>
        <div class="obj-metric"><span class="om-label">Resultado</span><span class="om-val primary">${num(total)}</span></div>
      </div>
      ${activeCampsOfType.length > 0 ? `<div class="obj-camps">
        ${activeCampsOfType.slice(0, 3).map(c => {
          const cpr = c.conversions > 0 ? c.spend / c.conversions : 0;
          const shortName = c.name.replace(/^ZENITH\s*\|\s*/i, '').replace(/^ZNT\s*\|\s*/i, '').split('|').map(s => s.trim()).join(' · ');
          return `<div class="obj-camp-row">
            <span class="ocr-name">${esc(shortName)}</span>
            <span class="ocr-result">${num(c.conversions)} · ${cpr > 0 ? brl(cpr) + ' cada' : brl(c.spend)}</span>
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>`;
  }

  const conversasBlock = renderObjBlock('💬', 'Mensagens Iniciadas', totalLeads, avgCPL, 'Custo por Mensagem', spendConversas, conversasCamps);
  const visitasBlock = renderObjBlock('👤', 'Visitas ao Perfil', totalProfileVisits, avgCPV, 'Custo por Visita', spendVisitas, visitasCamps);
  const videoBlock = renderObjBlock('▶️', 'ThruPlays (Vídeo)', totalThruPlays, avgCPThru, 'Custo por ThruPlay', spendVideo, videoCamps);

  const hasObjectiveData = conversasBlock || visitasBlock || videoBlock;

  // Campaign cards (active only, max 4)
  function renderActiveCampCards(): string {
    return activeCampaigns.slice(0, 4).map(c => {
      const type = categoryCamp(c.resultType, c.name);
      const typeEmoji = type === 'conversas' ? '💬' : type === 'visitas' ? '👤' : type === 'video' ? '▶️' : type === 'alcance' ? '📡' : '🎯';
      const typeLabel = type === 'conversas' ? 'Mensagens' : type === 'visitas' ? 'Visitas Perfil' : type === 'video' ? 'ThruPlay' : type === 'alcance' ? 'Alcance' : 'Resultado';
      const resultLabel = type === 'conversas' ? 'mensagens' : type === 'visitas' ? 'visitas' : type === 'video' ? 'ThruPlays' : type === 'alcance' ? 'alcançados' : 'resultados';
      const cpr = c.conversions > 0 ? c.spend / c.conversions : 0;
      const primaryVal = type === 'alcance' ? num(c.reach) : num(c.conversions);
      const shortName = c.name.replace(/^ZENITH\s*\|\s*/i, '').replace(/^ZNT\s*\|\s*/i, '').split('|').map(s => s.trim()).slice(0, 2).join(' · ');
      const pct = totalSpend > 0 ? (c.spend / totalSpend * 100) : 0;
      return `<div class="camp-card">
        <div class="cc-top">
          <div class="cc-badge">${typeEmoji} ${typeLabel}</div>
          <div class="cc-spend">${brl(c.spend)}<span>${pct.toFixed(0)}% do total</span></div>
        </div>
        <div class="cc-name">${esc(shortName)}</div>
        <div class="cc-result">
          <div class="cc-metric"><span class="ccm-val primary">${primaryVal}</span><span class="ccm-lbl">${resultLabel}</span></div>
          ${cpr > 0 ? `<div class="cc-metric"><span class="ccm-val">${brl(cpr)}</span><span class="ccm-lbl">custo/resultado</span></div>` : ''}
          <div class="cc-metric"><span class="ccm-val">${num(c.impressions)}</span><span class="ccm-lbl">impressões</span></div>
        </div>
        <div class="cc-bar-wrap"><div class="cc-bar" style="width:${Math.min(pct, 100).toFixed(1)}%"></div></div>
      </div>`;
    }).join('\n');
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório ${esc(clientName)} — ZENITH</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #9FE870;
    --dark:    #090D06;
    --card:    rgba(255,255,255,0.04);
    --border:  rgba(255,255,255,0.08);
    --muted:   rgba(255,255,255,0.45);
    --sub:     rgba(255,255,255,0.65);
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--dark); color:#fff; font-family:'DM Sans',sans-serif; min-height:100vh; }

  /* PAGE */
  .page { max-width:820px; margin:0 auto; padding:48px 24px 80px; }

  /* HEADER */
  .rpt-header { text-align:center; padding:40px 0 48px; border-bottom:1px solid var(--border); margin-bottom:48px; }
  .rpt-brand { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:5px; color:var(--primary); text-transform:uppercase; margin-bottom:16px; }
  .rpt-client { font-family:'Cormorant Garamond',serif; font-size:42px; font-weight:300; color:#fff; letter-spacing:2px; margin-bottom:8px; }
  .rpt-period { font-size:14px; color:var(--sub); margin-bottom:16px; }
  .rpt-type-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(159,232,112,0.12); border:1px solid rgba(159,232,112,0.25); border-radius:24px; padding:6px 16px; font-size:12px; color:var(--primary); letter-spacing:1px; }

  /* SECTIONS */
  .section { margin-bottom:48px; }
  .section-label { font-family:'Space Mono',monospace; font-size:9px; letter-spacing:4px; color:var(--primary); text-transform:uppercase; margin-bottom:16px; }

  /* RESUMO */
  .resumo-box { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:28px 32px; }
  .resumo-text { font-family:'DM Sans',sans-serif; font-size:14px; color:var(--sub); line-height:1.8; white-space:pre-wrap; }

  /* KPI GRID */
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  @media(max-width:600px){ .kpi-grid{grid-template-columns:repeat(2,1fr);} }
  .kpi { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:20px 18px; }
  .kpi-label { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px; }
  .kpi-val { font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:400; color:#fff; display:block; margin-bottom:4px; }
  .kpi-val.primary { color:var(--primary); }
  .kpi-sub { font-size:11px; color:var(--muted); }

  /* OBJETIVO BLOCKS */
  .obj-blocks { display:flex; flex-direction:column; gap:16px; }
  .obj-block { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:24px; }
  .obj-header { display:flex; align-items:center; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
  .obj-emoji { font-size:28px; line-height:1; }
  .obj-title { font-size:16px; font-weight:500; color:#fff; }
  .obj-sub { font-size:11px; color:var(--muted); margin-top:2px; }
  .obj-total { margin-left:auto; text-align:right; font-family:'Cormorant Garamond',serif; font-size:32px; color:var(--primary); line-height:1; }
  .obj-total span { display:block; font-family:'DM Sans',sans-serif; font-size:10px; color:var(--muted); margin-top:4px; }
  .obj-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:16px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:16px; }
  @media(max-width:500px){ .obj-metrics{grid-template-columns:repeat(2,1fr);} }
  .obj-metric { }
  .om-label { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:4px; }
  .om-val { font-size:16px; font-weight:600; color:#fff; }
  .om-val.primary { color:var(--primary); }
  .obj-camps { display:flex; flex-direction:column; gap:8px; }
  .obj-camp-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .ocr-name { font-size:12px; color:var(--sub); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ocr-result { font-size:12px; color:var(--primary); font-weight:500; white-space:nowrap; }

  /* CAMPAIGN CARDS */
  .camp-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  @media(max-width:600px){ .camp-grid{grid-template-columns:1fr;} }
  .camp-card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px; transition:border-color .2s; }
  .camp-card:hover { border-color:rgba(159,232,112,0.3); }
  .cc-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:10px; }
  .cc-badge { font-size:11px; color:var(--primary); background:rgba(159,232,112,0.1); border:1px solid rgba(159,232,112,0.2); border-radius:20px; padding:3px 10px; white-space:nowrap; }
  .cc-spend { text-align:right; font-family:'Cormorant Garamond',serif; font-size:22px; color:#fff; line-height:1.1; }
  .cc-spend span { display:block; font-family:'DM Sans',sans-serif; font-size:10px; color:var(--muted); }
  .cc-name { font-size:13px; font-weight:500; color:var(--sub); margin-bottom:14px; line-height:1.4; }
  .cc-result { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
  .cc-metric { display:flex; flex-direction:column; gap:2px; }
  .ccm-val { font-size:16px; font-weight:600; color:#fff; }
  .ccm-val.primary { color:var(--primary); }
  .ccm-lbl { font-size:10px; color:var(--muted); }
  .cc-bar-wrap { height:3px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; }
  .cc-bar { height:100%; background:var(--primary); border-radius:2px; }

  /* VICTORIES */
  .victories-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
  @media(max-width:600px){ .victories-grid{grid-template-columns:1fr;} }
  .victory-item { background:rgba(159,232,112,0.06); border:1px solid rgba(159,232,112,0.18); border-radius:14px; padding:16px 18px; font-size:13px; color:var(--sub); line-height:1.6; }
  .victory-item::before { content:'✓'; color:var(--primary); font-weight:700; margin-right:8px; }

  /* FUNIL */
  .funnel { display:grid; grid-template-columns:repeat(3,1fr); gap:0; }
  .funnel-step { position:relative; background:rgba(159,232,112,0.06); border:1px solid rgba(159,232,112,0.15); padding:20px 16px; text-align:center; }
  .funnel-step:first-child { border-radius:12px 0 0 12px; }
  .funnel-step:last-child { border-radius:0 12px 12px 0; }
  .funnel-step+.funnel-step { border-left:none; }
  .fs-val { font-family:'Cormorant Garamond',serif; font-size:28px; color:var(--primary); }
  .fs-label { font-size:11px; color:var(--muted); margin-top:4px; }
  .fs-rate { font-size:10px; color:rgba(159,232,112,0.6); margin-top:6px; }

  /* INVEST BARS */
  .invest-bars { display:flex; flex-direction:column; gap:12px; }
  .ibar { }
  .ibar-head { display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; color:var(--sub); }
  .ibar-track { height:8px; background:rgba(255,255,255,0.06); border-radius:6px; overflow:hidden; }
  .ibar-fill { height:100%; border-radius:6px; }

  /* DIVIDER */
  .divider { border:none; border-top:1px solid var(--border); margin:48px 0; }

  /* FOOTER */
  .rpt-footer { text-align:center; padding-top:32px; border-top:1px solid var(--border); }
  .rpt-footer p { font-size:11px; color:var(--muted); letter-spacing:1px; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <header class="rpt-header">
    <div class="rpt-brand">ZENITH Company · Portal de Resultados</div>
    <h1 class="rpt-client">${esc(clientName)}</h1>
    <div class="rpt-period">${periodLabel} · ${numDays} dias de dados</div>
    <div class="rpt-type-badge">
      ✓ ${numDays <= 7 ? 'Relatório Semanal' : numDays <= 16 ? 'Relatório Quinzenal' : 'Relatório Mensal'}
    </div>
  </header>

  ${aiSummary ? `<!-- RESUMO RÁPIDO -->
  <section class="section">
    <div class="section-label">Resumo do Período</div>
    <div class="resumo-box">
      <pre class="resumo-text">${esc(aiSummary)}</pre>
    </div>
  </section>` : ''}

  <!-- KPIs PRINCIPAIS -->
  <section class="section">
    <div class="section-label">Indicadores do Período</div>
    <div class="kpi-grid">
      <div class="kpi">
        <span class="kpi-label">Investimento</span>
        <span class="kpi-val primary">${brl(totalSpend)}</span>
        <span class="kpi-sub">Projeção: ${brl(monthlyProjection)}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Alcance</span>
        <span class="kpi-val">${num(totalReach)}</span>
        <span class="kpi-sub">pessoas únicas</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Impressões</span>
        <span class="kpi-val">${num(totalImpressions)}</span>
        <span class="kpi-sub">Frequência: ${globalFreq.toFixed(2)}x</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">${totalAllResults > 0 ? 'Resultados' : 'Média diária'}</span>
        <span class="kpi-val">${totalAllResults > 0 ? num(totalAllResults) : brl(dailyRate)}</span>
        <span class="kpi-sub">${totalAllResults > 0 ? (avgCPRAll > 0 ? brl(avgCPRAll) + ' cada' : 'total') : '/dia investido'}</span>
      </div>
    </div>
  </section>

  ${hasObjectiveData ? `<!-- RESULTADOS POR OBJETIVO -->
  <section class="section">
    <div class="section-label">Resultados por Objetivo</div>
    <div class="obj-blocks">
      ${conversasBlock}
      ${visitasBlock}
      ${videoBlock}
    </div>
  </section>` : ''}

  <!-- CAMPANHAS EM DESTAQUE -->
  ${activeCampaigns.length > 0 ? `<section class="section">
    <div class="section-label">Campanhas em Destaque · ${activeCampaigns.length} ativas</div>
    <div class="camp-grid">
      ${renderActiveCampCards()}
    </div>
  </section>` : ''}

  <!-- MICRO VITÓRIAS -->
  ${victories.length > 0 ? `<section class="section">
    <div class="section-label">🔥 Micro Vitórias do Período</div>
    <div class="victories-grid">
      ${victories.map(v => `<div class="victory-item">${esc(v)}</div>`).join('\n      ')}
    </div>
  </section>` : ''}

  <hr class="divider">

  <!-- FUNIL -->
  ${(totalImpressions > 0 || totalReach > 0 || totalAllResults > 0) ? `<section class="section">
    <div class="section-label">Funil de Resultados</div>
    <div class="funnel">
      <div class="funnel-step">
        <div class="fs-val">${num(totalImpressions)}</div>
        <div class="fs-label">Impressões</div>
      </div>
      <div class="funnel-step">
        <div class="fs-val">${num(totalReach)}</div>
        <div class="fs-label">Alcance</div>
        ${totalImpressions > 0 ? `<div class="fs-rate">${(totalReach / totalImpressions * 100).toFixed(1)}% de alcance</div>` : ''}
      </div>
      <div class="funnel-step">
        <div class="fs-val">${num(totalAllResults)}</div>
        <div class="fs-label">${totalLeads > 0 ? 'Mensagens' : totalProfileVisits > 0 ? 'Visitas' : 'Resultados'}</div>
        ${totalReach > 0 && totalAllResults > 0 ? `<div class="fs-rate">${(totalAllResults / totalReach * 100).toFixed(2)}% conversão</div>` : ''}
      </div>
    </div>
  </section>` : ''}

  <!-- DISTRIBUIÇÃO DO INVESTIMENTO -->
  ${sortedBySpend.length > 0 ? `<section class="section">
    <div class="section-label">Distribuição do Investimento</div>
    <div class="invest-bars">
      ${sortedBySpend.slice(0, 6).map((c, i) => {
        const pct = totalSpend > 0 ? (c.spend / totalSpend * 100) : 0;
        const color = investColors[Math.min(i, investColors.length - 1)];
        const shortName = c.name.replace(/^ZENITH\s*\|\s*/i, '').replace(/^ZNT\s*\|\s*/i, '').split('|')[0].trim().substring(0, 28);
        return `<div class="ibar">
        <div class="ibar-head"><span>${esc(shortName)}</span><span>${brl(c.spend)} — ${pct.toFixed(1)}%</span></div>
        <div class="ibar-track"><div class="ibar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
      </div>`;
      }).join('\n      ')}
    </div>
  </section>` : ''}

  <!-- FOOTER -->
  <footer class="rpt-footer">
    <p>ZENITH Company · Portal de Resultados · Relatório confidencial</p>
    <p style="margin-top:6px">${esc(clientName)} · ${periodLabel}</p>
  </footer>

</div>
</body>
</html>`;
}
