import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import Link from 'next/link';
import {
  Eye, MousePointerClick, MessageSquare, DollarSign,
  ArrowRight, AlertTriangle, TrendingUp, TrendingDown,
} from 'lucide-react';
import type { Client, Metric } from '@/types';

async function getDashboardData() {
  const supabase = await createClient();

  const today = new Date();

  // Current period: last 30 days
  const since = new Date(today); since.setDate(today.getDate() - 30);
  // Previous period: 31–60 days ago
  const prevSince = new Date(today); prevSince.setDate(today.getDate() - 60);
  const prevUntil = new Date(today); prevUntil.setDate(today.getDate() - 31);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const [
    { data: clients },
    { data: metrics },
    { data: prevMetrics },
    { data: alerts },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('metrics').select('*').gte('date', fmt(since)).lte('date', fmt(today)),
    supabase.from('metrics').select('spend,impressions,clicks,conversions').gte('date', fmt(prevSince)).lte('date', fmt(prevUntil)),
    supabase.from('alerts').select('*').eq('resolved', false).limit(5),
  ]);

  return {
    clients: clients ?? [],
    metrics: metrics ?? [],
    prevMetrics: prevMetrics ?? [],
    alerts: alerts ?? [],
  };
}

function trendPct(current: number, previous: number): { pct: string; up: boolean; neutral: boolean } {
  if (previous === 0) return { pct: '—', up: true, neutral: true };
  const delta = ((current - previous) / previous) * 100;
  return { pct: `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`, up: delta >= 0, neutral: false };
}

export default async function AdminDashboard() {
  const { clients, metrics, prevMetrics, alerts } = await getDashboardData();

  const totalSpend       = metrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const totalClicks      = metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  const prevSpend       = prevMetrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const prevImpressions = prevMetrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const prevClicks      = prevMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const prevConversions = prevMetrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  // Per-client stats
  const metricsByClient = metrics.reduce<Record<string, Metric[]>>((acc, m) => {
    if (!acc[m.client_id]) acc[m.client_id] = [];
    acc[m.client_id].push(m);
    return acc;
  }, {});

  const clientRows = (clients as Client[]).map((client) => {
    const cms = metricsByClient[client.id] ?? [];
    const spend       = cms.reduce((s, m) => s + (m.spend ?? 0), 0);
    const impressions = cms.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const clicks      = cms.reduce((s, m) => s + (m.clicks ?? 0), 0);
    const conversions = cms.reduce((s, m) => s + (m.conversions ?? 0), 0);
    const avgCtr  = cms.length ? cms.reduce((s, m) => s + (m.ctr ?? 0), 0) / cms.length : 0;
    const avgRoas = cms.length ? cms.reduce((s, m) => s + (m.roas ?? 0), 0) / cms.length : 0;
    return { ...client, spend, impressions, clicks, conversions, avgCtr, avgRoas };
  }).sort((a, b) => b.spend - a.spend);

  const kpis = [
    {
      label: 'Impressões Totais',
      value: formatNumber(totalImpressions),
      trend: trendPct(totalImpressions, prevImpressions),
      icon: Eye, color: '#4040E8', bg: '#4040E810',
    },
    {
      label: 'Cliques Totais',
      value: formatNumber(totalClicks),
      trend: trendPct(totalClicks, prevClicks),
      icon: MousePointerClick, color: '#22C55E', bg: '#22C55E10',
    },
    {
      label: 'Resultados',
      value: formatNumber(totalConversions),
      trend: trendPct(totalConversions, prevConversions),
      icon: MessageSquare, color: '#A855F7', bg: '#A855F710',
    },
    {
      label: 'Investimento Total',
      value: formatCurrency(totalSpend),
      trend: trendPct(totalSpend, prevSpend),
      icon: DollarSign, color: '#F59E0B', bg: '#F59E0B10',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Geral</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bem-vindo! Aqui está o resumo consolidado de todos os clientes.
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} ativo{alerts.length > 1 ? 's' : ''} — verifique as métricas dos clientes
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
        {kpis.map(({ label, value, trend, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
                {!trend.neutral && (
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                    trend.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {trend.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {trend.pct}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Activity table */}
      <div className="card mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Atividade Recente dos Clientes</h2>
          <Link href="/admin/clients" className="text-sm text-[#4040E8] font-medium hover:underline flex items-center gap-1">
            Ver todos os clientes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Cliente', 'Segmento', 'Status', 'Impressões', 'CTR', 'Investido', 'ROAS', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              ) : clientRows.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <ClientAvatar name={client.name} color={client.color} initials={client.initials} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        {client.since_date && (
                          <p className="text-[10px] text-gray-400">desde {new Date(client.since_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{client.segment ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      client.active ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {client.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatNumber(client.impressions)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatPercent(client.avgCtr)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(client.spend)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{client.avgRoas.toFixed(1)}x</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients/${client.id}`} className="text-[#4040E8] text-xs font-medium hover:underline flex items-center gap-1 whitespace-nowrap">
                      Detalhes <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance summary table */}
      {clientRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Performance por Cliente</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos 30 dias — ordenado por investimento</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Cliente', 'Impressões', 'Cliques', 'CTR', 'Resultados', 'Investido'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientRows.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ClientAvatar name={client.name} color={client.color} initials={client.initials} size="sm" />
                        <span className="font-medium text-gray-900">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(client.impressions)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(client.clicks)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatPercent(client.avgCtr)}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatNumber(client.conversions)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(client.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
