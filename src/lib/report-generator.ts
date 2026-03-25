// Pure server-side HTML report generator — zero external dependencies
import { isActiveCampaign } from '@/lib/utils';

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
  campaigns: Array<{
    name: string;
    spend: number;
    conversions: number;
    cpc: number;
    status: string;
    budget: number;
    impressions: number;
    clicks: number;
    reach: number;
  }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function pct(v: number, decimals = 2): string {
  return v.toFixed(decimals) + '%';
}

function fdate(d: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T12:00:00'));
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

// ── Main generator ─────────────────────────────────────────────────────────────

export function generateCSVReport(data: CSVReportData): string {
  const {
    clientName, periodStart, periodEnd, numDays,
    totalSpend, totalImpressions, totalReach, totalClicks, totalConversions,
    monthlyProjection, daysInMonth, campaigns,
  } = data;

  // Derived metrics
  const avgCtr  = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc  = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm  = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const cpa     = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const dailyRate = numDays > 0 ? totalSpend / numDays : 0;
  const progressPct = Math.min(100, Math.round((numDays / daysInMonth) * 100));

  // Funnel rates
  const reachRate = totalImpressions > 0 ? (totalReach / totalImpressions) * 100 : 0;
  const convRate  = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // Campaigns
  const activeCampaigns = campaigns.filter(c => isActiveCampaign(c.status));
  const topCampaigns = [...campaigns]
    .filter(c => isActiveCampaign(c.status))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);
  const maxSpend = topCampaigns[0]?.spend ?? 1;

  // Monthly breakdown
  const monthly = monthlyBreakdown(periodStart, periodEnd, totalSpend, totalImpressions, totalClicks, totalConversions);

  // Funnel visual widths (purely cosmetic stepped pyramid)
  const funnelSteps = [
    { label: 'Impressões',  value: totalImpressions, tag: '100%',            width: 100, color: '#4040E8' },
    { label: 'Alcance',     value: totalReach,        tag: pct(reachRate),   width: 78,  color: '#6B4EFF' },
    { label: 'Cliques',     value: totalClicks,       tag: pct(avgCtr),      width: 54,  color: '#818CF8' },
    { label: 'Conversões',  value: totalConversions,  tag: pct(convRate),    width: 34,  color: '#22C55E' },
  ];

  // ── HTML ────────────────────────────────────────────────────────────────────

  const css = `
    <style>
      .zr-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; color: #e4e4e7; }
      .zr-root * { box-sizing: border-box; }
      .zr-hero { background: #0f0f18; border: 1px solid #1e1e3a; border-radius: 16px; padding: 36px 40px; margin-bottom: 20px; position: relative; overflow: hidden; }
      .zr-hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #4040E8 0%, #6B4EFF 50%, #FF4D00 100%); }
      .zr-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(64,64,232,.12); border: 1px solid rgba(64,64,232,.3); border-radius: 6px; padding: 4px 12px; margin-bottom: 14px; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #6B7FFF; }
      .zr-hero-title { font-size: 30px; font-weight: 800; color: #fff; margin: 0 0 6px; line-height: 1.2; }
      .zr-hero-sub { font-size: 14px; color: #71717a; margin: 0; }
      .zr-hero-meta { text-align: right; }
      .zr-hero-meta-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #52525b; margin: 0 0 4px; }
      .zr-hero-invest { font-size: 28px; font-weight: 800; color: #4040E8; margin: 0; }
      .zr-hero-invest-sub { font-size: 12px; color: #71717a; margin: 4px 0 0; }
      .zr-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
      .zr-kpi { background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 18px 16px; }
      .zr-kpi-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #52525b; margin: 0 0 8px; }
      .zr-kpi-value { font-size: 20px; font-weight: 800; margin: 0; line-height: 1; }
      .zr-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
      .zr-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; overflow: hidden; }
      .zr-card-header { padding: 18px 22px; border-bottom: 1px solid #1e1e2e; display: flex; align-items: center; justify-content: space-between; }
      .zr-card-title { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #e4e4e7; margin: 0; }
      .zr-accent-bar { width: 3px; height: 14px; border-radius: 2px; flex-shrink: 0; }
      .zr-card-sub { font-size: 11px; color: #52525b; }
      .zr-card-body { padding: 20px 22px; }
      .zr-funnel-step { margin-bottom: 14px; }
      .zr-funnel-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
      .zr-funnel-name { font-size: 12px; color: #a1a1aa; }
      .zr-funnel-right { display: flex; align-items: center; gap: 8px; }
      .zr-funnel-val { font-size: 14px; font-weight: 700; color: #fff; }
      .zr-funnel-pct { font-size: 11px; font-weight: 600; }
      .zr-bar-track { height: 7px; background: #1a1a28; border-radius: 4px; overflow: hidden; }
      .zr-bar-fill { height: 100%; border-radius: 4px; }
      .zr-sec-grid { display: flex; flex-direction: column; gap: 10px; }
      .zr-sec-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
      .zr-sec-left-label { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #52525b; margin: 0 0 3px; }
      .zr-sec-left-desc { font-size: 11px; color: #52525b; margin: 0; }
      .zr-sec-val { font-size: 20px; font-weight: 800; margin: 0; }
      .zr-table-wrap { overflow-x: auto; }
      .zr-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .zr-table th { padding: 11px 18px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #52525b; border-bottom: 1px solid #1e1e2e; white-space: nowrap; }
      .zr-table th.right { text-align: right; }
      .zr-table th.center { text-align: center; }
      .zr-table td { padding: 13px 18px; border-bottom: 1px solid #0d0d18; vertical-align: middle; }
      .zr-table td.right { text-align: right; }
      .zr-table td.center { text-align: center; }
      .zr-camp-name { color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; display: block; }
      .zr-mini-bar-track { height: 3px; background: #1a1a28; border-radius: 2px; margin-top: 5px; overflow: hidden; }
      .zr-mini-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #4040E8, #6B4EFF); }
      .zr-status { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; }
      .zr-status-active { background: rgba(34,197,94,.1); color: #22C55E; border: 1px solid rgba(34,197,94,.2); }
      .zr-status-inactive { background: rgba(82,82,91,.15); color: #71717a; border: 1px solid #1e1e2e; }
      .zr-full-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; overflow: hidden; margin-bottom: 20px; }
      .zr-proj { background: #0f0f18; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
      .zr-proj-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 18px; }
      .zr-proj-label { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #52525b; margin: 0 0 5px; }
      .zr-proj-val { font-size: 24px; font-weight: 800; margin: 0; }
      .zr-proj-sub { font-size: 11px; color: #52525b; margin: 4px 0 0; }
      .zr-prog-label { display: flex; justify-content: space-between; margin-bottom: 7px; font-size: 12px; color: #71717a; }
      .zr-prog-track { height: 8px; background: #1a1a28; border-radius: 4px; overflow: hidden; }
      .zr-prog-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #4040E8, #6B4EFF); }
      .zr-footer { border-top: 1px solid #1e1e2e; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
      .zr-footer-brand { display: flex; align-items: center; gap: 10px; }
      .zr-footer-logo { width: 28px; height: 28px; background: linear-gradient(135deg, #4040E8, #6B4EFF); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; color: #fff; }
      .zr-footer-name { font-size: 14px; font-weight: 700; color: #fff; }
      .zr-footer-meta { text-align: right; font-size: 11px; color: #52525b; line-height: 1.6; }
      @media (max-width: 700px) {
        .zr-grid-5 { grid-template-columns: repeat(2, 1fr); }
        .zr-two-col { grid-template-columns: 1fr; }
        .zr-proj-grid { grid-template-columns: 1fr 1fr; }
        .zr-hero { padding: 24px 20px; }
        .zr-hero-title { font-size: 22px; }
      }
    </style>
  `;

  return `
${css}
<div class="zr-root">

  <!-- HERO -->
  <div class="zr-hero">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="min-width:0;">
        <div class="zr-badge">&#9679; Zenith Company &nbsp;·&nbsp; Meta Ads</div>
        <h1 class="zr-hero-title">${esc(clientName)}</h1>
        <p class="zr-hero-sub">Relatório de Performance &nbsp;·&nbsp; ${fdate(periodStart)} — ${fdate(periodEnd)}</p>
      </div>
      <div class="zr-hero-meta" style="flex-shrink:0;">
        <p class="zr-hero-meta-label">Investimento Total</p>
        <p class="zr-hero-invest">${brl(totalSpend)}</p>
        <p class="zr-hero-invest-sub">${numDays} dias &nbsp;·&nbsp; ${activeCampaigns.length}/${campaigns.length} campanhas ativas</p>
      </div>
    </div>
  </div>

  <!-- KPI CARDS -->
  <div class="zr-grid-5">
    ${[
      { label: 'Impressões',     value: num(totalImpressions), color: '#fff' },
      { label: 'Alcance',        value: num(totalReach),        color: '#a78bfa' },
      { label: 'Cliques',        value: num(totalClicks),       color: '#22C55E' },
      { label: 'Conversões',     value: num(totalConversions),  color: '#22C55E' },
      { label: 'Projeção Mensal',value: brl(monthlyProjection), color: '#f59e0b' },
    ].map(k => `
      <div class="zr-kpi">
        <p class="zr-kpi-label">${k.label}</p>
        <p class="zr-kpi-value" style="color:${k.color};">${k.value}</p>
      </div>
    `).join('')}
  </div>

  <!-- FUNIL + MÉTRICAS SECUNDÁRIAS -->
  <div class="zr-two-col">

    <!-- Funil -->
    <div class="zr-card">
      <div class="zr-card-header">
        <p class="zr-card-title">
          <span class="zr-accent-bar" style="background:#4040E8;"></span>
          Funil de Resultados
        </p>
      </div>
      <div class="zr-card-body">
        ${funnelSteps.map(step => `
          <div class="zr-funnel-step">
            <div class="zr-funnel-row">
              <span class="zr-funnel-name">${step.label}</span>
              <div class="zr-funnel-right">
                <span class="zr-funnel-val">${num(step.value)}</span>
                <span class="zr-funnel-pct" style="color:${step.color};">${step.tag}</span>
              </div>
            </div>
            <div class="zr-bar-track">
              <div class="zr-bar-fill" style="width:${step.width}%;background:${step.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Métricas Secundárias -->
    <div class="zr-sec-grid">
      ${[
        { label: 'CTR Médio',  desc: 'Taxa de cliques',            value: pct(avgCtr),                     color: '#4040E8' },
        { label: 'CPC Médio',  desc: 'Custo por clique',           value: brl(avgCpc),                     color: '#6B4EFF' },
        { label: 'CPM Médio',  desc: 'Custo por mil impressões',   value: brl(avgCpm),                     color: '#818CF8' },
        { label: 'CPA Médio',  desc: 'Custo por conversão',        value: cpa > 0 ? brl(cpa) : '—',       color: '#22C55E' },
      ].map(m => `
        <div class="zr-sec-card">
          <div>
            <p class="zr-sec-left-label">${m.label}</p>
            <p class="zr-sec-left-desc">${m.desc}</p>
          </div>
          <p class="zr-sec-val" style="color:${m.color};">${m.value}</p>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- CAMPANHAS -->
  <div class="zr-full-card">
    <div class="zr-card-header">
      <p class="zr-card-title">
        <span class="zr-accent-bar" style="background:#4040E8;"></span>
        Campanhas
      </p>
      <span class="zr-card-sub">${activeCampaigns.length} ativas · ${campaigns.length - activeCampaigns.length} inativas</span>
    </div>
    <div class="zr-table-wrap">
      <table class="zr-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Campanha</th>
            <th class="right">Investido</th>
            <th class="right">Conversões</th>
            <th class="right">CPC</th>
            <th class="center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${topCampaigns.map((c, i) => {
            const barPct = maxSpend > 0 ? Math.round((c.spend / maxSpend) * 100) : 0;
            return `
              <tr>
                <td style="color:#52525b;font-size:11px;">${i + 1}</td>
                <td style="min-width:180px;">
                  <span class="zr-camp-name">${esc(c.name)}</span>
                  <div class="zr-mini-bar-track">
                    <div class="zr-mini-bar-fill" style="width:${barPct}%;"></div>
                  </div>
                </td>
                <td class="right" style="color:#fff;font-weight:700;white-space:nowrap;">${brl(c.spend)}</td>
                <td class="right" style="color:#22C55E;font-weight:600;">${num(c.conversions)}</td>
                <td class="right" style="color:#a1a1aa;white-space:nowrap;">${c.cpc > 0 ? brl(c.cpc) : '—'}</td>
                <td class="center">
                  <span class="zr-status ${c.status === 'ACTIVE' ? 'zr-status-active' : 'zr-status-inactive'}">
                    ${c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  ${monthly.length > 1 ? `
  <!-- MÉTRICAS MÊS A MÊS -->
  <div class="zr-full-card">
    <div class="zr-card-header">
      <p class="zr-card-title">
        <span class="zr-accent-bar" style="background:#6B4EFF;"></span>
        Métricas Mês a Mês
      </p>
    </div>
    <div class="zr-table-wrap">
      <table class="zr-table">
        <thead>
          <tr>
            <th>Mês</th>
            <th>Dias</th>
            <th class="right">Investido</th>
            <th class="right">Impressões</th>
            <th class="right">Cliques</th>
            <th class="right">Conversões</th>
          </tr>
        </thead>
        <tbody>
          ${monthly.map((m, i) => `
            <tr style="${i % 2 === 1 ? 'background:rgba(255,255,255,.015);' : ''}">
              <td style="font-weight:700;color:#fff;">${m.label}</td>
              <td style="color:#71717a;">${m.days}</td>
              <td class="right" style="color:#4040E8;font-weight:700;">${brl(m.spend)}</td>
              <td class="right" style="color:#a1a1aa;">${num(m.impressions)}</td>
              <td class="right" style="color:#22C55E;">${num(m.clicks)}</td>
              <td class="right" style="color:#22C55E;font-weight:600;">${num(m.conversions)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ` : ''}

  <!-- PROJEÇÃO DE ORÇAMENTO -->
  <div class="zr-proj">
    <div class="zr-card-header" style="padding:0 0 16px;border-bottom:1px solid #1e1e2e;margin-bottom:18px;">
      <p class="zr-card-title" style="margin:0;">
        <span class="zr-accent-bar" style="background:#f59e0b;"></span>
        Projeção de Orçamento
      </p>
    </div>
    <div class="zr-proj-grid">
      <div>
        <p class="zr-proj-label">Gasto Atual</p>
        <p class="zr-proj-val" style="color:#fff;">${brl(totalSpend)}</p>
        <p class="zr-proj-sub">${numDays} dias de dados</p>
      </div>
      <div>
        <p class="zr-proj-label">Média Diária</p>
        <p class="zr-proj-val" style="color:#a78bfa;">${brl(dailyRate)}</p>
        <p class="zr-proj-sub">por dia</p>
      </div>
      <div>
        <p class="zr-proj-label">Projeção Mensal</p>
        <p class="zr-proj-val" style="color:#f59e0b;">${brl(monthlyProjection)}</p>
        <p class="zr-proj-sub">${brl(dailyRate)}/dia × ${daysInMonth} dias</p>
      </div>
    </div>
    <div>
      <div class="zr-prog-label">
        <span>Progresso do período</span>
        <span style="color:#e4e4e7;font-weight:600;">${numDays} / ${daysInMonth} dias (${progressPct}%)</span>
      </div>
      <div class="zr-prog-track">
        <div class="zr-prog-fill" style="width:${progressPct}%;"></div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="zr-footer">
    <div class="zr-footer-brand">
      <div class="zr-footer-logo">Z</div>
      <span class="zr-footer-name">Zenith Company</span>
    </div>
    <div class="zr-footer-meta">
      <div>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
      <div>Documento confidencial · ${esc(clientName)}</div>
    </div>
  </div>

</div>`;
}
