// Pure server-side HTML report generator — zero external dependencies
import { isActiveCampaign } from '@/lib/utils';
import type { StructuredAnalysis } from '@/lib/csv-analysis';

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
  structured?: StructuredAnalysis | null;
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

// ── Month name helpers ────────────────────────────────────────────────────────

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getPeriodMonthName(periodEnd: string): string {
  const dt = new Date(periodEnd + 'T12:00:00');
  return MONTH_NAMES_PT[dt.getMonth()].toLowerCase();
}

function getNextMonthName(periodEnd: string): string {
  const dt = new Date(periodEnd + 'T12:00:00');
  const nextMonth = (dt.getMonth() + 1) % 12;
  return MONTH_NAMES_PT[nextMonth];
}

function getMonthYearLabel(periodEnd: string): string {
  const dt = new Date(periodEnd + 'T12:00:00');
  return `${MONTH_NAMES_PT[dt.getMonth()]} ${dt.getFullYear()}`;
}

// ── Campaign type detection ───────────────────────────────────────────────────

type CampReportType = 'audiencia' | 'conversao';

function detectCampTypeForReport(c: CSVReportData['campaigns'][0]): CampReportType {
  const rt = (c.resultType ?? '').toLowerCase();
  const obj = (c.objective ?? '').toLowerCase();
  const name = (c.name ?? '').toLowerCase();
  if (
    rt.includes('profile_visit') || rt.includes('profile visit') ||
    rt.includes('reach') ||
    obj.includes('reach') || obj.includes('awareness') || obj.includes('brand_awareness') ||
    name.includes('audiência') || name.includes('audiencia') ||
    name.includes('alcance') || name.includes('perfil')
  ) {
    return 'audiencia';
  }
  return 'conversao';
}

function getCampEmoji(c: CSVReportData['campaigns'][0]): string {
  const rt = (c.resultType ?? '').toLowerCase();
  const obj = (c.objective ?? '').toLowerCase();
  if (rt.includes('messaging') || rt.includes('message') || rt.includes('onsite')) return '💬';
  if (rt.includes('profile_visit') || rt.includes('profile visit')) return '👤';
  if (rt.includes('thruplay') || rt.includes('video_view')) return '🎬';
  if (rt.includes('reach') || rt.includes('awareness') || obj.includes('awareness') || obj.includes('reach')) return '📡';
  return '🎯';
}

export function getResultLabel(resultType: string | null | undefined): string {
  if (!resultType) return 'Resultados';
  const rt = resultType.toLowerCase();
  if (rt.includes('onsite_conversion') || rt.includes('messaging')) return 'Conversas iniciadas';
  if (rt.includes('profile_visit')) return 'Visitas ao perfil';
  if (rt.includes('thruplay')) return 'ThruPlays';
  if (rt.includes('video_view')) return 'Visualizações de vídeo';
  if (rt.includes('reach')) return 'Alcance';
  if (rt.includes('lead')) return 'Leads';
  if (rt.includes('purchase') || rt.includes('compra')) return 'Compras';
  if (rt.includes('link_click') || rt.includes('click')) return 'Cliques no link';
  return 'Resultados';
}

function getResultCostLabel(resultType: string | null | undefined): string {
  if (!resultType) return 'resultado';
  const rt = resultType.toLowerCase();
  if (rt.includes('onsite_conversion') || rt.includes('messaging')) return 'conversa';
  if (rt.includes('profile_visit')) return 'visita';
  if (rt.includes('thruplay')) return 'ThruPlay';
  if (rt.includes('video_view')) return 'visualização';
  if (rt.includes('reach')) return 'pessoa';
  if (rt.includes('lead')) return 'lead';
  if (rt.includes('purchase') || rt.includes('compra')) return 'compra';
  if (rt.includes('link_click') || rt.includes('click')) return 'clique';
  return 'resultado';
}

// ── Main generator ───────────────────────────────────────────────────────────

export function generateCSVReport(data: CSVReportData): string {
  const {
    clientName, periodStart, periodEnd, numDays,
    totalSpend, totalImpressions, totalReach, totalConversions,
    monthlyProjection, daysInMonth,
    globalResultType, globalFrequency,
    campaigns, structured,
  } = data;

  const cplGlobal = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const frequency = globalFrequency ?? (totalReach > 0 ? totalImpressions / totalReach : 0);
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const periodMonthName = getPeriodMonthName(periodEnd);
  const nextMonth = structured?.nextMonthName ?? getNextMonthName(periodEnd);
  const monthYearLabel = getMonthYearLabel(periodEnd);
  const resultLabel = getResultLabel(globalResultType);
  const resultCostLabel = getResultCostLabel(globalResultType);

  // Hero summary
  const heroPeriodSummary = structured?.periodSummary
    ?? `Relatório ${numDays <= 7 ? 'semanal' : numDays <= 16 ? 'quinzenal' : 'mensal'} com ${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} entre ${fdateShort(periodStart)} e ${fdateShort(periodEnd)}. Investimento de ${brl(totalSpend)} gerando ${num(totalConversions)} ${resultLabel.toLowerCase()}.`;

  // Projection hint
  const projectionHint = monthlyProjection > 0
    ? `Projeção mensal: ${brl(monthlyProjection)}`
    : `${numDays} dias analisados`;

  // Audiencia camps for funil
  const audienciaCamps = campaigns.filter(c => detectCampTypeForReport(c) === 'audiencia');
  const audienciaResults = audienciaCamps.reduce((s, c) => s + c.conversions, 0);

  // Funil widths (proportional)
  const f1w = 100;
  const f2w = Math.max(18, Math.min(85, totalReach > 0 ? (totalImpressions / totalReach) * 50 : 50));
  const f3w = audienciaResults > 0
    ? Math.max(10, Math.min(60, totalReach > 0 ? (audienciaResults / totalReach) * 100 : 10))
    : Math.max(10, f2w * 0.45);
  const f4w = Math.max(5, Math.min(40, totalReach > 0 ? (totalConversions / totalReach) * 100 : 5));

  // Conversion rates
  const reachToImpr = totalReach > 0 ? ((totalImpressions / totalReach) * 100).toFixed(1) : '0';
  const imprToF3 = totalImpressions > 0 && audienciaResults > 0 ? ((audienciaResults / totalImpressions) * 100).toFixed(2) : '0';
  const f3ToConv = audienciaResults > 0
    ? ((totalConversions / audienciaResults) * 100).toFixed(1)
    : (totalReach > 0 ? ((totalConversions / totalReach) * 100).toFixed(2) : '0');

  const todayFormatted = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Monthly breakdown
  const monthly = monthlyBreakdown(periodStart, periodEnd, totalSpend, totalImpressions, data.totalClicks ?? 0, totalConversions);

  // ── CSS (Il Paradiso visual identity) ────────────────────────────────────────
  const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --black:#09090B;--dark:#111115;--card:#16161A;--card2:#1C1C21;
  --border:#26262D;--border2:#32323C;
  --gray:#52525B;--mid:#8B8B99;--light:#C4C4D0;--white:#EDEDF2;
  --gold:#C9A84C;--gold-l:#E8D48A;--gold-d:#7C6420;
  --blue:#3B6FE8;--blue-l:#93B4FF;
  --green:#22C87A;--green-l:#86EFBD;
  --orange:#F2703D;
}
html{scroll-behavior:smooth}
body{background:var(--black);color:var(--white);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:var(--dark)}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
body::before{content:'';position:fixed;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events:none;z-index:0;opacity:.5}
.blob{position:fixed;border-radius:50%;filter:blur(130px);pointer-events:none;z-index:0}
.b1{width:700px;height:700px;background:radial-gradient(circle,rgba(201,168,76,.09) 0%,transparent 70%);top:-250px;left:-200px}
.b2{width:500px;height:500px;background:radial-gradient(circle,rgba(59,111,232,.07) 0%,transparent 70%);bottom:0;right:-150px}
.container{max-width:1120px;margin:0 auto;padding:0 28px;position:relative;z-index:1}

/* ── NAV ── */
nav{position:sticky;top:0;z-index:100;background:rgba(9,9,11,.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0}
nav::after{content:'';display:block;height:1px;background:linear-gradient(90deg,transparent,var(--gold),rgba(59,111,232,.5),transparent)}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:14px 28px;max-width:1120px;margin:0 auto;gap:20px}
.nav-brand{display:flex;align-items:center;gap:12px;flex-shrink:0}
.nav-client{font-size:15px;font-weight:700;color:var(--white)}
.nav-period{font-size:11px;color:var(--gray);margin-top:1px}
.nav-links{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.nav-links::-webkit-scrollbar{display:none}
.nav-link{padding:7px 16px;border-radius:8px;background:transparent;border:none;color:var(--mid);font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s;white-space:nowrap}
.nav-link:hover{color:var(--white);background:rgba(255,255,255,.05)}
.nav-link.active{color:var(--gold);background:rgba(201,168,76,.08)}
.nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.nav-zenith{font-family:'Playfair Display',serif;font-size:13px;color:var(--gold);opacity:.8}
.nav-badge{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;color:var(--gold)}

/* ── HERO ── */
.hero{padding:80px 0 60px;border-bottom:1px solid var(--border);position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),rgba(59,111,232,.5),transparent)}
.hero-grid{display:grid;grid-template-columns:1fr auto;align-items:center;gap:40px}
.hero-tag{display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:100px;padding:6px 14px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-l);margin-bottom:20px}
.hero-tag-dot{width:6px;height:6px;background:var(--green);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
.hero-title{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,58px);font-weight:400;line-height:1.06;letter-spacing:-.02em;color:var(--white);margin-bottom:14px}
.hero-title em{font-style:italic;background:linear-gradient(135deg,var(--gold-l),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:15px;color:var(--mid);line-height:1.6;max-width:480px}
.hero-right{text-align:right}
.hero-logo{width:110px;height:110px;border-radius:50%;border:2px solid rgba(201,168,76,.25);background:rgba(201,168,76,.04);display:flex;align-items:center;justify-content:center;font-size:44px;box-shadow:0 0 60px rgba(201,168,76,.12);margin:0 0 14px auto}
.hero-meta p{font-size:12px;color:var(--gray);line-height:1.8}
.hero-meta strong{color:var(--mid)}

/* ── SECTIONS ── */
.section{display:none;padding:52px 0 80px}
.section.visible{display:block}

/* ── SECTION LABEL ── */
.sec-lbl{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gray);display:flex;align-items:center;gap:14px;margin-bottom:28px}
.sec-lbl::after{content:'';flex:1;height:1px;background:var(--border)}
.sec-lbl.gold{color:var(--gold)}
.sec-lbl.blue{color:var(--blue-l)}
.sec-lbl.green{color:var(--green)}
.sec-lbl.orange{color:var(--orange)}

/* ── KPI GRID ── */
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
.kpi-grid-2{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.kpi-card{border-radius:16px;padding:24px 20px;position:relative;overflow:hidden;animation:fadeUp .5s ease both;transition:transform .2s;cursor:default}
.kpi-card:hover{transform:translateY(-3px)}
.kpi-card.primary{background:linear-gradient(135deg,#1D3E7A 0%,#162D5C 100%);border:1px solid rgba(59,111,232,.35)}
.kpi-card.gold-card{background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.2)}
.kpi-card.blue-card{background:rgba(59,111,232,.07);border:1px solid rgba(59,111,232,.2)}
.kpi-card.green-card{background:rgba(34,200,122,.07);border:1px solid rgba(34,200,122,.2)}
.kpi-card.orange-card{background:rgba(242,112,61,.07);border:1px solid rgba(242,112,61,.2)}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--card-accent,var(--border))}
.kpi-card.primary{--card-accent:var(--blue)}
.kpi-card.gold-card{--card-accent:var(--gold)}
.kpi-card.blue-card{--card-accent:var(--blue)}
.kpi-card.green-card{--card-accent:var(--green)}
.kpi-card.orange-card{--card-accent:var(--orange)}
.kpi-icon{font-size:22px;margin-bottom:14px}
.kpi-value{font-family:'Playfair Display',serif;font-size:32px;font-weight:400;line-height:1;margin-bottom:6px;font-variant-numeric:tabular-nums}
.kpi-card.primary .kpi-value{color:#fff}
.kpi-card.gold-card .kpi-value{color:var(--gold)}
.kpi-card.blue-card .kpi-value{color:var(--blue-l)}
.kpi-card.green-card .kpi-value{color:var(--green)}
.kpi-card.orange-card .kpi-value{color:var(--orange)}
.kpi-label{font-size:12px;font-weight:600;color:var(--light)}
.kpi-card.primary .kpi-label{color:rgba(147,180,255,.7)}
.kpi-sub{font-size:11px;color:var(--gray);margin-top:3px}
.kpi-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(34,200,122,.12);border:1px solid rgba(34,200,122,.2);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;color:var(--green);margin-top:8px}

/* ── STRIP ── */
.strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:14px;overflow:hidden;border:1px solid var(--border);margin-bottom:40px}
.strip-cell{background:var(--card);padding:22px 18px;text-align:center}
.strip-val{font-family:'Playfair Display',serif;font-size:28px;font-weight:400;line-height:1;margin-bottom:6px;font-variant-numeric:tabular-nums}
.strip-lbl{font-size:11px;color:var(--gray);letter-spacing:.06em}

/* ── FUNNEL ── */
.funnel{display:flex;flex-direction:column;gap:8px;position:relative;padding-right:80px}
.f-step{height:60px;border-radius:10px;display:flex;align-items:center;padding:0 24px;transition:opacity .2s;cursor:default;position:relative}
.f-step:hover{opacity:.88}
.f-inner{display:flex;align-items:center;justify-content:space-between;width:100%}
.f-lbl{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.9)}
.f-val{font-size:18px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
.f-pct{position:absolute;right:-72px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--gray);white-space:nowrap}

/* ── BAR CHART ── */
.bar-chart{display:flex;flex-direction:column;gap:14px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-name{width:155px;flex-shrink:0;font-size:12px;color:var(--mid);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;height:9px;background:var(--border);border-radius:100px;overflow:hidden}
.bar-fill{height:100%;border-radius:100px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
.bar-val{width:90px;font-size:12px;font-weight:600;color:var(--mid);text-align:right;font-variant-numeric:tabular-nums}

/* ── CHART CARD ── */
.chart-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px 22px 16px}
.chart-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
.chart-title{font-size:13px;font-weight:600;color:var(--white);margin-bottom:2px}
.chart-sub{font-size:11px;color:var(--gray)}
.chart-badge{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--gold);white-space:nowrap}

/* ── TWO / THREE COL ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}

/* ── CAMPAIGN CARDS ── */
.camp-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.camp-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:26px;transition:transform .2s,box-shadow .2s}
.camp-card:hover{transform:translateY(-3px);box-shadow:0 20px 50px rgba(0,0,0,.4)}
.camp-card.featured{background:linear-gradient(135deg,rgba(201,168,76,.08) 0%,rgba(201,168,76,.03) 100%);border-color:rgba(201,168,76,.3);grid-column:span 2}
.camp-rank{font-size:11px;color:var(--gray);font-weight:600;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px}
.camp-name{font-size:11px;color:var(--gray);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.camp-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--white);margin-bottom:22px;line-height:1.2}
.camp-metrics{display:flex;gap:28px;flex-wrap:wrap}
.camp-m-val{font-size:26px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.camp-m-lbl{font-size:10px;color:var(--gray);margin-top:4px;text-transform:uppercase;letter-spacing:.08em}
.vdiv{width:1px;background:var(--border);align-self:stretch}
.status-active{display:inline-flex;align-items:center;gap:5px;background:rgba(34,200,122,.1);border:1px solid rgba(34,200,122,.2);border-radius:100px;padding:4px 12px;font-size:11px;font-weight:600;color:var(--green);margin-top:18px}
.status-paused{display:inline-flex;align-items:center;gap:5px;background:rgba(82,82,91,.1);border:1px solid var(--border);border-radius:100px;padding:4px 12px;font-size:11px;color:var(--gray);margin-top:18px}
.status-active::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green)}
.status-paused::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gray)}

/* ── ANALYSIS ── */
.analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.anal-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.anal-hdr{padding:14px 22px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.anal-hdr.pos{background:rgba(59,111,232,.12);color:var(--blue-l);border-bottom:1px solid rgba(59,111,232,.15)}
.anal-hdr.opp{background:rgba(201,168,76,.1);color:var(--gold-l);border-bottom:1px solid rgba(201,168,76,.15)}
.anal-item{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:flex-start}
.anal-item:last-child{border-bottom:none}
.anal-ic{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:1px}
.anal-ic.blue{background:rgba(59,111,232,.14)}
.anal-ic.gold{background:rgba(201,168,76,.12)}
.anal-t{font-size:13px;font-weight:600;color:var(--white);margin-bottom:4px;line-height:1.3}
.anal-b{font-size:12px;color:var(--gray);line-height:1.6}

/* ── MONTHLY TABLE ── */
.m-table-wrap{overflow-x:auto}
.m-table{width:100%;border-collapse:collapse}
.m-table th{padding:10px 16px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gray);background:var(--card);border-bottom:1px solid var(--border)}
.m-table td{padding:13px 16px;font-size:13px;color:var(--light);border-bottom:1px solid var(--border)}
.m-table tr:hover td{background:rgba(255,255,255,.02)}
.m-table tr:last-child td{border-bottom:none}

/* ── CPV FLOW ── */
.cpv-flow{display:flex;align-items:center;justify-content:center;gap:0;padding:18px 0}
.cpv-node{text-align:center;padding:0 28px}
.cpv-month{font-size:11px;color:var(--gray);margin-bottom:6px}
.cpv-val{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums}
.cpv-arrow{font-size:18px;color:var(--border2);flex-shrink:0}

/* ── BIG KPI ── */
.big-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.big-kpi-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center}
.big-kpi-emoji{font-size:24px;margin-bottom:10px}
.big-kpi-val{font-family:'Playfair Display',serif;font-size:26px;margin-bottom:4px}
.big-kpi-label{font-size:10px;font-weight:600;color:var(--light);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.big-kpi-desc{font-size:11px;color:var(--gray);line-height:1.6}

/* ── FOOTER ── */
footer{border-top:1px solid var(--border);padding:44px 0;margin-top:40px;position:relative}
footer::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),var(--blue),transparent)}
.footer-inner{display:flex;justify-content:space-between;align-items:center;gap:20px}
.footer-brand{font-family:'Playfair Display',serif;font-size:18px;color:var(--white)}
.footer-brand span{color:var(--gold)}
.footer-meta{font-size:12px;color:var(--gray);text-align:right;line-height:1.8}

/* ── ANIMATIONS ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.kpi-card:nth-child(1){animation-delay:.05s}
.kpi-card:nth-child(2){animation-delay:.1s}
.kpi-card:nth-child(3){animation-delay:.15s}
.kpi-card:nth-child(4){animation-delay:.2s}
.kpi-card:nth-child(5){animation-delay:.25s}
.kpi-card:nth-child(6){animation-delay:.3s}

@media(max-width:768px){
  .kpi-grid,.kpi-grid-2{grid-template-columns:1fr 1fr}
  .two-col,.three-col,.camp-grid,.analysis-grid{grid-template-columns:1fr}
  .camp-card.featured{grid-column:span 1}
  .strip{grid-template-columns:repeat(2,1fr)}
  .hero-grid{grid-template-columns:1fr}
  .hero-right{display:none}
  .big-kpi-grid{grid-template-columns:1fr 1fr}
  .funnel{padding-right:70px}
  .nav-inner{flex-wrap:wrap;gap:10px}
}
`;

  // ── Campaign Cards ────────────────────────────────────────────────────────────
  function renderCampCards(): string {
    const sorted = [...campaigns].sort((a, b) => b.conversions - a.conversions || b.spend - a.spend);
    return sorted.map((c, i) => {
      const cpr = c.conversions > 0 ? c.spend / c.conversions : 0;
      const isFeatured = i === 0;
      const isActive = isActiveCampaign(c.status);
      const resultLbl = getResultLabel(c.resultType);
      const costLbl = getResultCostLabel(c.resultType);
      const mainColor = isFeatured ? 'var(--gold)' : (detectCampTypeForReport(c) === 'audiencia' ? 'var(--blue-l)' : 'var(--green)');
      return `
      <div class="camp-card${isFeatured ? ' featured' : ''}">
        ${isFeatured ? `<div class="camp-rank">#1 Melhor Performance</div>` : `<div class="camp-rank">#${i + 1}</div>`}
        <div class="camp-name">${esc(c.objective ?? (detectCampTypeForReport(c) === 'audiencia' ? 'Alcance · Audiência' : 'Conversão'))}</div>
        <div class="camp-title">${esc(c.name)}</div>
        <div class="camp-metrics">
          ${c.conversions > 0 ? `
          <div>
            <div class="camp-m-val" style="color:${mainColor}">${num(c.conversions)}</div>
            <div class="camp-m-lbl">${esc(resultLbl)}</div>
          </div>
          <div class="vdiv"></div>
          <div>
            <div class="camp-m-val" style="color:var(--white)">${cpr > 0 ? brl(cpr) : '—'}</div>
            <div class="camp-m-lbl">Custo / ${esc(costLbl)}</div>
          </div>
          <div class="vdiv"></div>` : ''}
          <div>
            <div class="camp-m-val" style="color:var(--white)">${brl(c.spend)}</div>
            <div class="camp-m-lbl">Investimento</div>
          </div>
          <div class="vdiv"></div>
          <div>
            <div class="camp-m-val" style="color:var(--white)">${num(c.impressions)}</div>
            <div class="camp-m-lbl">Impressões</div>
          </div>
          <div class="vdiv"></div>
          <div>
            <div class="camp-m-val" style="color:var(--white)">${num(c.reach)}</div>
            <div class="camp-m-lbl">Alcance</div>
          </div>
        </div>
        ${isActive ? '<span class="status-active">Ativa</span>' : '<span class="status-paused">Pausada</span>'}
      </div>`;
    }).join('');
  }

  // ── Big KPI Achievement Cards ─────────────────────────────────────────────────
  function renderBigKpiCards(): string {
    const items = [
      { emoji: '🏆', val: num(totalReach), label: 'Pessoas Alcançadas', desc: `Presença de marca com ${campaigns.length} campanhas no período.`, color: 'var(--gold)' },
      { emoji: '📲', val: num(totalConversions), label: esc(resultLabel), desc: `${esc(resultLabel)} com custo médio de ${cplGlobal > 0 ? brl(cplGlobal) : '—'} por resultado.`, color: 'var(--blue-l)' },
      { emoji: '💎', val: cplGlobal > 0 ? brl(cplGlobal) : '—', label: `Custo por ${esc(resultCostLabel)}`, desc: `CPR médio no período — resultado de otimização contínua.`, color: 'var(--green)' },
      { emoji: '📡', val: num(totalImpressions), label: 'Impressões Totais', desc: `Frequência de ${frequency.toFixed(2)}x por pessoa alcançada.`, color: 'var(--orange)' },
    ];
    const borderColors = ['var(--gold)', 'var(--blue)', 'var(--green)', 'var(--orange)'];
    return items.map((it, i) => `
      <div class="big-kpi-card" style="border-top:2px solid ${borderColors[i]}">
        <div class="big-kpi-emoji">${it.emoji}</div>
        <div class="big-kpi-val" style="color:${it.color}">${it.val}</div>
        <div class="big-kpi-label">${it.label}</div>
        <div class="big-kpi-desc">${it.desc}</div>
      </div>`).join('');
  }

  // ── Analysis Grid ─────────────────────────────────────────────────────────────
  function renderAnalysisGrid(): string {
    const positives = structured?.insights?.length
      ? structured.insights.slice(0, 4)
      : [
          { icon: '🎯', title: `${num(totalReach)} pessoas alcançadas`, text: `Presença de marca consolidada com ${campaigns.length} campanhas no período.` },
          { icon: '💰', title: `CPR de ${cplGlobal > 0 ? brl(cplGlobal) : '—'}`, text: `Custo por resultado dentro do esperado para o segmento.` },
          { icon: '📈', title: `${num(totalImpressions)} impressões`, text: `Frequência de ${frequency.toFixed(2)}x garantindo boa exposição da marca.` },
          { icon: '✅', title: `${campaigns.filter(c => isActiveCampaign(c.status)).length} campanhas ativas`, text: `Mix de campanhas equilibrado entre alcance e conversão.` },
        ];

    const opportunities = structured?.recommendations?.length
      ? structured.recommendations.slice(0, 4).map(r => ({ icon: '⚡', title: r.title, text: r.text }))
      : [
          { icon: '⚡', title: 'Otimizar CPR das campanhas', text: 'Revisar segmentação das campanhas com custo acima da média.' },
          { icon: '🔄', title: 'Testar novos criativos', text: 'Renovar os criativos para evitar saturação da audiência.' },
          { icon: '📊', title: 'Ampliar alcance', text: 'Explorar novos públicos semelhantes para escalar resultados.' },
          { icon: '🎯', title: `Planejar ${esc(nextMonth)}`, text: 'Manter orçamento e ajustar mix de campanhas com base nos dados.' },
        ];

    return `
      <div class="analysis-grid">
        <div class="anal-card">
          <div class="anal-hdr pos">✦ Pontos Positivos — Resultados da Gestão</div>
          ${positives.map(p => `
          <div class="anal-item">
            <div class="anal-ic blue">${p.icon}</div>
            <div>
              <div class="anal-t">${esc(p.title)}</div>
              <div class="anal-b">${p.text}</div>
            </div>
          </div>`).join('')}
        </div>
        <div class="anal-card">
          <div class="anal-hdr opp">◈ Oportunidades — Próximos Passos em ${esc(nextMonth)}</div>
          ${opportunities.map(o => `
          <div class="anal-item">
            <div class="anal-ic gold">${o.icon}</div>
            <div>
              <div class="anal-t">${esc(o.title)}</div>
              <div class="anal-b">${o.text}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  // ── Monthly Section ───────────────────────────────────────────────────────────
  function renderMonthlySection(): string {
    if (monthly.length < 2) return `
      <div class="chart-card" style="text-align:center;padding:60px 22px">
        <div style="font-size:32px;margin-bottom:12px">📅</div>
        <div class="chart-title">Dados de um único período</div>
        <div class="chart-sub" style="margin-top:6px">A comparação mensal fica disponível quando o relatório abrange mais de um mês.</div>
      </div>`;

    const cpvColors = ['var(--orange)', 'var(--gold)', 'var(--green)'];
    const cprByMonth = monthly.map(m => ({
      label: m.label,
      cpr: m.conversions > 0 ? m.spend / m.conversions : 0,
      spend: m.spend,
      impressions: m.impressions,
      conversions: m.conversions,
    }));

    const cpvFlow = `
      <div class="chart-card" style="margin-bottom:20px">
        <div class="chart-hdr">
          <div>
            <div class="chart-title">Evolução do Custo por Resultado</div>
            <div class="chart-sub">Acompanhamento mês a mês da eficiência das campanhas</div>
          </div>
        </div>
        <div class="cpv-flow">
          ${cprByMonth.map((m, i) => `
            ${i > 0 ? '<div class="cpv-arrow">→</div>' : ''}
            <div class="cpv-node">
              <div class="cpv-month">${esc(m.label)}</div>
              <div class="cpv-val" style="color:${cpvColors[Math.min(i, 2)]}">${m.cpr > 0 ? brl(m.cpr) : '—'}</div>
            </div>`).join('')}
        </div>
      </div>`;

    const tableRows = cprByMonth.map((m, i) => `
      <tr${i === cprByMonth.length - 1 ? ' style="background:rgba(201,168,76,.03)"' : ''}>
        <td><strong style="color:var(--gold)">${esc(m.label)}</strong></td>
        <td>${brl(m.spend)}</td>
        <td>${num(m.impressions)}</td>
        <td>${m.conversions > 0 ? num(m.conversions) : '—'}</td>
        <td style="color:${cpvColors[Math.min(i, 2)]}">${m.cpr > 0 ? brl(m.cpr) : '—'}</td>
      </tr>`).join('');

    return `
      ${cpvFlow}
      <div class="m-table-wrap chart-card">
        <div class="chart-hdr" style="margin-bottom:16px">
          <div>
            <div class="chart-title">Comparativo Mensal Completo</div>
            <div class="chart-sub">Todos os indicadores por mês</div>
          </div>
        </div>
        <table class="m-table">
          <thead>
            <tr><th>Mês</th><th>Investimento</th><th>Impressões</th><th>Resultados</th><th>CPR Médio</th></tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr style="border-top:2px solid var(--border2)">
              <td><strong style="color:var(--white)">TOTAL</strong></td>
              <td><strong style="color:var(--gold)">${brl(totalSpend)}</strong></td>
              <td><strong>${num(totalImpressions)}</strong></td>
              <td><strong style="color:var(--green)">${num(totalConversions)}</strong></td>
              <td><strong style="color:var(--green)">${cplGlobal > 0 ? brl(cplGlobal) : '—'}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  // ── Funil efficiency bar chart ────────────────────────────────────────────────
  function renderEfficiencyBars(): string {
    const sorted = [...campaigns].filter(c => c.conversions > 0)
      .sort((a, b) => (a.spend / a.conversions) - (b.spend / b.conversions))
      .slice(0, 6);
    if (sorted.length === 0) {
      return '<p style="color:var(--mid);font-size:13px;padding:8px 0">Sem campanhas com resultados registrados.</p>';
    }
    const maxCpr = Math.max(...sorted.map(c => c.spend / c.conversions));
    return `<div class="bar-chart">${sorted.map((c, i) => {
      const cpr = c.spend / c.conversions;
      const pct = maxCpr > 0 ? (cpr / maxCpr * 100).toFixed(0) : '0';
      const color = i === 0 ? 'var(--green)' : i <= 1 ? 'var(--blue-l)' : 'var(--gold)';
      return `
        <div class="bar-row">
          <div class="bar-name" title="${esc(c.name)}">${esc(c.name.length > 22 ? c.name.slice(0, 22) + '…' : c.name)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="bar-val">${brl(cpr)}</div>
        </div>`;
    }).join('')}</div>`;
  }

  // ── Build HTML ────────────────────────────────────────────────────────────────
  const hasMonthly = monthly.length >= 2;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(clientName)} · Relatório de Performance</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>

<div class="blob b1"></div>
<div class="blob b2"></div>

<!-- ── NAV ── -->
<nav>
  <div class="nav-inner">
    <div class="nav-brand">
      <div>
        <div class="nav-client">${esc(clientName)}</div>
        <div class="nav-period">Meta Ads · ${fdateShort(periodStart)} → ${fdateShort(periodEnd)}</div>
      </div>
    </div>
    <div class="nav-links">
      <button class="nav-link active" onclick="showSection('overview',this)">📊 Visão Geral</button>
      <button class="nav-link" onclick="showSection('funnel',this)">🔽 Funil</button>
      <button class="nav-link" onclick="showSection('campaigns',this)">📣 Campanhas</button>
      <button class="nav-link" onclick="showSection('monthly',this)">📅 Mensal</button>
    </div>
    <div class="nav-right">
      <div class="nav-zenith">ZENITH.</div>
      <div class="nav-badge">${monthYearLabel}</div>
    </div>
  </div>
</nav>

<!-- ── HERO ── -->
<section class="hero">
  <div class="container">
    <div class="hero-grid">
      <div>
        <div class="hero-tag"><span class="hero-tag-dot"></span>Meta Ads · Gestão de Tráfego</div>
        <h1 class="hero-title">Performance de <em>${periodMonthName}.</em></h1>
        <p class="hero-sub">${esc(heroPeriodSummary)}</p>
      </div>
      <div class="hero-right">
        <div class="hero-logo">✦</div>
        <div class="hero-meta">
          <p><strong>Período</strong> ${fdateShort(periodStart)} → ${fdateShort(periodEnd)}</p>
          <p><strong>Dias</strong> ${numDays} dias analisados</p>
          <p><strong>Campanhas</strong> ${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''}</p>
          <p><strong>Projeção</strong> ${monthlyProjection > 0 ? brl(monthlyProjection) + '/mês' : '—'}</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════
     SEÇÃO: VISÃO GERAL
════════════════════════════════════════════ -->
<section id="overview" class="section visible">
  <div class="container">
    <div class="sec-lbl gold">Indicadores Principais · ${fdateShort(periodStart)} — ${fdateShort(periodEnd)}</div>

    <!-- KPI Row 1: investimento + impressões + alcance -->
    <div class="kpi-grid">
      <div class="kpi-card primary">
        <div class="kpi-icon">💸</div>
        <div class="kpi-value">${brl(totalSpend)}</div>
        <div class="kpi-label">Investimento Total</div>
        <div class="kpi-sub">${esc(projectionHint)}</div>
        <div class="kpi-badge">● ${numDays} dias</div>
      </div>
      <div class="kpi-card gold-card">
        <div class="kpi-icon">👁️</div>
        <div class="kpi-value">${num(totalImpressions)}</div>
        <div class="kpi-label">Impressões Totais</div>
        <div class="kpi-sub">CPM ${cpm > 0 ? brl(cpm) : '—'} · freq. ${frequency.toFixed(2)}x</div>
      </div>
      <div class="kpi-card blue-card">
        <div class="kpi-icon">🎯</div>
        <div class="kpi-value">${num(totalReach)}</div>
        <div class="kpi-label">Pessoas Alcançadas</div>
        <div class="kpi-sub">Frequência média ${frequency.toFixed(2)}x por pessoa</div>
      </div>
    </div>

    <!-- KPI Row 2: resultados + CPR + CPM -->
    <div class="kpi-grid-2">
      <div class="kpi-card green-card">
        <div class="kpi-icon">${getCampEmoji(campaigns[0] ?? { resultType: globalResultType, objective: null })}</div>
        <div class="kpi-value">${num(totalConversions)}</div>
        <div class="kpi-label">${esc(resultLabel)}</div>
        <div class="kpi-sub">${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} ativas</div>
      </div>
      <div class="kpi-card orange-card">
        <div class="kpi-icon">💎</div>
        <div class="kpi-value">${cplGlobal > 0 ? brl(cplGlobal) : '—'}</div>
        <div class="kpi-label">CPR Médio</div>
        <div class="kpi-sub">Custo por ${esc(resultCostLabel)} no período</div>
      </div>
      <div class="kpi-card gold-card">
        <div class="kpi-icon">📈</div>
        <div class="kpi-value">${brl(totalSpend / (numDays || 1))}</div>
        <div class="kpi-label">Gasto por Dia</div>
        <div class="kpi-sub">Média diária no período de ${numDays}d</div>
      </div>
    </div>

    <!-- STRIP: 4 métricas rápidas -->
    <div class="strip">
      <div class="strip-cell">
        <div class="strip-val" style="color:var(--gold)">${brl(totalSpend / (numDays || 1))}</div>
        <div class="strip-lbl">Gasto / Dia</div>
      </div>
      <div class="strip-cell">
        <div class="strip-val">${cpm > 0 ? brl(cpm) : '—'}</div>
        <div class="strip-lbl">CPM</div>
      </div>
      <div class="strip-cell">
        <div class="strip-val">${numDays}d</div>
        <div class="strip-lbl">Período</div>
      </div>
      <div class="strip-cell">
        <div class="strip-val" style="color:var(--green)">${campaigns.filter(c => isActiveCampaign(c.status)).length}</div>
        <div class="strip-lbl">Campanhas Ativas</div>
      </div>
    </div>

    <div class="sec-lbl blue">Resumo de Performance · ${esc(clientName)}</div>

    <!-- Big KPI cards -->
    <div class="big-kpi-grid">
      ${renderBigKpiCards()}
    </div>

    <!-- Analysis grid -->
    ${renderAnalysisGrid()}
  </div>
</section>

<!-- ══════════════════════════════════════════
     SEÇÃO: FUNIL
════════════════════════════════════════════ -->
<section id="funnel" class="section">
  <div class="container">
    <div class="sec-lbl gold">Jornada do Cliente · Do Alcance à Conversão</div>
    <div class="two-col">

      <!-- Funil visual -->
      <div>
        <div class="chart-card" style="margin-bottom:0">
          <div class="chart-hdr">
            <div>
              <div class="chart-title">Funil de Marketing</div>
              <div class="chart-sub">Jornada completa do anúncio à conversão</div>
            </div>
            <div class="chart-badge">${numDays}d</div>
          </div>
          <div class="funnel">
            <div class="f-step" style="width:${f1w}%;background:linear-gradient(90deg,rgba(201,168,76,.4),rgba(201,168,76,.2))">
              <div class="f-inner">
                <span class="f-lbl">Alcance Único</span>
                <span class="f-val">${num(totalReach)}</span>
              </div>
              <div class="f-pct">↓ ${reachToImpr}% freq.</div>
            </div>
            <div class="f-step" style="width:${f2w.toFixed(0)}%;background:linear-gradient(90deg,rgba(59,111,232,.4),rgba(59,111,232,.2))">
              <div class="f-inner">
                <span class="f-lbl">Impressões</span>
                <span class="f-val">${num(totalImpressions)}</span>
              </div>
              <div class="f-pct">↓ ${imprToF3}%</div>
            </div>
            <div class="f-step" style="width:${f3w.toFixed(0)}%;background:linear-gradient(90deg,rgba(147,180,255,.35),rgba(147,180,255,.15))">
              <div class="f-inner">
                <span class="f-lbl">${audienciaResults > 0 ? 'Resultado Audiência' : 'Engajamento Est.'}</span>
                <span class="f-val">${audienciaResults > 0 ? num(audienciaResults) : '~' + num(Math.round(totalImpressions * 0.45))}</span>
              </div>
              <div class="f-pct">↓ ${f3ToConv}%</div>
            </div>
            <div class="f-step" style="width:${Math.max(8, f4w).toFixed(0)}%;background:linear-gradient(90deg,rgba(34,200,122,.5),rgba(34,200,122,.3))">
              <div class="f-inner">
                <span class="f-lbl">${esc(resultLabel)}</span>
                <span class="f-val">${num(totalConversions)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Eficiência por campanha -->
      <div class="chart-card">
        <div class="chart-hdr">
          <div>
            <div class="chart-title">Eficiência por Campanha</div>
            <div class="chart-sub">Custo por resultado — menor é melhor</div>
          </div>
        </div>
        ${renderEfficiencyBars()}
      </div>

    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════
     SEÇÃO: CAMPANHAS
════════════════════════════════════════════ -->
<section id="campaigns" class="section">
  <div class="container">
    <div class="sec-lbl blue">Campanhas · ${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} · ${campaigns.filter(c => isActiveCampaign(c.status)).length} ativa${campaigns.filter(c => isActiveCampaign(c.status)).length !== 1 ? 's' : ''}</div>
    <div class="camp-grid">
      ${renderCampCards()}
    </div>
  </div>
</section>

<!-- ══════════════════════════════════════════
     SEÇÃO: MENSAL
════════════════════════════════════════════ -->
<section id="monthly" class="section">
  <div class="container">
    <div class="sec-lbl blue">Relatório Mensal · Mês a Mês</div>
    ${renderMonthlySection()}
  </div>
</section>

<!-- ── FOOTER ── -->
<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand">ZENITH<span>.</span></div>
      <div class="footer-meta">
        Relatório gerado em ${todayFormatted}<br>
        Fonte: Meta Ads Manager · ${esc(clientName)}
      </div>
    </div>
  </div>
</footer>

<script>
  function showSection(id, btn) {
    document.querySelectorAll('.section').forEach(function(s) {
      s.classList.remove('visible');
    });
    document.querySelectorAll('.nav-link').forEach(function(b) {
      b.classList.remove('active');
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('visible');
    if (btn) btn.classList.add('active');
  }
</script>

</body>
</html>`;
}
