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

      {/* Clients section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Clientes</h2>
        <Link href="/admin/clients" className="text-sm text-[#4040E8] font-medium hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Client cards grid — inspired by meu-app */}
      {clientRows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum cliente cadastrado ainda.</p>
          <Link href="/admin/clients/new" className="btn-primary mt-4 inline-flex items-center gap-2">
            Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientRows.map((client) => {
            const maxSpend = clientRows[0]?.spend ?? 1;
            const spendBarPct = maxSpend > 0 ? Math.round((client.spend / maxSpend) * 100) : 0;
            return (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="card flex flex-col gap-0 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                {/* Card header */}
                <div className="p-5 flex items-start gap-3">
                  <ClientAvatar name={client.name} color={client.color} initials={client.initials} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#4040E8] transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{client.segment ?? 'Sem segmento'}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    client.active ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {client.active ? 'Ativo' : 'Pausado'}
                  </span>
                </div>

                {/* Metrics row with vertical dividers */}
                <div className="flex border-t border-b border-gray-100">
                  {[
                    { label: 'Impressões', value: formatNumber(client.impressions) },
                    { label: 'CTR',        value: formatPercent(client.avgCtr) },
                    { label: 'Investido',  value: formatCurrency(client.spend) },
                  ].map((m, i) => (
                    <div key={m.label} className={`flex-1 py-3 text-center ${i < 2 ? 'border-r border-gray-100' : ''}`}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{m.label}</p>
                      <p className="text-sm font-semibold text-gray-800">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Spend bar relative to top client */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-gray-400">
                      {client.since_date
                        ? 'Desde ' + new Date(client.since_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                        : client.conversions + ' resultados'}
                    </span>
                    <span className="font-semibold text-[#4040E8]">ROAS {client.avgRoas.toFixed(1)}x</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${spendBarPct}%`,
                        background: 'linear-gradient(90deg,#4040E8,#7C3AED)',
                      }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
