'use client';

import { useState } from 'react';
import type { Client, Metric, Campaign, Report, Alert, Goal, MonthlyPlan } from '@/types';
import { formatCurrency, formatNumber, formatPercent, formatDate, getPeriodLabel, getResultLabel, getCostPerResultLabel } from '@/lib/utils';
import {
  BarChart2, Calendar, Bell,
  FileSpreadsheet, ShieldCheck, Settings, ExternalLink,
} from 'lucide-react';
import { CSVAnalysisTab } from '@/components/admin/CSVAnalysisTab';
import { MonthlyPlanTab } from '@/components/admin/MonthlyPlanTab';
import { PermissionsTab } from '@/components/admin/PermissionsTab';
import { EditClientTab } from '@/components/admin/EditClientTab';

export interface PlanPrefill {
  objective: string;
  totalBudget: string;
  campaigns: Array<{ id: string; name: string; objective: string; budget: string; period: string; notes: string }>;
  strategies: string;
  goals: { roas: string; maxCpc: string; minCtr: string; conversions: string };
  notes: string;
}

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
  { id: 'csv', label: 'Análise CSV', icon: FileSpreadsheet },
  { id: 'plan', label: 'Planejamento', icon: Calendar },
  { id: 'permissions', label: 'Permissões', icon: ShieldCheck },
  { id: 'edit', label: 'Editar', icon: Settings },
];

interface Props {
  client: Client;
  metrics: Metric[];
  campaigns: Campaign[];
  reports: Report[];
  alerts: Alert[];
  goals: Goal[];
  plans: MonthlyPlan[];
}


export function ClientTabsSection({ client, metrics, campaigns, reports, alerts, goals, plans }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'border-[#4040E8] text-[#4040E8]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab client={client} metrics={metrics} campaigns={campaigns} reports={reports} alerts={alerts} />
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

      {activeTab === 'permissions' && (
        <PermissionsTab client={client} />
      )}

      {activeTab === 'edit' && (
        <EditClientTab client={client} />
      )}
    </div>
  );
}

// ───────── REPORT TAB ─────────
// ── Visão Geral ──────────────────────────────────────────────────────────────
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

  // Split campaigns by objective using result_type from DB
  type CampExt = Campaign & { result_type?: string };
  const isMsg   = (c: CampExt) => String(c.result_type ?? '').toLowerCase().includes('messaging') || String(c.result_type ?? '').toLowerCase().includes('message');
  const isVisit = (c: CampExt) => String(c.result_type ?? '').toLowerCase().includes('profile_visit') || String(c.result_type ?? '').toLowerCase().includes('profile visit') || (!isMsg(c) && String(c.name ?? '').toLowerCase().includes('perfil'));

  const msgCamps   = (campaigns as CampExt[]).filter(isMsg);
  const visitCamps = (campaigns as CampExt[]).filter(isVisit);

  const totalMensagens  = msgCamps.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const totalVisitas    = visitCamps.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const spendMensagens  = msgCamps.reduce((s, c) => s + (c.spend ?? 0), 0);
  const spendVisitas    = visitCamps.reduce((s, c) => s + (c.spend ?? 0), 0);
  const custoMensagem   = totalMensagens > 0 ? spendMensagens / totalMensagens : 0;
  const custoVisita     = totalVisitas > 0 ? spendVisitas / totalVisitas : 0;

  const budgetPct = client.monthly_budget > 0 ? Math.min((spend / client.monthly_budget) * 100, 100) : 0;
  const activeCampaigns = [...campaigns].filter(c => c.status === 'ACTIVE').sort((a, b) => b.spend - a.spend);
  const latestCsvReport = reports.find(r => r.type === 'csv_analysis');
  const csvResultType = (latestCsvReport?.content_json as { resultType?: string } | undefined)?.resultType ?? null;
  const activeAlerts = alerts.filter(a => !a.resolved);
  const recentReports = reports.slice(0, 4);
  const csvReports = reports.filter(r => r.type === 'csv_analysis').slice(0, 3);

  const kpis = [
    { label: 'Investimento (30d)',  value: formatCurrency(spend),                                          color: '#4040E8', bg: '#EEF2FF' },
    { label: 'Alcance',             value: formatNumber(reach),                                             color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Mensagens Iniciadas', value: totalMensagens > 0 ? formatNumber(totalMensagens) : '—',        color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Visitas ao Perfil',   value: totalVisitas > 0 ? formatNumber(totalVisitas) : '—',            color: '#EA580C', bg: '#FFEDD5' },
    { label: 'Custo/Mensagem',      value: custoMensagem > 0 ? formatCurrency(custoMensagem) : '—',        color: '#0891B2', bg: '#CFFAFE' },
    { label: 'Custo/Visita',        value: custoVisita > 0 ? formatCurrency(custoVisita) : '—',            color: '#DB2777', bg: '#FCE7F3' },
    { label: 'Impressões',          value: formatNumber(impressions),                                       color: '#92400E', bg: '#FEF3C7' },
    { label: 'Frequência',          value: frequency > 0 ? frequency.toFixed(2) + 'x' : '—',              color: '#065F46', bg: '#D1FAE5' },
  ];

  return (
    <div className="space-y-5">

      {/* KPI cards — colored left border */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="card p-4 border-l-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ borderLeftColor: k.color }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight mb-2">{k.label}</p>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Relatórios Publicados (CSV) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Relatórios Publicados</h3>
          <span className="text-xs text-gray-400">{csvReports.length === 0 ? 'Nenhum ainda' : `${csvReports.length} mais recente${csvReports.length > 1 ? 's' : ''}`}</span>
        </div>
        {csvReports.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            Nenhum relatório CSV publicado ainda. Use a aba <strong>Análise CSV</strong> para subir e publicar.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {csvReports.map(r => {
              const content = r.content_json as { periodLabel?: string; period_start?: string; period_end?: string } | null;
              const periodLabel = content?.periodLabel
                ?? (r.period_start && r.period_end
                  ? `${new Date(r.period_start + 'T12:00:00').toLocaleDateString('pt-BR')} — ${new Date(r.period_end + 'T12:00:00').toLocaleDateString('pt-BR')}`
                  : getPeriodLabel(r.type));
              return (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{periodLabel}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.visible_to_client ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.visible_to_client ? 'Publicado' : 'Rascunho'}
                    </span>
                    <a
                      href={`/api/reports/html/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#4040E8] hover:underline font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* Left col: budget + campaigns */}
        <div className="col-span-2 space-y-4">

          {/* Budget */}
          {client.monthly_budget > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Orçamento Mensal</h3>
                <span className="text-xs font-bold" style={{ color: budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#FF4D00' : '#4040E8' }}>
                  {budgetPct.toFixed(0)}% utilizado
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{formatCurrency(spend)} gasto</span>
                <span>limite: {formatCurrency(client.monthly_budget)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${budgetPct}%`,
                    background: budgetPct > 90
                      ? 'linear-gradient(90deg,#EF4444,#DC2626)'
                      : budgetPct > 70
                      ? 'linear-gradient(90deg,#FF4D00,#EA580C)'
                      : 'linear-gradient(90deg,#4040E8,#7C3AED)',
                  }} />
              </div>
            </div>
          )}

          {/* Active campaigns */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Campanhas Ativas</h3>
              <span className="text-xs text-gray-400">{activeCampaigns.length} em veiculação</span>
            </div>
            {activeCampaigns.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma campanha ativa no momento.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeCampaigns.slice(0, 5).map((c, i) => {
                  const cpl = c.conversions > 0 ? c.spend / c.conversions : 0;
                  const maxSpend = activeCampaigns[0]?.spend ?? 1;
                  const barPct = (c.spend / maxSpend) * 100;
                  return (
                    <div key={c.id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-400 shrink-0">#{i + 1}</span>
                          <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                          {c.objective && <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">{c.objective}</span>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-[11px] text-gray-500">{c.conversions} {getResultLabel(csvResultType).toLowerCase()}</span>
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(c.spend)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#4040E8] to-[#7C3AED]" style={{ width: `${barPct}%` }} />
                      </div>
                      <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
                        <span>{formatNumber(c.impressions)} imp.</span>
                        <span>{formatPercent(c.ctr)} CTR</span>
                        <span>{cpl > 0 ? formatCurrency(cpl) + ' ' + getCostPerResultLabel(csvResultType).toLowerCase() : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right col: alerts + recent reports */}
        <div className="space-y-4">

          {/* Alerts */}
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

          {/* Recent reports */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900">Relatórios Recentes</h3>
            </div>
            {recentReports.length === 0 ? (
              <p className="px-4 py-5 text-xs text-gray-400 text-center">Nenhum relatório gerado ainda.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentReports.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{getPeriodLabel(r.type)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(r.created_at)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.visible_to_client ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.visible_to_client ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick info */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-900">Informações</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Segmento</span>
                <span className="font-medium text-gray-800">{client.segment ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Desde</span>
                <span className="font-medium text-gray-800">
                  {client.since_date ? new Date(client.since_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-bold ${client.active ? 'text-emerald-600' : 'text-yellow-600'}`}>
                  {client.active ? 'Ativo' : 'Pausado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Campanhas</span>
                <span className="font-medium text-gray-800">{campaigns.length} total · {activeCampaigns.length} ativas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

