import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { Client, Metric } from '@/types';

async function getDashboardData() {
  const supabase = await createClient();

  const today = new Date();
  const since = new Date(today); since.setDate(today.getDate() - 30);
  const prevSince = new Date(today); prevSince.setDate(today.getDate() - 60);
  const prevUntil = new Date(today); prevUntil.setDate(today.getDate() - 31);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const [
    { data: clients },
    { data: metrics },
    { data: prevMetrics },
    { data: alerts },
    { data: publishedCsvReports },
    { data: latestReport },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('metrics').select('*').gte('date', fmt(since)).lte('date', fmt(today)),
    supabase.from('metrics').select('spend,impressions,clicks,conversions').gte('date', fmt(prevSince)).lte('date', fmt(prevUntil)),
    supabase.from('alerts').select('*').eq('resolved', false).limit(5),
    supabase.from('reports').select('client_id').eq('type', 'csv_analysis').eq('visible_to_client', true),
    supabase.from('reports').select('created_at').order('created_at', { ascending: false }).limit(1),
  ]);

  return {
    clients: clients ?? [],
    metrics: metrics ?? [],
    prevMetrics: prevMetrics ?? [],
    alerts: alerts ?? [],
    publishedCsvReports: publishedCsvReports ?? [],
    latestReport: latestReport?.[0]?.created_at || null,
  };
}

function trendPct(current: number, previous: number) {
  if (previous === 0) return { pct: '—', up: true, neutral: true };
  const delta = ((current - previous) / previous) * 100;
  return { pct: `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`, up: delta >= 0, neutral: false };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === 'list' ? 'list' : 'grid';
  const { clients, metrics, prevMetrics, alerts, publishedCsvReports, latestReport } = await getDashboardData();

  // Macro metrics
  const activeClients = (clients as Client[]).filter(c => c.active).length;
  const totalClients = (clients as Client[]).length;

  // Campaign metrics (last 30 days)
  const totalSpend       = metrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const totalClicks      = metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  const prevSpend       = prevMetrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const prevImpressions = prevMetrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const prevClicks      = prevMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const prevConversions = prevMetrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  // Format last report date
  const lastReportDate = latestReport
    ? new Date(latestReport).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const metricsByClient = metrics.reduce<Record<string, Metric[]>>((acc, m) => {
    if (!acc[m.client_id]) acc[m.client_id] = [];
    acc[m.client_id].push(m);
    return acc;
  }, {});

  const clientRows = (clients as Client[]).map((client) => {
    const cms = metricsByClient[client.id] ?? [];
    const spend       = cms.reduce((s, m) => s + (m.spend ?? 0), 0);
    const impressions = cms.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const conversions = cms.reduce((s, m) => s + (m.conversions ?? 0), 0);
    const avgCtr  = cms.length ? cms.reduce((s, m) => s + (m.ctr ?? 0), 0) / cms.length : 0;
    const avgRoas = cms.length ? cms.reduce((s, m) => s + (m.roas ?? 0), 0) / cms.length : 0;
    return { ...client, spend, impressions, conversions, avgCtr, avgRoas };
  }).sort((a, b) => b.spend - a.spend);

  const clientsWithCsv = new Set(publishedCsvReports.map((r: { client_id: string }) => r.client_id));
  const pendingClients = (clients as Client[]).filter(c => !clientsWithCsv.has(c.id));

  return (
    <div className="min-h-screen bg-gray-50 px-6 sm:px-10 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Dashboard <span className="text-gray-600 font-light">Geral</span>
        </h1>
        <p className="text-sm text-gray-500 font-light mt-1">Visão macro da sua operação de tráfego pago</p>
      </div>

      {/* MACRO KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Clientes Ativos</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{activeClients}</p>
          <p className="text-xs text-gray-500 mt-1">de {totalClients} total</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Investimento (30d)</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-gray-500 mt-1">Total gasto</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Último Relatório</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{lastReportDate}</p>
          <p className="text-xs text-gray-500 mt-1">Data da publicação</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Relatórios Pendentes</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{pendingClients.length}</p>
          <p className="text-xs text-gray-500 mt-1">Clientes para atualizar</p>
        </div>
      </div>

      {/* CAMPAIGN METRICS SECTION */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Métricas de Campanha (últimos 30 dias)</h2>
          <p className="text-sm text-gray-500 font-light mt-1">Consolidado de todos os clientes</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Impressões</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatNumber(totalImpressions)}</p>
            <div className="flex items-center gap-2 mt-2">
              {trendPct(totalImpressions, prevImpressions).up
                ? <TrendingUp size={14} className="text-green-600" />
                : <TrendingDown size={14} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalImpressions, prevImpressions).up ? 'text-green-600' : 'text-orange-600'}`}>
                {trendPct(totalImpressions, prevImpressions).pct}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Cliques</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatNumber(totalClicks)}</p>
            <div className="flex items-center gap-2 mt-2">
              {trendPct(totalClicks, prevClicks).up
                ? <TrendingUp size={14} className="text-green-600" />
                : <TrendingDown size={14} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalClicks, prevClicks).up ? 'text-green-600' : 'text-orange-600'}`}>
                {trendPct(totalClicks, prevClicks).pct}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Resultados</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatNumber(totalConversions)}</p>
            <div className="flex items-center gap-2 mt-2">
              {trendPct(totalConversions, prevConversions).up
                ? <TrendingUp size={14} className="text-green-600" />
                : <TrendingDown size={14} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalConversions, prevConversions).up ? 'text-green-600' : 'text-orange-600'}`}>
                {trendPct(totalConversions, prevConversions).pct}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Investimento</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
            <div className="flex items-center gap-2 mt-2">
              {trendPct(totalSpend, prevSpend).up
                ? <TrendingUp size={14} className="text-green-600" />
                : <TrendingDown size={14} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalSpend, prevSpend).up ? 'text-green-600' : 'text-orange-600'}`}>
                {trendPct(totalSpend, prevSpend).pct}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PENDING REPORTS */}
      {pendingClients.length > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Ações Pendentes</h2>
            <p className="text-sm text-gray-500 font-light mt-1">{pendingClients.length} relatório{pendingClients.length > 1 ? 's' : ''} aguardando publicação</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            {pendingClients.map((client, i) => (
              <div key={client.id} className={`flex items-center justify-between p-4 sm:p-5 gap-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {client.initials ?? client.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{client.name}</span>
                </div>
                <Link href={`/admin/clients/${client.id}?tab=csv`} className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                  Subir CSV →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENTS SECTION */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Visão por Cliente</h2>
          <p className="text-sm text-gray-500 font-light mt-1">Investimento, impressões e performance individual</p>
        </div>

        {clientRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-12 text-center">
            <p className="text-gray-500 font-light mb-4">Nenhum cliente cadastrado ainda.</p>
            <Link href="/admin/clients/new" className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Cadastrar primeiro cliente
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientRows.map((client) => {
              const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
              return (
                <Link key={client.id} href={`/admin/clients/${client.id}`} className="block group">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-xs hover:shadow-sm hover:border-blue-200 transition-all overflow-hidden h-full">
                    {/* Header */}
                    <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{client.segment ?? 'Sem segmento'}</p>
                        </div>
                      </div>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        client.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {client.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="border-t border-gray-100 px-4 sm:px-5 py-3 grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Impressões</p>
                        <p className="text-sm font-bold text-gray-900">{formatNumber(client.impressions)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">CTR</p>
                        <p className="text-sm font-bold text-gray-900">{formatPercent(client.avgCtr)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Investido</p>
                        <p className="text-sm font-bold text-blue-600">{formatCurrency(client.spend)}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 p-4 sm:p-5 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {client.conversions} resultado{client.conversions !== 1 ? 's' : ''}
                      </div>
                      <span className="text-xs font-bold text-blue-600">ROAS {client.avgRoas.toFixed(1)}x</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
