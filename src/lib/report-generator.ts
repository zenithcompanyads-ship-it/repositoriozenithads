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

// ── Campaign categorization ──────────────────────────────────────────────────

type CampType = 'conversas' | 'visitas' | 'alcance' | 'outros';

function categoryCamp(resultType: string | null | undefined, name?: string): CampType {
  const label = getResultLabel(resultType);
  if (['Conversas Iniciadas', 'Mensagens', 'Leads', 'Compras'].includes(label)) return 'conversas';
  if (label === 'Visitas ao Perfil') return 'visitas';
  if (label === 'Alcance') return 'alcance';
  const n = (name ?? '').toLowerCase();
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
    campaigns,
  } = data;

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

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZENITH Company — Portal ${esc(clientName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #9FE870;
    --dark: #090D06;
    --secondary: #D2D6DB;
    --white: #FFFFFF;
    --card-bg: rgba(255,255,255,0.04);
    --border: rgba(159,232,112,0.15);
    --border-soft: rgba(255,255,255,0.08);
    --text-muted: rgba(255,255,255,0.45);
    --text-secondary: rgba(255,255,255,0.7);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--dark);
    color: var(--white);
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ─── LOGIN ─── */
  #login-screen {
    position: fixed; inset: 0;
    background: var(--dark);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
    flex-direction: column;
    gap: 0;
  }

  .login-bg {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(159,232,112,0.07) 0%, transparent 70%);
    pointer-events: none;
  }

  .login-box {
    position: relative;
    width: 420px;
    padding: 48px 44px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 20px;
    backdrop-filter: blur(20px);
    animation: fadeUp .6s ease;
  }

  .login-logo {
    text-align: center;
    margin-bottom: 36px;
  }

  .login-logo .brand {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 6px;
    color: var(--primary);
    text-transform: uppercase;
    display: block;
    margin-bottom: 6px;
  }

  .login-logo h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 38px;
    font-weight: 300;
    color: var(--white);
    letter-spacing: 2px;
  }

  .login-logo p {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 6px;
    font-weight: 300;
  }

  .login-field {
    margin-bottom: 16px;
  }

  .login-field label {
    display: block;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .login-field input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border-soft);
    border-radius: 10px;
    padding: 14px 16px;
    color: var(--white);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    outline: none;
    transition: border-color .2s;
  }

  .login-field input:focus {
    border-color: var(--primary);
  }

  .login-error {
    color: #ff6b6b;
    font-size: 13px;
    text-align: center;
    margin-top: -8px;
    margin-bottom: 12px;
    display: none;
  }

  .login-btn {
    width: 100%;
    background: var(--primary);
    color: var(--dark);
    border: none;
    border-radius: 10px;
    padding: 15px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity .2s, transform .1s;
  }

  .login-btn:hover { opacity: .85; }
  .login-btn:active { transform: scale(.99); }

  .login-footer {
    text-align: center;
    margin-top: 24px;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 1px;
  }

  /* ─── PORTAL ─── */
  #portal { display: block; min-height: 100vh; }

  /* SIDEBAR */
  .sidebar {
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 240px;
    background: rgba(255,255,255,0.025);
    border-right: 1px solid var(--border-soft);
    display: flex; flex-direction: column;
    padding: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
  }

  .sidebar-logo {
    padding: 28px 24px 24px;
    border-bottom: 1px solid var(--border-soft);
  }

  .sidebar-logo .brand-tag {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 5px;
    color: var(--primary);
    text-transform: uppercase;
    display: block;
    margin-bottom: 4px;
  }

  .sidebar-logo h2 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 26px;
    font-weight: 300;
    color: var(--white);
    letter-spacing: 2px;
  }

  .client-info {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-soft);
    display: flex; align-items: center; gap: 12px;
  }

  .client-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), #5fa83a);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    color: var(--dark);
    font-weight: 600;
    flex-shrink: 0;
  }

  .client-name { font-size: 13px; font-weight: 500; line-height: 1.3; }
  .client-handle { font-size: 11px; color: var(--text-muted); }

  .sidebar-nav { padding: 16px 0; flex: 1; }

  .nav-section-label {
    font-size: 9px;
    letter-spacing: 3px;
    color: var(--text-muted);
    text-transform: uppercase;
    padding: 8px 24px 4px;
  }

  .nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 24px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-secondary);
    transition: all .2s;
    border-left: 2px solid transparent;
    font-weight: 400;
    user-select: none;
  }

  .nav-item:hover { color: var(--white); background: rgba(255,255,255,0.04); }
  .nav-item.active { color: var(--primary); border-left-color: var(--primary); background: rgba(159,232,112,0.06); font-weight: 500; }

  .nav-item .nav-icon { width: 16px; text-align: center; font-size: 15px; }

  .sidebar-bottom {
    padding: 16px 24px;
    border-top: 1px solid var(--border-soft);
    font-size: 11px;
    color: var(--text-muted);
  }

  .period-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(159,232,112,0.1);
    border: 1px solid rgba(159,232,112,0.25);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 10px;
    color: var(--primary);
    letter-spacing: 1px;
    margin-top: 6px;
  }

  /* MAIN */
  .main-content {
    margin-left: 240px;
    min-height: 100vh;
    padding: 0;
  }

  /* TOPBAR */
  .topbar {
    padding: 20px 36px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--border-soft);
    position: sticky; top: 0;
    background: rgba(9,13,6,0.85);
    backdrop-filter: blur(20px);
    z-index: 50;
  }

  .topbar-title h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: 1px;
  }

  .topbar-title p { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

  .topbar-right { display: flex; align-items: center; gap: 16px; }

  .tab-switcher {
    display: flex;
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 4px;
    gap: 2px;
  }

  .tab-btn {
    padding: 8px 20px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--text-muted);
    transition: all .2s;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: .5px;
  }

  .tab-btn.active {
    background: var(--primary);
    color: var(--dark);
  }

  .status-live {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px;
    color: var(--primary);
    letter-spacing: 1px;
  }

  .dot-live {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--primary);
    animation: pulse 2s infinite;
  }

  /* CONTENT PANELS */
  .panel { display: none; padding: 32px 36px; }
  .panel.active { display: block; animation: fadeIn .3s ease; }

  /* KPI GRID */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }

  .kpi-card {
    background: var(--card-bg);
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color .2s, transform .2s;
  }

  .kpi-card:hover { border-color: rgba(159,232,112,0.3); transform: translateY(-2px); }

  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--primary), transparent);
    opacity: 0;
    transition: opacity .2s;
  }

  .kpi-card:hover::before { opacity: 1; }

  .kpi-label {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .kpi-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 300;
    line-height: 1;
    color: var(--white);
    letter-spacing: -1px;
  }

  .kpi-value.green { color: var(--primary); }

  .kpi-sub {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 6px;
  }

  .kpi-icon {
    position: absolute; right: 20px; top: 20px;
    font-size: 22px;
    opacity: .25;
  }

  /* SECTION TITLE */
  .section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px;
    font-weight: 400;
    letter-spacing: 1px;
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
  }

  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-soft);
  }

  /* TWO COL */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
  .three-col { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 28px; }

  /* CARD */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .card-title {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  /* CAMPAIGN TABLE */
  .campaign-table { width: 100%; border-collapse: collapse; }
  .campaign-table th {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--text-muted); text-align: left; padding: 0 0 12px;
    border-bottom: 1px solid var(--border-soft);
    font-weight: 400;
  }

  .campaign-table td {
    padding: 14px 0;
    font-size: 13px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }

  .campaign-table tr:last-child td { border-bottom: none; }

  .camp-name {
    font-weight: 500;
    font-size: 13px;
    line-height: 1.3;
    max-width: 220px;
  }

  .camp-name span {
    display: block;
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 300;
    margin-top: 2px;
  }

  .badge-active {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(159,232,112,0.12);
    border: 1px solid rgba(159,232,112,0.3);
    color: var(--primary);
    font-size: 10px; letter-spacing: 1px;
    padding: 3px 10px; border-radius: 20px;
    font-weight: 500;
  }

  .badge-active::before {
    content: '';
    width: 5px; height: 5px;
    border-radius: 50%; background: var(--primary);
    animation: pulse 2s infinite;
  }

  .num { font-family: 'Space Mono', monospace; font-size: 13px; }
  .num-green { color: var(--primary); }

  /* FUNNEL */
  .funnel-container {
    display: flex; flex-direction: column; gap: 8px;
    padding: 8px 0;
  }

  .funnel-step {
    display: flex; align-items: center; gap: 16px;
  }

  .funnel-bar-wrap {
    flex: 1; height: 42px; position: relative;
    display: flex; align-items: center;
  }

  .funnel-bar-bg {
    position: absolute; inset: 0;
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    border: 1px solid var(--border-soft);
  }

  .funnel-bar-fill {
    position: absolute; left: 0; top: 0; bottom: 0;
    border-radius: 8px;
    transition: width 1s cubic-bezier(.4,0,.2,1);
  }

  .funnel-label {
    position: relative;
    padding: 0 16px;
    display: flex; align-items: center; justify-content: space-between;
    width: 100%;
  }

  .funnel-name { font-size: 12px; font-weight: 500; }
  .funnel-value { font-family: 'Space Mono', monospace; font-size: 12px; }

  .funnel-pct {
    width: 48px; text-align: right;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
  }

  /* DONUT */
  .donut-wrap {
    display: flex; align-items: center; gap: 24px;
    padding: 8px 0;
  }

  .donut-legend { flex: 1; }

  .legend-item {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 12px; font-size: 12px;
  }

  .legend-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }

  .legend-pct {
    margin-left: auto;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
  }

  /* BAR CHART */
  .bar-chart {
    display: flex; align-items: flex-end; gap: 8px;
    height: 120px; padding-top: 8px;
  }

  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }

  .bar-fill {
    width: 100%; border-radius: 4px 4px 0 0;
    transition: height 1s ease;
    min-height: 4px;
  }

  .bar-lbl { font-size: 9px; color: var(--text-muted); letter-spacing: 1px; text-align: center; }
  .bar-val { font-size: 10px; font-family: 'Space Mono', monospace; color: var(--text-secondary); }

  /* INVESTMENT RING */
  .inv-ring-wrap {
    text-align: center; padding: 8px 0;
  }

  .inv-number {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42px; font-weight: 300;
    color: var(--primary);
  }

  .inv-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

  .progress-ring { margin: 16px auto; display: block; }

  /* INSIGHT CARD */
  .insight-list { display: flex; flex-direction: column; gap: 10px; }

  .insight-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    border: 1px solid var(--border-soft);
  }

  .insight-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .insight-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
  .insight-text strong { color: var(--white); font-weight: 500; }

  /* ANIMATIONS */
  @keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(159,232,112,0.3); border-radius: 4px; }

  /* RESPONSIVE */
  @media (max-width: 1100px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .two-col, .three-col { grid-template-columns: 1fr; }
  }

  .full-width { margin-bottom: 28px; }

  .separator { height: 1px; background: var(--border-soft); margin: 28px 0; }

  /* TOP METRIC ROW */
  .metric-inline {
    display: flex; align-items: center; gap: 24px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border-soft);
  }

  .metric-inline:last-child { border-bottom: none; }

  .metric-inline-val {
    font-family: 'Space Mono', monospace;
    font-size: 16px; color: var(--white);
    margin-left: auto;
  }

  .metric-inline-label { font-size: 12px; color: var(--text-secondary); }

  .metric-inline-icon { font-size: 18px; opacity: .6; }

  svg text { dominant-baseline: middle; }

  /* PRINT */
  @media print {
    #login-screen { display: none !important; }
    #portal { display: block !important; }
    .sidebar { display: none; }
    .main-content { margin-left: 0; }
    nav { display: none; }
  }
</style>
</head>
<body>


<!-- ── PORTAL ── -->
<div id="portal">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <span class="brand-tag">Digital Marketing</span>
      <h2>ZENITH</h2>
    </div>
    <div class="client-info">
      <div class="client-avatar">${avatarLetter}</div>
      <div>
        <div class="client-name">${esc(clientName)}</div>
        <div class="client-handle">${esc(portalHandle)}</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Visão Geral</div>
      <div class="nav-item active" onclick="showPanel('mes')">
        <span class="nav-icon">📅</span> Resultado do Mês
      </div>
      <div class="nav-item" onclick="showPanel('semana')">
        <span class="nav-icon">🗓</span> Últimos 7 Dias
      </div>
      <div class="nav-section-label" style="margin-top:8px;">Campanhas</div>
      <div class="nav-item" onclick="showPanel('campanhas')">
        <span class="nav-icon">🚀</span> Campanhas Ativas
      </div>
      <div class="nav-item" onclick="showPanel('funil')">
        <span class="nav-icon">🎯</span> Funil de Resultados
      </div>
      <div class="nav-item" onclick="showPanel('investimento')">
        <span class="nav-icon">💰</span> Investimento
      </div>
    </nav>
    <div class="sidebar-bottom">
      <div>${mLabel}</div>
      <div class="period-badge">● ${activeCampaigns.length} campanhas ativas</div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main-content">

    <!-- TOPBAR -->
    <div class="topbar">
      <div class="topbar-title">
        <h3 id="panel-title">Resultado do Mês</h3>
        <p id="panel-subtitle">${periodLabel}</p>
      </div>
      <div class="topbar-right">
        <div class="tab-switcher">
          <button class="tab-btn active" onclick="tabSwitch(this,'mes')">Mês</button>
          <button class="tab-btn" onclick="tabSwitch(this,'semana')">7 Dias</button>
        </div>
        <div class="status-live"><div class="dot-live"></div> AO VIVO</div>
      </div>
    </div>

    <!-- ─── PAINEL: MÊS ─── -->
    <div class="panel active" id="panel-mes">

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total de Resultados</div>
          <div class="kpi-value green">${num(totalAllResults)}</div>
          <div class="kpi-sub">Conversões + Visitas + Msgs</div>
          <div class="kpi-icon">✨</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Alcance Total</div>
          <div class="kpi-value">${num(totalReach)}</div>
          <div class="kpi-sub">Pessoas únicas impactadas</div>
          <div class="kpi-icon">👁</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Impressões</div>
          <div class="kpi-value">${num(totalImpressions)}</div>
          <div class="kpi-sub">Exibições totais</div>
          <div class="kpi-icon">📢</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Investimento Total</div>
          <div class="kpi-value green">${brl(totalSpend)}</div>
          <div class="kpi-sub">Valor gasto no período</div>
          <div class="kpi-icon">💳</div>
        </div>
      </div>

      <!-- MENSAGENS + VISITAS -->
      <div class="section-title">Desempenho por Objetivo</div>
      <div class="two-col">
        <div class="card">
          <div class="card-title">Conversões — Mensagens Iniciadas</div>
          <div class="bar-chart" id="bar-mes-conv"></div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap" id="bar-mes-conv-labels"></div>
        </div>
        <div class="card">
          <div class="card-title">Distribuição de Resultados</div>
          <div class="donut-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>
              <circle cx="55" cy="55" r="40" fill="none" stroke="#9FE870" stroke-width="18"
                stroke-dasharray="${visitasDash}" stroke-dashoffset="62.8" transform="rotate(-90 55 55)"/>
              <circle cx="55" cy="55" r="40" fill="none" stroke="#3a7d22" stroke-width="18"
                stroke-dasharray="${conversasDash}" stroke-dashoffset="${conversasOffset.toFixed(1)}" transform="rotate(-90 55 55)"/>
              <text x="55" y="55" text-anchor="middle" fill="white" font-size="13" font-family="Space Mono">${num(totalAllResults)}</text>
              <text x="55" y="68" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="DM Sans">resultados</text>
            </svg>
            <div class="donut-legend">
              <div class="legend-item">
                <div class="legend-dot" style="background:#9FE870"></div>
                <span>Visitas ao Perfil</span>
                <span class="legend-pct">${totalAllResults > 0 ? (visitasPct * 100).toFixed(1) : '0'}%</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background:#3a7d22"></div>
                <span>Msgs Iniciadas</span>
                <span class="legend-pct">${totalAllResults > 0 ? (conversasPct * 100).toFixed(1) : '0'}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CAMPANHAS TABLE -->
      <div class="section-title">Resultado por Campanha — Mês</div>
      <div class="card full-width">
        <table class="campaign-table">
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Status</th>
              <th>Resultados</th>
              <th>Alcance</th>
              <th>Impressões</th>
              <th>CPR</th>
              <th>Investido</th>
            </tr>
          </thead>
          <tbody>
            ${renderCampTableRows(sortedByCampaigns, false)}
          </tbody>
        </table>
      </div>

      <!-- INSIGHTS -->
      <div class="section-title">Destaques do Mês</div>
      <div class="insight-list">
        <div class="insight-item">
          <div class="insight-icon">🏆</div>
          <div class="insight-text">${insight1}</div>
        </div>
        <div class="insight-item">
          <div class="insight-icon">💬</div>
          <div class="insight-text">${insight2}</div>
        </div>
        <div class="insight-item">
          <div class="insight-icon">🔁</div>
          <div class="insight-text">${insight3}</div>
        </div>
        <div class="insight-item">
          <div class="insight-icon">📊</div>
          <div class="insight-text">${insight4}</div>
        </div>
      </div>

    </div><!-- /panel-mes -->

    <!-- ─── PAINEL: SEMANA ─── -->
    <div class="panel" id="panel-semana">

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Resultados (7 dias)</div>
          <div class="kpi-value green">${num(weekAllResults)}</div>
          <div class="kpi-sub">${weekPeriodLabel}</div>
          <div class="kpi-icon">⚡</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Alcance</div>
          <div class="kpi-value">${num(weekReach)}</div>
          <div class="kpi-sub">Pessoas únicas</div>
          <div class="kpi-icon">👁</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Impressões</div>
          <div class="kpi-value">${num(weekImpressions)}</div>
          <div class="kpi-sub">Exibições no período</div>
          <div class="kpi-icon">📢</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Investido (semana)</div>
          <div class="kpi-value green">${brl(weekSpend)}</div>
          <div class="kpi-sub">Valor gasto nos 7 dias</div>
          <div class="kpi-icon">💳</div>
        </div>
      </div>

      <div class="section-title">Resultado por Campanha — 7 Dias</div>
      <div class="card full-width">
        <table class="campaign-table">
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Status</th>
              <th>Resultados</th>
              <th>Alcance</th>
              <th>Impressões</th>
              <th>CPR</th>
              <th>Investido</th>
            </tr>
          </thead>
          <tbody>
            ${renderCampTableRows(sortedByCampaigns, true)}
          </tbody>
        </table>
      </div>

      <div class="section-title">Comparativo Semana vs Mês</div>
      <div class="two-col">
        <div class="card">
          <div class="card-title">% da semana sobre o mês total</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span>Resultados</span><span class="num">${num(weekAllResults)} / ${num(totalAllResults)} — <span style="color:var(--primary)">${weekResultPct.toFixed(1)}%</span></span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
                <div style="width:${Math.min(weekResultPct, 100).toFixed(1)}%;height:100%;background:var(--primary);border-radius:4px"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span>Alcance</span><span class="num">${num(weekReach)} / ${num(totalReach)} — <span style="color:var(--primary)">${weekReachPct.toFixed(1)}%</span></span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
                <div style="width:${Math.min(weekReachPct, 100).toFixed(1)}%;height:100%;background:var(--primary);border-radius:4px"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span>Impressões</span><span class="num">${num(weekImpressions)} / ${num(totalImpressions)} — <span style="color:var(--primary)">${weekImpPct.toFixed(1)}%</span></span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
                <div style="width:${Math.min(weekImpPct, 100).toFixed(1)}%;height:100%;background:var(--primary);border-radius:4px"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span>Investimento</span><span class="num">${brl(weekSpend)} / ${brl(totalSpend)} — <span style="color:var(--primary)">${weekSpendPct.toFixed(1)}%</span></span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
                <div style="width:${Math.min(weekSpendPct, 100).toFixed(1)}%;height:100%;background:var(--primary);border-radius:4px"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Eficiência da semana</div>
          <div class="insight-list" style="margin-top:4px;">
            <div class="insight-item">
              <div class="insight-icon">⚡</div>
              <div class="insight-text"><strong>Ritmo semanal</strong>: ${num(weekAllResults)} resultados estimados nos últimos 7 dias — consistente com a média do período.</div>
            </div>
            <div class="insight-item">
              <div class="insight-icon">📈</div>
              <div class="insight-text"><strong>Alcance semanal</strong> de <strong>${num(weekReach)} pessoas</strong> únicas — ${alcanceRate.toFixed(1)}% de aproveitamento das impressões.</div>
            </div>
            <div class="insight-item">
              <div class="insight-icon">🎯</div>
              <div class="insight-text">Custo médio por resultado na semana: <strong>${brl(avgCPRAll)}</strong> — mantendo eficiência do período completo.</div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /panel-semana -->

    <!-- ─── PAINEL: CAMPANHAS ─── -->
    <div class="panel" id="panel-campanhas">

      <div class="section-title">Campanhas em Veiculação Agora</div>

      <div style="display:flex;flex-direction:column;gap:16px;" class="full-width">
        ${renderCampCards()}
      </div>
    </div><!-- /panel-campanhas -->

    <!-- ─── PAINEL: FUNIL ─── -->
    <div class="panel" id="panel-funil">

      <div class="section-title">Funil de Resultados — ${mLabel}</div>

      <div class="three-col">
        <div class="card">
          <div class="card-title">Jornada do Lead</div>
          <div class="funnel-container">

            <div class="funnel-step">
              <div style="width:120px;font-size:12px;color:var(--text-secondary);">Impressões</div>
              <div class="funnel-bar-wrap">
                <div class="funnel-bar-bg"></div>
                <div class="funnel-bar-fill" style="width:100%;background:linear-gradient(90deg,rgba(159,232,112,0.5),rgba(159,232,112,0.2))"></div>
                <div class="funnel-label">
                  <span class="funnel-name" style="color:rgba(255,255,255,0.9)">${num(totalImpressions)}</span>
                  <span class="funnel-value" style="font-size:10px;color:var(--text-muted)">exibições</span>
                </div>
              </div>
              <div class="funnel-pct">100%</div>
            </div>

            <div class="funnel-step">
              <div style="width:120px;font-size:12px;color:var(--text-secondary);">Alcance</div>
              <div class="funnel-bar-wrap">
                <div class="funnel-bar-bg"></div>
                <div class="funnel-bar-fill" style="width:${Math.min(alcanceRate, 100).toFixed(1)}%;background:linear-gradient(90deg,rgba(159,232,112,0.6),rgba(159,232,112,0.3))"></div>
                <div class="funnel-label">
                  <span class="funnel-name">${num(totalReach)}</span>
                  <span class="funnel-value" style="font-size:10px;color:var(--text-muted)">pessoas únicas</span>
                </div>
              </div>
              <div class="funnel-pct">${alcanceRate.toFixed(1)}%</div>
            </div>

            <div class="funnel-step">
              <div style="width:120px;font-size:12px;color:var(--text-secondary);">Visitas Perfil</div>
              <div class="funnel-bar-wrap">
                <div class="funnel-bar-bg"></div>
                <div class="funnel-bar-fill" style="width:${Math.max(Math.min(visitaRate, 100), 0.5).toFixed(2)}%;background:linear-gradient(90deg,rgba(159,232,112,0.8),rgba(159,232,112,0.5));min-width:${totalProfileVisits > 0 ? '40px' : '0'}"></div>
                <div class="funnel-label">
                  <span class="funnel-name" style="color:var(--primary)">${num(totalProfileVisits)}</span>
                  <span class="funnel-value" style="font-size:10px;color:var(--text-muted)">cliques perfil</span>
                </div>
              </div>
              <div class="funnel-pct">${visitaRate.toFixed(1)}%</div>
            </div>

            <div class="funnel-step">
              <div style="width:120px;font-size:12px;color:var(--text-secondary);">Msgs Iniciadas</div>
              <div class="funnel-bar-wrap">
                <div class="funnel-bar-bg"></div>
                <div class="funnel-bar-fill" style="width:${Math.max(Math.min(conversaRate * alcanceRate / 100, 100), 0.1).toFixed(3)}%;background:var(--primary);min-width:${totalLeads > 0 ? '40px' : '0'}"></div>
                <div class="funnel-label">
                  <span class="funnel-name" style="color:var(--primary)">${num(totalLeads)}</span>
                  <span class="funnel-value" style="font-size:10px;color:var(--text-muted)">conversas</span>
                </div>
              </div>
              <div class="funnel-pct">${(conversaRate * alcanceRate / 100).toFixed(2)}%</div>
            </div>

          </div>

          <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border-soft);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;letter-spacing:1px;">TAXA DE CONVERSÃO DO FUNIL</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <div style="background:rgba(159,232,112,0.08);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:11px;">
                <span style="color:var(--text-muted);">Impressões → Alcance </span><span class="num num-green">${alcanceRate.toFixed(1)}%</span>
              </div>
              <div style="background:rgba(159,232,112,0.08);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:11px;">
                <span style="color:var(--text-muted);">Alcance → Visita </span><span class="num num-green">${visitaRate.toFixed(1)}%</span>
              </div>
              <div style="background:rgba(159,232,112,0.08);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:11px;">
                <span style="color:var(--text-muted);">Visita → Msg </span><span class="num num-green">${conversaRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card">
            <div class="card-title">CPR por Campanha</div>
            ${rankedByCPR.map((c, i) => `<div class="metric-inline">
              <span class="metric-inline-icon">${cprIcons[Math.min(i, cprIcons.length - 1)]}</span>
              <span class="metric-inline-label">${esc(c.name.replace(/^ZENITH\s*\|\s*/i, '').replace(/^ZNT\s*\|\s*/i, '').split('|')[0].trim().substring(0, 20))}</span>
              <span class="metric-inline-val"${i === 0 ? ' style="color:var(--primary)"' : ''}>${brl(c.cpr)}</span>
            </div>`).join('\n')}
          </div>
          <div class="card">
            <div class="card-title">Total de Conversas Geradas</div>
            <div style="text-align:center;padding:16px 0;">
              <div style="font-family:'Cormorant Garamond',serif;font-size:56px;font-weight:300;color:var(--primary);line-height:1;">${num(totalLeads)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">pessoas que iniciaram conversa</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">via Instagram DM em ${mLabel}</div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /panel-funil -->

    <!-- ─── PAINEL: INVESTIMENTO ─── -->
    <div class="panel" id="panel-investimento">

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Investido — Mês</div>
          <div class="kpi-value green">${brl(totalSpend)}</div>
          <div class="kpi-sub">${periodLabel}</div>
          <div class="kpi-icon">💰</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Média Diária</div>
          <div class="kpi-value">${brl(dailyRate)}</div>
          <div class="kpi-sub">Por dia de veiculação</div>
          <div class="kpi-icon">📅</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Custo por Resultado</div>
          <div class="kpi-value green">${brl(avgCPRAll)}</div>
          <div class="kpi-sub">Média geral (todos obj.)</div>
          <div class="kpi-icon">🎯</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Budget Ativo / Dia</div>
          <div class="kpi-value">${totalBudgetPerDay > 0 ? brl(totalBudgetPerDay) : '—'}</div>
          <div class="kpi-sub">${activeCampaigns.length} campanhas ativas</div>
          <div class="kpi-icon">⚙️</div>
        </div>
      </div>

      <div class="section-title">Distribuição do Investimento</div>
      <div class="two-col">
        <div class="card">
          <div class="card-title">Por campanha — R$ Total no mês</div>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
            ${renderInvestBars()}
          </div>
        </div>

        <div class="card">
          <div class="card-title">Retorno sobre o investimento</div>
          <div class="insight-list" style="margin-top:4px;">
            <div class="insight-item">
              <div class="insight-icon">💎</div>
              <div class="insight-text">${invInsight1}</div>
            </div>
            <div class="insight-item">
              <div class="insight-icon">💬</div>
              <div class="insight-text">${invInsight2}</div>
            </div>
            <div class="insight-item">
              <div class="insight-icon">📍</div>
              <div class="insight-text">${invInsight3}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">Investimento — Últimos 7 dias</div>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(${Math.min(activeCampaigns.length, 4)},1fr);gap:16px;text-align:center;">
          ${renderWeekInvestGrid()}
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft);display:flex;justify-content:center;align-items:center;gap:8px;">
          <span style="font-size:13px;color:var(--text-muted);">Total investido nos últimos 7 dias:</span>
          <span style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--primary);">${brl(weekSpend)}</span>
        </div>
      </div>

    </div><!-- /panel-investimento -->

  </main>
</div>

<script>
  // ─── NAVIGATION ───
  const panelMeta = ${panelMetaJS};

  function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const m = panelMeta[id];
    document.getElementById('panel-title').textContent = m.title;
    document.getElementById('panel-subtitle').textContent = m.sub;

    const tabBtns = document.querySelectorAll('.tab-btn');
    if (id === 'mes' || id === 'semana') {
      tabBtns[0].classList.toggle('active', id === 'mes');
      tabBtns[1].classList.toggle('active', id === 'semana');
    }
  }

  function tabSwitch(btn, id) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showPanel(id);

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => {
      if ((id === 'mes' && n.textContent.includes('Mês')) ||
          (id === 'semana' && n.textContent.includes('7 Dias'))) {
        n.classList.add('active');
      }
    });
  }

  // ─── BAR CHART: MÊS ───
  (function buildBarChart() {
    const data = [
      ${barChartData}
    ];
    const max = Math.max(...data.map(d => d.val), 1);
    const container = document.getElementById('bar-mes-conv');

    data.forEach(d => {
      const pct = (d.val / max) * 100;
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.innerHTML = \`
        <span class="bar-val">\${d.val}</span>
        <div class="bar-fill" style="height:\${pct}%;background:\${d.color};"></div>
        <span class="bar-lbl">\${d.label}</span>
      \`;
      container.appendChild(col);
    });
  })();
</script>

</body>
</html>`;
}
