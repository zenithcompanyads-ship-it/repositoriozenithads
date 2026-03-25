'use client';

import { useState } from 'react';
import type { Client, Metric, Campaign, Report, Alert, Goal, MonthlyPlan } from '@/types';
import { MetricsChart } from '@/components/ui/MetricsChart';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency, formatNumber, formatPercent, formatDate, getStatusColor, getStatusLabel, getPeriodLabel, getResultLabel, getCostPerResultLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  BarChart2, Calendar, Target, Bell, History, FileEdit,
  Megaphone, CheckCircle, Send, Loader2, Plus, Trash2, Eye,
  FileSpreadsheet, ShieldCheck, Settings, TrendingUp, MousePointer, Users, DollarSign,
} from 'lucide-react';
import { Eye as EyeIcon } from 'lucide-react';
import { CSVAnalysisTab } from '@/components/admin/CSVAnalysisTab';
import { MonthlyPlanTab } from '@/components/admin/MonthlyPlanTab';
import { PermissionsTab } from '@/components/admin/PermissionsTab';
import { EditClientTab } from '@/components/admin/EditClientTab';
import { MonthlyLeadsChart } from '@/components/admin/MonthlyLeadsChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export interface PlanPrefill {
  objective: string;
  totalBudget: string;
  campaigns: Array<{ id: string; name: string; objective: string; budget: string; period: string; notes: string }>;
  strategies: string;
  goals: { roas: string; maxCpc: string; minCtr: string; conversions: string };
  notes: string;
}

const TABS = [
  { id: 'weekly', label: 'Semanal', icon: BarChart2 },
  { id: 'biweekly', label: 'Quinzenal', icon: BarChart2 },
  { id: 'monthly', label: 'Mensal', icon: BarChart2 },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
  { id: 'csv', label: 'Análise CSV', icon: FileSpreadsheet },
  { id: 'plan', label: 'Planejamento', icon: Calendar },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'editor', label: 'Editor', icon: FileEdit },
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
  const [activeTab, setActiveTab] = useState('weekly');
  const { toast } = useToast();

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
      {(activeTab === 'weekly' || activeTab === 'biweekly' || activeTab === 'monthly') && (
        <ReportTab
          client={client}
          metrics={metrics}
          campaigns={campaigns}
          reports={reports}
          type={activeTab as 'weekly' | 'biweekly' | 'monthly'}
          toast={toast}
        />
      )}

      {activeTab === 'campaigns' && (
        <CampaignsTab campaigns={campaigns} />
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

      {activeTab === 'goals' && (
        <GoalsTab goals={goals} clientId={client.id} metrics={metrics} toast={toast} />
      )}

      {activeTab === 'history' && (
        <HistoryTab metrics={metrics} />
      )}

      {activeTab === 'alerts' && (
        <AlertsTab alerts={alerts} toast={toast} />
      )}

      {activeTab === 'editor' && (
        <EditorTab reports={reports} toast={toast} />
      )}

      {activeTab === 'permissions' && (
        <PermissionsTab client={client} />
      )}
    </div>
  );
}

// ───────── REPORT TAB ─────────
function ReportTab({
  client,
  metrics,
  campaigns,
  reports,
  type,
  toast,
}: {
  client: Client;
  metrics: Metric[];
  campaigns: Campaign[];
  reports: Report[];
  type: 'weekly' | 'biweekly' | 'monthly';
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [generating, setGenerating] = useState(false);
  const typeReports = reports.filter((r) => r.type === type);
  const csvReports  = reports.filter((r) => r.type === 'csv_analysis');
  const latest = typeReports[0];

  const days = type === 'weekly' ? 7 : type === 'biweekly' ? 15 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const relevantMetrics = metrics.filter((m) => new Date(m.date) >= cutoff);

  const totalSpend       = relevantMetrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = relevantMetrics.reduce((s, m) => s + m.impressions, 0);
  const totalClicks      = relevantMetrics.reduce((s, m) => s + m.clicks, 0);
  const totalLeads       = relevantMetrics.reduce((s, m) => s + (m.conversions ?? 0), 0);
  const avgCtr  = relevantMetrics.length ? relevantMetrics.reduce((s, m) => s + m.ctr, 0) / relevantMetrics.length : 0;
  const cpl     = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const cpc     = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Get result type from latest CSV report (if any)
  const latestCsvReport = reports.find(r => r.type === 'csv_analysis');
  const csvResultType = (latestCsvReport?.content_json as { resultType?: string } | undefined)?.resultType ?? null;
  const resultColLabel    = getResultLabel(csvResultType);
  const costResultLabel   = getCostPerResultLabel(csvResultType);

  // Campaigns sorted by spend — for chart + table
  const sortedCampaigns = [...campaigns].sort((a, b) => b.spend - a.spend);
  const activeCampaigns = sortedCampaigns.filter((c) => c.status === 'ACTIVE');
  const barData = sortedCampaigns.slice(0, 8).map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 18) + '…' : c.name,
    fullName: c.name,
    spend: Math.round(c.spend * 100) / 100,
    conversions: c.conversions,
    status: c.status,
  }));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/claude/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, type }),
      });
      if (res.ok) toast('success', 'Relatório gerado! Recarregue a página para ver.');
      else toast('error', 'Erro ao gerar relatório.');
    } catch {
      toast('error', 'Erro ao conectar com a API.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── 6 KPI cards with colored border ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Impressões',    value: formatNumber(totalImpressions), color: '#4040E8' },
          { label: 'Cliques',       value: formatNumber(totalClicks),      color: '#22C55E' },
          { label: 'CTR',           value: formatPercent(avgCtr),          color: '#F59E0B' },
          { label: 'Resultados',    value: formatNumber(totalLeads),       color: '#A855F7' },
          { label: 'CPC',           value: cpc > 0 ? formatCurrency(cpc) : '—', color: '#EF4444' },
          { label: 'CPL',           value: cpl > 0 ? formatCurrency(cpl) : '—', color: '#4040E8' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3 border-l-4" style={{ borderLeftColor: color }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Investimento do mês com progresso ── */}
      {client.monthly_budget > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#4040E8]" />
              <span className="text-sm font-semibold text-gray-800">Investimento do Mês</span>
            </div>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(totalSpend)}</p>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>0%</span>
            <span className="font-semibold" style={{ color: totalSpend / client.monthly_budget > 0.9 ? '#EF4444' : totalSpend / client.monthly_budget > 0.7 ? '#FF4D00' : '#4040E8' }}>
              {Math.round((totalSpend / client.monthly_budget) * 100)}% utilizado
            </span>
            <span>de {formatCurrency(client.monthly_budget)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((totalSpend / client.monthly_budget) * 100, 100)}%`,
                backgroundColor: totalSpend / client.monthly_budget > 0.9 ? '#EF4444'
                  : totalSpend / client.monthly_budget > 0.7 ? '#FF4D00' : '#4040E8',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Spend per campaign (bar chart) ── */}
      {barData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Investimento por Campanha (R$)</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, barData.length * 38)}>
            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `R$${v}`} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#374151' }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number, _name: string, props) => [
                  `${formatCurrency(v)} · ${props.payload.conversions} resultados`,
                  props.payload.fullName,
                ]}
              />
              <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.status === 'ACTIVE' ? '#4040E8' : '#d1d5db'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-2">
            <span className="inline-block w-2.5 h-2.5 rounded bg-[#4040E8] mr-1 align-middle" />Ativa
            <span className="inline-block w-2.5 h-2.5 rounded bg-gray-300 ml-3 mr-1 align-middle" />Inativa
          </p>
        </div>
      )}

      {/* ── Campaigns table ── */}
      {campaigns.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Detalhamento de Campanhas</h3>
            <span className="text-xs text-gray-400">{campaigns.length} campanhas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Campanha', 'Status', 'Objetivo', 'Investido', 'Impressões', 'Cliques', 'CTR', 'CPC', resultColLabel, costResultLabel].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedCampaigns.map((c) => {
                  const camCpl = c.conversions > 0 ? c.spend / c.conversions : 0;
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50/60 ${c.status !== 'ACTIVE' ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[180px] truncate">{c.name}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(c.status)}`}>
                          {getStatusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[100px] truncate">{c.objective ?? '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{formatCurrency(c.spend)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{formatNumber(c.impressions)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{formatNumber(c.clicks)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{formatPercent(c.ctr)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{c.cpc > 0 ? formatCurrency(c.cpc) : '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700 font-medium">{formatNumber(c.conversions)}</td>
                      <td className="px-3 py-2.5 text-[#4040E8] font-semibold">{camCpl > 0 ? formatCurrency(camCpl) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-gray-700">Total</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-gray-900">{formatCurrency(totalSpend)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{formatNumber(totalImpressions)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{formatNumber(totalClicks)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{formatPercent(avgCtr)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{cpc > 0 ? formatCurrency(cpc) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{formatNumber(totalLeads)}</td>
                  <td className="px-3 py-2.5 text-xs font-bold text-[#4040E8]">{cpl > 0 ? formatCurrency(cpl) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Monthly leads chart (only for monthly tab) ── */}
      {type === 'monthly' && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolução de Leads</h3>
          <MonthlyLeadsChart clientId={client.id} initialMetrics={relevantMetrics} csvReports={csvReports} />
        </div>
      )}

      {/* ── AI Analysis ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Análise IA — {getPeriodLabel(type)}</h3>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary text-xs py-1.5">
            {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</> : <><Send className="w-3.5 h-3.5" /> Gerar novo</>}
          </button>
        </div>
        {latest ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">Gerado em {formatDate(latest.created_at)}</span>
              {latest.visible_to_client
                ? <span className="badge-active text-[10px]">Publicado</span>
                : <span className="badge-paused text-[10px]">Rascunho</span>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {latest.admin_edited_analysis ?? latest.claude_analysis ?? 'Sem análise disponível.'}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">
            Nenhum relatório gerado ainda. Clique em &ldquo;Gerar novo&rdquo; para criar.
          </p>
        )}
      </div>
    </div>
  );
}

// ───────── CAMPAIGNS TAB ─────────
function CampaignCard({ campaign, rank }: { campaign: Campaign; rank: number }) {
  const isActive = campaign.status === 'ACTIVE';
  const cpl = campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;
  const isHero = rank === 1 && isActive;

  // Determine primary metric based on objective
  const obj = (campaign.objective ?? '').toLowerCase();
  const isReach = obj.includes('reach') || obj.includes('alcance') || obj.includes('brand');
  const primaryValue = isReach ? campaign.reach : campaign.conversions;
  const primaryLabel = isReach ? 'Pessoas alcançadas' : 'Resultados';
  const primaryCost  = isReach
    ? (campaign.reach > 0 ? campaign.spend / campaign.reach : 0)
    : cpl;
  const primaryCostLabel = isReach ? 'Custo / alcance' : 'Custo / resultado';

  if (!isActive) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 opacity-60">
        <div className="flex items-start justify-between mb-2">
          <div>
            {campaign.objective && (
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{campaign.objective}</p>
            )}
            <p className="text-sm font-semibold text-gray-600">{campaign.name}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
            {getStatusLabel(campaign.status)}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Sem veiculação no período</p>
      </div>
    );
  }

  if (isHero) {
    return (
      <div className="rounded-xl border border-[#4040E8]/30 bg-gradient-to-br from-[#f8f8ff] to-white p-6 col-span-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#4040E8] mb-1">
              #{rank} · Maior investimento do período
            </p>
            {campaign.objective && (
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">{campaign.objective}</p>
            )}
            <h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativa
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-2">
          <div>
            <p className="text-2xl font-bold text-[#4040E8]">{formatNumber(primaryValue)}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{primaryLabel}</p>
          </div>
          {primaryCost > 0 && (
            <div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(primaryCost)}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{primaryCostLabel}</p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(campaign.spend)}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Investimento</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{formatNumber(campaign.impressions)}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Impressões</p>
          </div>
          {campaign.reach > 0 && (
            <div>
              <p className="text-2xl font-bold text-gray-800">{formatNumber(campaign.reach)}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Alcance</p>
            </div>
          )}
        </div>
        {(campaign.ctr > 0 || campaign.cpc > 0) && (
          <p className="text-xs text-gray-400 mt-4">
            CTR {formatPercent(campaign.ctr)} · CPC {formatCurrency(campaign.cpc)}
            {campaign.budget > 0 && ` · Orçamento ${formatCurrency(campaign.budget)}`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:border-[#4040E8]/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
            #{rank}{campaign.objective ? ` · ${campaign.objective}` : ''}
          </p>
          <h3 className="text-sm font-bold text-gray-900 truncate">{campaign.name}</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativa
        </span>
      </div>
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-lg font-bold text-[#4040E8]">{formatNumber(primaryValue)}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">{primaryLabel}</p>
        </div>
        {primaryCost > 0 && (
          <div>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(primaryCost)}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{primaryCostLabel}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        Investido {formatCurrency(campaign.spend)}
        {campaign.impressions > 0 && ` · Impressões ${formatNumber(campaign.impressions)}`}
        {campaign.reach > 0 && ` · Alcance ${formatNumber(campaign.reach)}`}
      </p>
    </div>
  );
}

function CampaignsTab({ campaigns }: { campaigns: Campaign[] }) {
  const sorted = [...campaigns].sort((a, b) => b.spend - a.spend);
  const active   = sorted.filter((c) => c.status === 'ACTIVE');
  const inactive = sorted.filter((c) => c.status !== 'ACTIVE');

  if (campaigns.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-400 text-sm">
        Nenhuma campanha encontrada. Importe um CSV para adicionar campanhas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active campaigns */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">
          Campanhas · Resultados Individuais
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {active.map((c, i) => (
            <CampaignCard key={c.id} campaign={c} rank={i + 1} />
          ))}
          {active.length === 0 && (
            <p className="text-sm text-gray-400 col-span-full">Nenhuma campanha ativa no momento.</p>
          )}
        </div>
      </div>

      {/* Inactive campaigns — compact */}
      {inactive.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">
            Sem veiculação / Pausadas ({inactive.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inactive.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} rank={active.length + i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── GOALS TAB ─────────
const METRICS = ['spend', 'ctr', 'cpc', 'roas', 'conversions', 'impressions', 'clicks'];

function GoalsTab({ goals, clientId, metrics, toast }: { goals: Goal[]; clientId: string; metrics: Metric[]; toast: ReturnType<typeof useToast>['toast'] }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ metric: 'ctr', target_value: '', period: 'monthly' });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...form, target_value: parseFloat(form.target_value) }),
      });
      if (res.ok) toast('success', 'Meta salva! Recarregue para ver.');
      else toast('error', 'Erro ao salvar meta.');
    } catch {
      toast('error', 'Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const latestMetrics = metrics[metrics.length - 1];

  return (
    <div className="space-y-5">
      {/* Add Goal */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Nova Meta</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Métrica</label>
            <select
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
            >
              {METRICS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor alvo</label>
            <input
              type="number"
              step="0.01"
              value={form.target_value}
              onChange={(e) => setForm({ ...form, target_value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 mt-3">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Adicionar meta
        </button>
      </div>

      {/* Goals List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Metas configuradas</h3>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma meta configurada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Métrica', 'Alvo', 'Período', 'Atual', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {goals.map((g) => {
                const current = latestMetrics ? (latestMetrics[g.metric as keyof Metric] as number) ?? 0 : 0;
                const ok = current >= g.target_value;
                return (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.metric.toUpperCase()}</td>
                    <td className="px-4 py-3 text-gray-700">{g.target_value}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{g.period}</td>
                    <td className="px-4 py-3 text-gray-700">{current.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {ok ? 'Atingida' : 'Abaixo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ───────── HISTORY TAB ─────────
function HistoryTab({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Histórico de métricas — 30 dias</h3>
        <MetricsChart metrics={metrics} fields={['spend', 'impressions', 'clicks']} height={300} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Dados diários</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Data', 'Invest.', 'Impressões', 'Cliques', 'CTR', 'CPC', 'CPM', 'ROAS', 'Conversões'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...metrics].reverse().map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{formatCurrency(m.spend)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{formatNumber(m.impressions)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{formatNumber(m.clicks)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{formatPercent(m.ctr)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{formatCurrency(m.cpc)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{formatCurrency(m.cpm)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{m.roas.toFixed(2)}x</td>
                  <td className="px-4 py-2.5 text-gray-700">{formatNumber(m.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ───────── ALERTS TAB ─────────
function AlertsTab({ alerts, toast }: { alerts: Alert[]; toast: ReturnType<typeof useToast>['toast'] }) {
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      const res = await fetch(`/api/admin/alerts/${id}/resolve`, { method: 'POST' });
      if (res.ok) toast('success', 'Alerta resolvido! Recarregue para ver.');
      else toast('error', 'Erro ao resolver alerta.');
    } catch {
      toast('error', 'Erro de conexão.');
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Alertas e anomalias
          {alerts.filter(a => !a.resolved).length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {alerts.filter(a => !a.resolved).length}
            </span>
          )}
        </h3>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhum alerta registrado.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {alerts.map((alert) => (
            <div key={alert.id} className={`px-5 py-4 flex items-start justify-between gap-4 ${alert.resolved ? 'opacity-50' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${alert.resolved ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                    {alert.resolved ? 'Resolvido' : 'Ativo'}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 uppercase">{alert.metric}</span>
                </div>
                <p className="text-sm text-gray-700">{alert.message ?? `Valor atual: ${alert.current_value} (meta: ${alert.threshold})`}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(alert.triggered_at)}</p>
              </div>
              {!alert.resolved && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolving === alert.id}
                  className="btn-secondary text-xs py-1.5 shrink-0"
                >
                  {resolving === alert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Resolver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── EDITOR TAB ─────────
function EditorTab({ reports, toast }: { reports: Report[]; toast: ReturnType<typeof useToast>['toast'] }) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] ?? null);
  const [editedText, setEditedText] = useState(selectedReport?.admin_edited_analysis ?? selectedReport?.claude_analysis ?? '');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [view, setView] = useState<'edit' | 'preview' | 'split'>('preview');

  const handleSelect = (report: Report) => {
    setSelectedReport(report);
    setEditedText(report.admin_edited_analysis ?? report.claude_analysis ?? '');
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_edited_analysis: editedText }),
      });
      if (res.ok) toast('success', 'Alterações salvas!');
      else toast('error', 'Erro ao salvar.');
    } catch {
      toast('error', 'Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedReport) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_edited_analysis: editedText, visible_to_client: true }),
      });
      if (res.ok) toast('success', 'Relatório publicado para o cliente!');
      else toast('error', 'Erro ao publicar.');
    } catch {
      toast('error', 'Erro de conexão.');
    } finally {
      setPublishing(false);
    }
  };

  const isHtml = editedText.trim().startsWith('<');

  return (
    <div className="space-y-4">
      {/* Report Selector */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Selecionar relatório</h3>
          <span className="text-xs text-gray-400">{reports.length} relatório{reports.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedReport?.id === r.id
                  ? 'bg-[#4040E8] text-white border-[#4040E8]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#4040E8]'
              }`}
            >
              {getPeriodLabel(r.type)} — {formatDate(r.created_at)}
              {r.visible_to_client && <span className="ml-1.5 text-emerald-500">●</span>}
            </button>
          ))}
          {reports.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum relatório disponível para edição.</p>
          )}
        </div>
      </div>

      {/* Editor */}
      {selectedReport && (
        <div className="card overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {getPeriodLabel(selectedReport.type)} — {formatDate(selectedReport.created_at)}
              </h3>
              {selectedReport.visible_to_client ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Publicado</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">Rascunho</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                {(['edit', 'split', 'preview'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {v === 'edit' ? 'Editar' : v === 'split' ? 'Dividido' : 'Preview'}
                  </button>
                ))}
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Salvar
              </button>
              <button onClick={handlePublish} disabled={publishing} className="btn-primary text-xs py-1.5 flex items-center gap-1.5">
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeIcon className="w-3.5 h-3.5" />}
                Publicar
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`${view === 'split' ? 'grid grid-cols-2 divide-x divide-gray-100' : ''}`}>
            {/* Edit pane */}
            {(view === 'edit' || view === 'split') && (
              <div className="relative">
                {view === 'split' && (
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    HTML / Texto
                  </div>
                )}
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={view === 'split' ? 28 : 24}
                  className="w-full px-4 py-4 text-xs font-mono text-gray-700 bg-gray-50 focus:outline-none focus:bg-white resize-none leading-relaxed border-0"
                  placeholder="Conteúdo do relatório (HTML ou texto)..."
                  spellCheck={false}
                />
              </div>
            )}

            {/* Preview pane */}
            {(view === 'preview' || view === 'split') && (
              <div>
                {view === 'split' && (
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Preview
                  </div>
                )}
                <div
                  className={`overflow-auto ${view === 'split' ? 'max-h-[700px]' : 'min-h-[500px]'} ${isHtml ? 'bg-[#0a0a14]' : 'bg-white p-6'}`}
                >
                  {editedText ? (
                    isHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: editedText }} />
                    ) : (
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {editedText}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                      Nenhum conteúdo para exibir
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
