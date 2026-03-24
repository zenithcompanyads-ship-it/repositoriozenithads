'use client';

import { useState } from 'react';
import type { Client, Metric, Campaign, Report, Alert, Goal, MonthlyPlan } from '@/types';
import { MetricsChart } from '@/components/ui/MetricsChart';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency, formatNumber, formatPercent, formatDate, getStatusColor, getStatusLabel, getPeriodLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  BarChart2, Calendar, Target, Bell, History, FileEdit,
  Megaphone, CheckCircle, Send, Loader2, Plus, Trash2, Eye,
  FileSpreadsheet, ShieldCheck, Settings
} from 'lucide-react';
import { Eye as EyeIcon } from 'lucide-react';
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
          pastReports={reports.filter((r) => r.type === 'monthly' || r.type === 'biweekly')}
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
  reports,
  type,
  toast,
}: {
  client: Client;
  metrics: Metric[];
  reports: Report[];
  type: 'weekly' | 'biweekly' | 'monthly';
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [generating, setGenerating] = useState(false);
  const typeReports = reports.filter((r) => r.type === type);
  const latest = typeReports[0];

  const days = type === 'weekly' ? 7 : type === 'biweekly' ? 15 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const relevantMetrics = metrics.filter((m) => new Date(m.date) >= cutoff);

  const totalSpend = relevantMetrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = relevantMetrics.reduce((s, m) => s + m.impressions, 0);
  const totalClicks = relevantMetrics.reduce((s, m) => s + m.clicks, 0);
  const avgCtr = relevantMetrics.length ? relevantMetrics.reduce((s, m) => s + m.ctr, 0) / relevantMetrics.length : 0;
  const avgRoas = relevantMetrics.length ? relevantMetrics.reduce((s, m) => s + m.roas, 0) / relevantMetrics.length : 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/claude/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, type }),
      });
      if (res.ok) {
        toast('success', 'Relatório gerado com sucesso! Recarregue a página para ver.');
      } else {
        toast('error', 'Erro ao gerar relatório.');
      }
    } catch {
      toast('error', 'Erro ao conectar com a API.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Metric Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Investido', value: formatCurrency(totalSpend) },
          { label: 'Impressões', value: formatNumber(totalImpressions) },
          { label: 'Cliques', value: formatNumber(totalClicks) },
          { label: 'CTR', value: formatPercent(avgCtr) },
          { label: 'ROAS', value: `${avgRoas.toFixed(2)}x` },
        ].map((m) => (
          <div key={m.label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Evolução — últimos {days} dias
        </h3>
        <MetricsChart metrics={relevantMetrics} fields={['spend', 'clicks']} height={250} />
      </div>

      {/* Latest Report */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Análise IA — {getPeriodLabel(type)}
          </h3>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-xs py-1.5"
          >
            {generating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Gerar novo</>
            )}
          </button>
        </div>
        {latest ? (
          <div className="prose prose-sm max-w-none">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">
                Gerado em {formatDate(latest.created_at)}
              </span>
              {latest.visible_to_client ? (
                <span className="badge-active text-[10px]">Publicado</span>
              ) : (
                <span className="badge-paused text-[10px]">Rascunho</span>
              )}
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
function CampaignsTab({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Campanhas Ativas</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Campanha', 'Objetivo', 'Status', 'Orçamento', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Conversões'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhuma campanha encontrada.</td>
              </tr>
            ) : campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.objective ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                    {getStatusLabel(c.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(c.budget)}</td>
                <td className="px-4 py-3 text-gray-700">{formatNumber(c.impressions)}</td>
                <td className="px-4 py-3 text-gray-700">{formatNumber(c.clicks)}</td>
                <td className="px-4 py-3 text-gray-700">{formatPercent(c.ctr)}</td>
                <td className="px-4 py-3 text-gray-700">{formatCurrency(c.cpc)}</td>
                <td className="px-4 py-3 text-gray-700">{formatNumber(c.conversions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  return (
    <div className="space-y-4">
      {/* Report Selector */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Selecionar relatório</h3>
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
              {r.visible_to_client && <span className="ml-1.5 text-emerald-400">●</span>}
            </button>
          ))}
          {reports.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum relatório disponível para edição.</p>
          )}
        </div>
      </div>

      {/* Editor */}
      {selectedReport && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Editor de relatório</h3>
              {selectedReport.visible_to_client ? (
                <span className="badge-active text-[10px]">Publicado</span>
              ) : (
                <span className="badge-paused text-[10px]">Rascunho</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Salvar rascunho
              </button>
              <button onClick={handlePublish} disabled={publishing} className="btn-primary text-xs py-1.5">
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeIcon className="w-3.5 h-3.5" />}
                Publicar para cliente
              </button>
            </div>
          </div>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={22}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8] resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
