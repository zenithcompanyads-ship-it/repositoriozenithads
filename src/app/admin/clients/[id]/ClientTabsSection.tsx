'use client';

import { useState } from 'react';
import type { Client, Metric, Campaign, Report, Alert, Goal, MonthlyPlan, ClientDocument } from '@/types';
import { formatCurrency, formatNumber, formatPercent, formatDate, getPeriodLabel, getResultLabel, getCostPerResultLabel } from '@/lib/utils';
import {
  BarChart2, Calendar, Bell, TrendingUp,
  FileSpreadsheet, ShieldCheck, Settings, ExternalLink,
  MessageSquare, Eye, Zap, Radio, FileText, Monitor, FolderOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CSVAnalysisTab } from '@/components/admin/CSVAnalysisTab';
import { MonthlyPlanTab } from '@/components/admin/MonthlyPlanTab';
import { PermissionsTab } from '@/components/admin/PermissionsTab';
import { EditClientTab } from '@/components/admin/EditClientTab';
import { DocumentsTab } from '@/components/admin/DocumentsTab';

export interface PlanPrefill {
  objective: string;
  totalBudget: string;
  campaigns: Array<{ id: string; name: string; objective: string; budget: string; period: string; notes: string }>;
  strategies: string;
  goals: { roas: string; maxCpc: string; minCtr: string; conversions: string };
  notes: string;
}

const TABS = [
  { id: 'preview',  label: 'Relatório',    icon: Monitor },
  { id: 'overview', label: 'Visão Geral',  icon: BarChart2 },
  { id: 'weekly',   label: 'Semanal',      icon: TrendingUp },
  { id: 'csv',      label: 'Análise CSV',  icon: FileSpreadsheet },
  { id: 'plan',     label: 'Planejamento', icon: Calendar },
  { id: 'documents', label: 'Documentos', icon: FolderOpen },
  { id: 'reports_mgmt', label: 'Gerenciar', icon: FileText },
  { id: 'permissions', label: 'Permissões', icon: ShieldCheck },
  { id: 'edit',     label: 'Editar',       icon: Settings },
];

interface Props {
  client: Client;
  metrics: Metric[];
  campaigns: Campaign[];
  reports: Report[];
  alerts: Alert[];
  goals: Goal[];
  plans: MonthlyPlan[];
  documents: ClientDocument[];
}


export function ClientTabsSection({ client, metrics, campaigns, reports, alerts, goals, plans, documents }: Props) {
  const [activeTab, setActiveTab] = useState('preview');

  const isPreview = activeTab === 'preview';

  return (
    <div style={{ background: 'var(--adm-bg)' }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-surface)',
        padding: '0 32px',
        overflowX: 'auto',
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '14px 16px',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--adm-accent)' : 'var(--adm-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--adm-accent)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.12s',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--adm-body)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--adm-secondary)'; }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {isPreview ? (
        <PreviewTab reports={reports} />
      ) : (
        <div style={{ padding: '32px', background: 'var(--adm-bg)', minHeight: 'calc(100vh - 180px)' }}>
          {activeTab === 'overview' && (
            <OverviewTab client={client} metrics={metrics} campaigns={campaigns} reports={reports} alerts={alerts} />
          )}
          {activeTab === 'weekly' && (
            <WeeklyTab client={client} metrics={metrics} campaigns={campaigns} reports={reports} />
          )}
          {activeTab === 'csv' && (
            <CSVAnalysisTab
              clientId={client.id}
              clientName={client.name}
              pastReports={reports.filter((r) => r.type === 'csv_analysis')}
            />
          )}
          {activeTab === 'plan' && (
            <MonthlyPlanTab
              clientId={client.id}
              clientName={client.name}
              plans={plans}
              metrics={metrics}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab clientId={client.id} initialDocuments={documents} />
          )}
          {activeTab === 'reports_mgmt' && (
            <ReportsMgmtTab reports={reports} clientId={client.id} />
          )}
          {activeTab === 'permissions' && (
            <PermissionsTab client={client} />
          )}
          {activeTab === 'edit' && (
            <EditClientTab client={client} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
type CampExt = Campaign & { result_type?: string | null };

function detectObjective(c: CampExt): 'messaging' | 'profile_visit' | 'video' | 'awareness' | 'conversion' {
  const rt  = (c.result_type ?? '').toLowerCase();
  const nm  = (c.name ?? '').toLowerCase();
  const obj = (c.objective ?? '').toLowerCase();
  if (rt.includes('messaging') || rt.includes('onsite_messaging') || nm.includes('mensag') || nm.includes('inbox')) return 'messaging';
  if (rt.includes('profile_visit') || nm.includes('perfil') || nm.includes('profile')) return 'profile_visit';
  if (rt.includes('thruplay') || rt.includes('video') || nm.includes('vídeo') || nm.includes('video') || obj.includes('video')) return 'video';
  if (obj.includes('reach') || obj.includes('awareness') || rt.includes('reach') || nm.includes('alcance')) return 'awareness';
  return 'conversion';
}

const OBJ_META = {
  messaging:     { label: 'Mensagens',      Icon: MessageSquare, color: '#16A34A', bg: '#DCFCE7', primaryLabel: 'Mensagens',  costLabel: 'Custo/Msg' },
  profile_visit: { label: 'Visitas Perfil', Icon: Eye,           color: '#0891B2', bg: '#CFFAFE', primaryLabel: 'Visitas',    costLabel: 'Custo/Visita' },
  video:         { label: 'Vídeo',          Icon: Zap,           color: '#7C3AED', bg: '#F5F3FF', primaryLabel: 'ThruPlays', costLabel: 'Custo/View' },
  awareness:     { label: 'Alcance',        Icon: Radio,         color: '#EA580C', bg: '#FFEDD5', primaryLabel: 'Alcance',   costLabel: 'CPM' },
  conversion:    { label: 'Conversão',      Icon: TrendingUp,    color: '#4040E8', bg: '#EEF2FF', primaryLabel: 'Conversões', costLabel: 'CPL' },
} as const;

// ── Visão Geral ───────────────────────────────────────────────────────────────
function OverviewTab({ client, metrics, campaigns, reports, alerts }: {
  client: Client; metrics: Metric[]; campaigns: Campaign[];
  reports: Report[]; alerts: Alert[];
}) {
  const today = new Date();
  const since30 = new Date(today); since30.setDate(today.getDate() - 30);
  const last30 = metrics.filter(m => new Date(m.date) >= since30);

  const spend       = last30.reduce((s, m) => s + m.spend, 0);
  const impressions = last30.reduce((s, m) => s + m.impressions, 0);
  const reach       = last30.reduce((s, m) => s + (m.reach ?? 0), 0);
  const frequency   = reach > 0 ? impressions / reach : 0;

  const budgetPct = client.monthly_budget > 0 ? Math.min((spend / client.monthly_budget) * 100, 100) : 0;
  const budgetColor = budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#FF4D00' : '#4040E8';
  const activeAlerts = alerts.filter(a => !a.resolved);
  const csvReports = reports.filter(r => r.type === 'csv_analysis').slice(0, 4);

  // Pull campaigns from latest CSV report content_json — this is always up-to-date
  type CsvCamp = {
    name: string; spend: number; conversions: number;
    resultType?: string | null; reach?: number; impressions?: number;
    objective?: string | null; status?: string; clicks?: number; budget?: number;
  };
  const latestCsvContent = (csvReports[0]?.content_json as { campaigns?: CsvCamp[]; resultType?: string | null } | null);
  const csvCamps = latestCsvContent?.campaigns ?? [];
  const csvCampMap = new Map<string, CsvCamp>(csvCamps.map(c => [c.name, c]));

  // Enrich DB campaigns with result_type from CSV
  const enrichedDb = (campaigns as CampExt[]).map(c => ({
    ...c,
    result_type: c.result_type ?? csvCampMap.get(c.name)?.resultType ?? null,
  }));

  // Build merged list: DB campaigns enriched, PLUS any CSV camp not yet in DB
  const dbNames = new Set(enrichedDb.map(c => c.name));
  const csvOnlyAsExt: CampExt[] = csvCamps
    .filter(c => !dbNames.has(c.name) && (c.spend ?? 0) > 0)
    .map(c => ({
      id: `csv-${c.name}`,
      client_id: client.id,
      meta_campaign_id: null,
      name: c.name,
      objective: c.objective ?? null,
      status: 'INACTIVE' as const,
      budget: c.budget ?? 0,
      impressions: c.impressions ?? 0,
      clicks: c.clicks ?? 0,
      ctr: 0, cpc: 0,
      conversions: c.conversions ?? 0,
      spend: c.spend ?? 0,
      reach: c.reach ?? 0,
      updated_at: '', created_at: '',
      result_type: c.resultType ?? null,
    }));

  // Also update spend on DB campaigns that have spend=0 but CSV has spend>0
  const enrichedCampaigns = enrichedDb.map(c => {
    const csv = csvCampMap.get(c.name);
    return c.spend > 0 ? c : { ...c, spend: csv?.spend ?? 0, conversions: c.conversions > 0 ? c.conversions : (csv?.conversions ?? 0), impressions: c.impressions > 0 ? c.impressions : (csv?.impressions ?? 0), reach: c.reach > 0 ? c.reach : (csv?.reach ?? 0) };
  });

  const allCampaigns = [...enrichedCampaigns, ...csvOnlyAsExt];

  // Show campaigns with spend > 0
  const activeCampaigns = allCampaigns.filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend);

  const msgCamps2   = allCampaigns.filter(c => detectObjective(c) === 'messaging');
  const visitCamps2 = allCampaigns.filter(c => detectObjective(c) === 'profile_visit');
  const totalMensagens2 = msgCamps2.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const totalVisitas2   = visitCamps2.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const custoMensagem2  = totalMensagens2 > 0 ? msgCamps2.reduce((s, c) => s + c.spend, 0) / totalMensagens2 : 0;
  const custoVisita2    = totalVisitas2 > 0   ? visitCamps2.reduce((s, c) => s + c.spend, 0) / totalVisitas2 : 0;

  const kpis = [
    { label: 'Investimento (30d)',  value: formatCurrency(spend),                                         color: '#4040E8' },
    { label: 'Alcance',             value: formatNumber(reach),                                            color: '#7C3AED' },
    { label: 'Mensagens Iniciadas', value: totalMensagens2 > 0 ? formatNumber(totalMensagens2) : '—',     color: '#16A34A' },
    { label: 'Visitas ao Perfil',   value: totalVisitas2 > 0   ? formatNumber(totalVisitas2)   : '—',     color: '#EA580C' },
    { label: 'Custo / Mensagem',    value: custoMensagem2 > 0  ? formatCurrency(custoMensagem2) : '—',    color: '#0891B2' },
    { label: 'Custo / Visita',      value: custoVisita2 > 0    ? formatCurrency(custoVisita2)   : '—',    color: '#DB2777' },
    { label: 'Impressões',          value: formatNumber(impressions),                                      color: '#92400E' },
    { label: 'Frequência',          value: frequency > 0 ? frequency.toFixed(2) + 'x' : '—',             color: '#065F46' },
  ];

  return (
    <div className="space-y-5">

      {/* Context strip */}
      <div className="card p-4 flex flex-wrap items-center gap-6 bg-gradient-to-r from-[#4040E8]/5 to-transparent border border-[#4040E8]/10">
        <div className="flex-1 min-w-[160px]">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Orçamento mensal</p>
          {client.monthly_budget > 0 ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{formatCurrency(spend)} gastos</span>
                <span className="text-xs font-bold" style={{ color: budgetColor }}>{budgetPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, background: `linear-gradient(90deg,${budgetColor},${budgetColor}99)` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Limite {formatCurrency(client.monthly_budget)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sem limite definido</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#4040E8]">{activeCampaigns.length}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Campanhas</p>
        </div>
        {activeAlerts.length > 0 && (
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{activeAlerts.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Alerta{activeAlerts.length > 1 ? 's' : ''}</p>
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{client.segment ?? '—'}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Segmento</p>
        </div>
        {client.since_date && (
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">
              {new Date(client.since_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cliente desde</p>
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="card p-4 border-l-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ borderLeftColor: k.color }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight mb-2">{k.label}</p>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: campaigns */}
        <div className="col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Campanhas</h3>
              <span className="text-xs text-gray-400">{activeCampaigns.length} com investimento</span>
            </div>
            {activeCampaigns.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Nenhuma campanha ativa no momento.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeCampaigns.slice(0, 6).map((c, i) => {
                  const meta = OBJ_META[detectObjective(c)];
                  const cpl = c.conversions > 0 ? c.spend / c.conversions : 0;
                  const costDisplay = detectObjective(c) === 'awareness'
                    ? (c.impressions > 0 ? formatCurrency((c.spend / c.impressions) * 1000) + ' CPM' : '—')
                    : cpl > 0 ? formatCurrency(cpl) : '—';
                  const primaryVal = detectObjective(c) === 'awareness'
                    ? formatNumber(c.reach)
                    : c.conversions > 0 ? formatNumber(c.conversions) : '—';
                  const maxSpend = activeCampaigns[0]?.spend ?? 1;
                  return (
                    <div key={c.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-300 shrink-0 w-4">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-800 leading-snug">{c.name}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5" style={{ color: meta.color, background: meta.bg }}>
                              <meta.Icon className="w-2.5 h-2.5" />
                              {meta.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-gray-900">{formatCurrency(c.spend)}</p>
                          <p className="text-[10px] text-gray-400">{primaryVal} {meta.primaryLabel.toLowerCase()} · {costDisplay}</p>
                        </div>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.spend / maxSpend) * 100}%`, background: meta.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: alerts + reports */}
        <div className="space-y-4">
          {activeAlerts.length > 0 && (
            <div className="card overflow-hidden border border-red-100">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-red-500" />
                <h3 className="text-xs font-semibold text-red-700">{activeAlerts.length} Alerta{activeAlerts.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {activeAlerts.slice(0, 3).map(a => (
                  <div key={a.id} className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-800">{a.metric}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{a.message ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900">Relatórios CSV</h3>
              <span className="text-[10px] text-gray-400">{csvReports.length === 0 ? 'nenhum' : `${csvReports.length} recentes`}</span>
            </div>
            {csvReports.length === 0 ? (
              <p className="px-4 py-5 text-xs text-gray-400 text-center">Use a aba <strong>Análise CSV</strong> para subir e publicar.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {csvReports.map(r => {
                  const content = r.content_json as { periodLabel?: string } | null;
                  const label = content?.periodLabel
                    ?? (r.period_start && r.period_end
                      ? `${new Date(r.period_start + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })} → ${new Date(r.period_end + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`
                      : getPeriodLabel(r.type));
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{label}</p>
                        <span className={`text-[10px] font-semibold ${r.visible_to_client ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {r.visible_to_client ? '● Publicado' : '○ Rascunho'}
                        </span>
                      </div>
                      <a href={`/api/reports/html/${r.id}`} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-[10px] text-[#4040E8] hover:underline font-semibold">
                        <ExternalLink className="w-3 h-3" /> Ver
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Semanal ───────────────────────────────────────────────────────────────────
function WeeklyTab({ client, metrics, campaigns, reports }: {
  client: Client; metrics: Metric[]; campaigns: Campaign[];
  reports: Report[];
}) {
  // Current week bounds (Mon → Sun)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today); weekStart.setDate(today.getDate() + diffToMon); weekStart.setHours(0, 0, 0, 0);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const weekLabel = `${fmtDate(weekStart)} → ${fmtDate(weekEnd)}`;

  // Weekly metrics from daily data
  const weekMetrics = metrics.filter(m => new Date(m.date) >= weekStart);
  const wSpend       = weekMetrics.reduce((s, m) => s + m.spend, 0);
  const wImpressions = weekMetrics.reduce((s, m) => s + m.impressions, 0);
  const wReach       = weekMetrics.reduce((s, m) => s + (m.reach ?? 0), 0);
  const wConversions = weekMetrics.reduce((s, m) => s + m.conversions, 0);
  const wFrequency   = wReach > 0 ? wImpressions / wReach : 0;
  const wCpl         = wConversions > 0 ? wSpend / wConversions : 0;
  const wCpm         = wImpressions > 0 ? (wSpend / wImpressions) * 1000 : 0;

  // Pull campaigns from latest CSV report content_json (same approach as OverviewTab)
  type WCsvCamp = { name: string; spend: number; conversions: number; resultType?: string | null; reach?: number; impressions?: number; objective?: string | null; status?: string; clicks?: number; budget?: number };
  const latestWCsv = reports.find(r => r.type === 'csv_analysis');
  const wCsvCamps = ((latestWCsv?.content_json as { campaigns?: WCsvCamp[] } | null)?.campaigns ?? []);
  const wCsvMap = new Map<string, WCsvCamp>(wCsvCamps.map(c => [c.name, c]));

  const enrichedDbW = (campaigns as CampExt[]).map(c => {
    const csv = wCsvMap.get(c.name);
    const spend = c.spend > 0 ? c.spend : (csv?.spend ?? 0);
    return { ...c, spend, result_type: c.result_type ?? csv?.resultType ?? null, conversions: c.conversions > 0 ? c.conversions : (csv?.conversions ?? 0), impressions: c.impressions > 0 ? c.impressions : (csv?.impressions ?? 0), reach: c.reach > 0 ? c.reach : (csv?.reach ?? 0) };
  });
  const wDbNames = new Set(enrichedDbW.map(c => c.name));
  const wCsvOnly: CampExt[] = wCsvCamps
    .filter(c => !wDbNames.has(c.name) && (c.spend ?? 0) > 0)
    .map(c => ({ id: `csv-${c.name}`, client_id: client.id, meta_campaign_id: null, name: c.name, objective: c.objective ?? null, status: 'INACTIVE' as const, budget: c.budget ?? 0, impressions: c.impressions ?? 0, clicks: c.clicks ?? 0, ctr: 0, cpc: 0, conversions: c.conversions ?? 0, spend: c.spend ?? 0, reach: c.reach ?? 0, updated_at: '', created_at: '', result_type: c.resultType ?? null }));

  const activeCamps = [...enrichedDbW, ...wCsvOnly].filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend);
  const maxSpend = activeCamps[0]?.spend ?? 1;

  // Latest CSV report for context
  const latestCsv = reports.find(r => r.type === 'csv_analysis');
  const csvContent = latestCsv?.content_json as { globalResultType?: string; totalSpend?: number; numDays?: number } | undefined;
  const csvResultType = csvContent?.globalResultType ?? null;

  // Micro vitórias
  const victories: string[] = [];
  if (wSpend > 0 && wCpl > 0 && wCpl < 10) victories.push(`Custo por resultado baixo: ${formatCurrency(wCpl)}`);
  if (wFrequency > 0 && wFrequency < 2) victories.push(`Frequência saudável: ${wFrequency.toFixed(2)}x — audiência renovada`);
  if (activeCamps.length > 0) victories.push(`${activeCamps.length} campanha${activeCamps.length > 1 ? 's' : ''} ativa${activeCamps.length > 1 ? 's' : ''} em veiculação`);

  return (
    <div className="space-y-5">

      {/* Week header */}
      <div className="card p-5 bg-gradient-to-r from-[#4040E8]/5 to-transparent border border-[#4040E8]/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Período Semanal</p>
          <p className="text-xl font-bold text-gray-900">{weekLabel}</p>
          <p className="text-xs text-gray-500 mt-1">
            {weekMetrics.length > 0 ? `${weekMetrics.length} dia${weekMetrics.length > 1 ? 's' : ''} com dados` : 'Sem dados ainda para esta semana'}
          </p>
        </div>
        {wSpend > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Investido na semana</p>
            <p className="text-2xl font-bold text-[#4040E8]">{formatCurrency(wSpend)}</p>
          </div>
        )}
      </div>

      {/* Weekly KPIs */}
      {weekMetrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Investimento',  value: formatCurrency(wSpend),                               color: '#4040E8' },
            { label: 'Alcance',       value: formatNumber(wReach),                                  color: '#7C3AED' },
            { label: 'Impressões',    value: formatNumber(wImpressions),                            color: '#0891B2' },
            { label: 'Frequência',    value: wFrequency > 0 ? wFrequency.toFixed(2) + 'x' : '—',   color: '#EA580C' },
            { label: 'Conversões',    value: wConversions > 0 ? formatNumber(wConversions) : '—',  color: '#16A34A' },
            { label: 'Custo/Result.', value: wCpl > 0 ? formatCurrency(wCpl) : '—',               color: '#DB2777' },
            { label: 'CPM',           value: wCpm > 0 ? formatCurrency(wCpm) : '—',               color: '#92400E' },
            { label: 'Dias c/ dados', value: String(weekMetrics.length),                            color: '#065F46' },
          ].map(k => (
            <div key={k.label} className="card p-4 border-l-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ borderLeftColor: k.color }}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight mb-2">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Campaign cards — 2/3 col */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Campanhas</h3>
            <span className="text-xs text-gray-400">{activeCamps.length} com investimento</span>
          </div>

          {activeCamps.length === 0 ? (
            <div className="card px-5 py-8 text-sm text-gray-400 text-center">
              Nenhuma campanha ativa no momento.
            </div>
          ) : (
            activeCamps.map((c, i) => {
              const obj  = detectObjective(c);
              const meta = OBJ_META[obj];
              const cpl  = c.conversions > 0 ? c.spend / c.conversions : 0;
              const primaryVal = obj === 'awareness'
                ? `${formatNumber(c.reach)} alcançados`
                : c.conversions > 0 ? `${formatNumber(c.conversions)} ${meta.primaryLabel.toLowerCase()}` : '— ' + meta.primaryLabel.toLowerCase();
              const costVal = obj === 'awareness'
                ? (c.impressions > 0 ? formatCurrency((c.spend / c.impressions) * 1000) + ' CPM' : '—')
                : cpl > 0 ? `${formatCurrency(cpl)} ${meta.costLabel}` : '—';

              return (
                <div key={c.id} className="card p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-bold text-gray-300 shrink-0">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{c.name}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1" style={{ color: meta.color, background: meta.bg }}>
                          <meta.Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(c.spend)}</p>
                      <p className="text-[10px] text-gray-400">investido</p>
                    </div>
                  </div>
                  {/* Primary metric highlight */}
                  <div className="rounded-xl p-3 mb-3" style={{ background: meta.bg }}>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>{meta.primaryLabel} · Resultado Principal</p>
                    <div className="flex items-baseline justify-between">
                      <p className="text-lg font-bold" style={{ color: meta.color }}>{primaryVal}</p>
                      <p className="text-xs font-semibold text-gray-600">{costVal}</p>
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${(c.spend / maxSpend) * 100}%`, background: meta.color }} />
                  </div>
                  {/* Secondary metrics */}
                  <div className="flex gap-4 text-[10px] text-gray-400">
                    <span>{formatNumber(c.impressions)} imp.</span>
                    <span>{formatNumber(c.reach)} alcance</span>
                    {c.budget > 0 && <span>{formatCurrency(c.budget)} orçamento</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: micro vitórias + contexto */}
        <div className="space-y-4">
          {victories.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50">
                <h3 className="text-xs font-semibold text-emerald-700">✓ Micro vitórias da semana</h3>
              </div>
              <ul className="divide-y divide-gray-50">
                {victories.map((v, i) => (
                  <li key={i} className="px-4 py-2.5 text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {latestCsv && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900">Último relatório CSV</h3>
              </div>
              <div className="px-4 py-3 space-y-2 text-xs">
                {latestCsv.period_start && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Período</span>
                    <span className="font-medium text-gray-800">
                      {new Date(latestCsv.period_start + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {csvContent?.totalSpend && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total investido</span>
                    <span className="font-medium text-gray-800">{formatCurrency(Number(csvContent.totalSpend))}</span>
                  </div>
                )}
                {csvResultType && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo de resultado</span>
                    <span className="font-medium text-gray-800">{getResultLabel(csvResultType)}</span>
                  </div>
                )}
                <a href={`/api/reports/html/${latestCsv.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#4040E8] hover:underline font-semibold mt-1">
                  <ExternalLink className="w-3 h-3" /> Abrir relatório
                </a>
              </div>
            </div>
          )}

          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-900 mb-3">Resumo executivo</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {activeCamps.length === 0
                ? 'Nenhuma campanha ativa nesta semana. Verifique o status das campanhas no gerenciador.'
                : wSpend > 0
                  ? `Nesta semana foram investidos ${formatCurrency(wSpend)} distribuídos em ${activeCamps.length} campanha${activeCamps.length > 1 ? 's' : ''} ativa${activeCamps.length > 1 ? 's' : ''}. ${wFrequency > 2.5 ? 'Frequência elevada — considere expandir o público.' : 'Frequência dentro do esperado.'}`
                  : `${activeCamps.length} campanha${activeCamps.length > 1 ? 's' : ''} ativa${activeCamps.length > 1 ? 's' : ''} — aguardando sincronização de dados desta semana.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ReportsMgmtTab ────────────────────────────────────────────────────────────
function ReportsMgmtTab({ reports, clientId: _clientId }: { reports: Report[]; clientId: string }) {
  const router = useRouter();
  const csvReports = reports
    .filter((r) => r.type === 'csv_analysis')
    .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

  const [editNames, setEditNames] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of csvReports) {
      const cj = r.content_json as { display_name?: string } | null;
      init[r.id] = cj?.display_name ?? '';
    }
    return init;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  async function patchReport(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function handleSaveName(id: string) {
    setSaving(id);
    await patchReport(id, { display_name: editNames[id] });
    setSaving(null);
    setSaved((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [id]: false })), 2000);
  }

  async function handlePublish(id: string, publish: boolean) {
    await patchReport(id, { visible_to_client: publish });
    router.refresh();
    window.location.reload();
  }

  function monthLabelAdmin(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function fmtShort(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  if (csvReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-400">Nenhum relatório CSV gerado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {csvReports.map((r) => {
        const cj = r.content_json as { display_name?: string; numDays?: number; totalSpend?: number } | null;
        const numDays = cj?.numDays ?? 30;
        const periodTypeStr = numDays <= 7 ? 'Semanal' : numDays <= 16 ? 'Quinzenal' : 'Mensal';
        const isPublished = r.visible_to_client === true;

        return (
          <div key={r.id} className="card p-5 border border-gray-200">
            <div className="flex flex-col gap-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#111827', textTransform: 'capitalize' as const }}>
                    {monthLabelAdmin(r.period_start)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {fmtShort(r.period_start)} → {fmtShort(r.period_end)} · {periodTypeStr} ({numDays} dias)
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={isPublished
                    ? { color: '#16A34A', background: '#DCFCE7' }
                    : { color: '#6B7280', background: '#F3F4F6' }
                  }
                >
                  {isPublished ? '● Publicado' : '○ Rascunho'}
                </span>
              </div>

              {/* Display name editor */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNames[r.id] ?? ''}
                  onChange={(e) => setEditNames((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Nome de exibição (opcional)"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-[#4040E8]"
                />
                <button
                  onClick={() => handleSaveName(r.id)}
                  disabled={saving === r.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {saving === r.id ? 'Salvando…' : saved[r.id] ? '✓ Salvo' : 'Salvar'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`/api/reports/html/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#4040E8] hover:underline flex items-center gap-1"
                >
                  Ver relatório ↗
                </a>
                <span className="text-gray-200">|</span>
                {isPublished ? (
                  <button
                    onClick={() => handlePublish(r.id, false)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Despublicar
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublish(r.id, true)}
                    className="text-xs font-medium text-green-600 hover:underline"
                  >
                    Publicar
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PreviewTab ────────────────────────────────────────────────────────────────
function PreviewTab({ reports }: { reports: Report[] }) {
  const csvReports = reports
    .filter((r) => r.type === 'csv_analysis')
    .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

  const [selectedId, setSelectedId] = useState(csvReports[0]?.id ?? '');

  if (csvReports.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ fontSize: 48 }}>📊</div>
        <p style={{ fontSize: 14, color: '#8B8B99' }}>Nenhum relatório disponível.</p>
        <p style={{ fontSize: 12, color: '#52525B', textAlign: 'center', maxWidth: 320 }}>
          Gere um relatório na aba <strong style={{ color: '#C9A84C' }}>Análise CSV</strong> para visualizá-lo aqui.
        </p>
      </div>
    );
  }

  function monthLabelAdmin(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  return (
    <div>
      {/* Report selector bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 24px',
        borderBottom: '1px solid #26262D',
        background: '#111115',
      }}>
        <label style={{ fontSize: 11, color: '#8B8B99', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
          Relatório:
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            fontSize: 13,
            border: '1px solid #32323C',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#EDEDF2',
            background: '#1C1C21',
            outline: 'none',
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {csvReports.map((r) => (
            <option key={r.id} value={r.id} style={{ textTransform: 'capitalize' }}>
              {monthLabelAdmin(r.period_start)}
            </option>
          ))}
        </select>
        {selectedId && (
          <a
            href={`/api/reports/html/${selectedId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#C9A84C', textDecoration: 'none', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Abrir em nova aba ↗
          </a>
        )}
      </div>
      {/* Full-height iframe */}
      {selectedId && (
        <iframe
          src={`/api/reports/html/${selectedId}`}
          style={{ width: '100%', height: 'calc(100vh - 180px)', border: 'none', display: 'block' }}
          title="Relatório de performance"
        />
      )}
    </div>
  );
}

