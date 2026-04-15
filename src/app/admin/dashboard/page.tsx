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
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white">
      {/* HEADER */}
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
          Dashboard <span className="text-blue-600">Geral</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 font-light mt-2 sm:mt-3">Visão macro da sua operação de tráfego pago</p>
      </div>

      {/* MACRO KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Clientes Ativos</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{activeClients}</p>
          <p className="text-xs text-gray-500 mt-2">de {totalClients} total</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Investimento (30d)</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-gray-500 mt-2">Total gasto</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Último Relatório</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{lastReportDate}</p>
          <p className="text-xs text-gray-500 mt-2">Data da publicação</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Relatórios Pendentes</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600">{pendingClients.length}</p>
          <p className="text-xs text-gray-500 mt-2">Clientes para atualizar</p>
        </div>
      </div>

      {/* CAMPAIGN METRICS SECTION */}
      <div className="mb-8 sm:mb-12">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Métricas de Campanha</h2>
          <p className="text-sm text-gray-600 font-light mt-1">Consolidado dos últimos 30 dias</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Impressões</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatNumber(totalImpressions)}</p>
            <div className="flex items-center gap-2 mt-3">
              {trendPct(totalImpressions, prevImpressions).up
                ? <TrendingUp size={16} className="text-emerald-600" />
                : <TrendingDown size={16} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalImpressions, prevImpressions).up ? 'text-emerald-600' : 'text-orange-600'}`}>
                {trendPct(totalImpressions, prevImpressions).pct}
              </span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Cliques</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatNumber(totalClicks)}</p>
            <div className="flex items-center gap-2 mt-3">
              {trendPct(totalClicks, prevClicks).up
                ? <TrendingUp size={16} className="text-emerald-600" />
                : <TrendingDown size={16} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalClicks, prevClicks).up ? 'text-emerald-600' : 'text-orange-600'}`}>
                {trendPct(totalClicks, prevClicks).pct}
              </span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Resultados</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatNumber(totalConversions)}</p>
            <div className="flex items-center gap-2 mt-3">
              {trendPct(totalConversions, prevConversions).up
                ? <TrendingUp size={16} className="text-emerald-600" />
                : <TrendingDown size={16} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalConversions, prevConversions).up ? 'text-emerald-600' : 'text-orange-600'}`}>
                {trendPct(totalConversions, prevConversions).pct}
              </span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-3 uppercase">Investimento</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
            <div className="flex items-center gap-2 mt-3">
              {trendPct(totalSpend, prevSpend).up
                ? <TrendingUp size={16} className="text-emerald-600" />
                : <TrendingDown size={16} className="text-orange-600" />}
              <span className={`text-xs font-semibold ${trendPct(totalSpend, prevSpend).up ? 'text-emerald-600' : 'text-orange-600'}`}>
                {trendPct(totalSpend, prevSpend).pct}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PENDING REPORTS */}
      {pendingClients.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ações Pendentes</h2>
            <p className="text-sm text-gray-600 font-light mt-1">{pendingClients.length} relatório{pendingClients.length > 1 ? 's' : ''} aguardando publicação</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 overflow-hidden">
            {pendingClients.map((client, i) => (
              <div key={client.id} className={`flex items-center justify-between gap-4 ${i > 0 ? 'border-t border-gray-200 pt-4 mt-4' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {client.initials ?? client.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{client.name}</span>
                </div>
                <Link href={`/admin/clients/${client.id}?tab=csv`} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors">
                  Subir CSV →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENTS SECTION */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Visão por Cliente</h2>
          <p className="text-sm text-gray-600 font-light mt-1">Investimento, impressões e performance individual</p>
        </div>

        {clientRows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center">
            <p className="text-gray-600 font-light mb-6">Nenhum cliente cadastrado ainda.</p>
            <Link href="/admin/clients/new" className="inline-block text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              Cadastrar primeiro cliente
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientRows.map((client) => {
              const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
              return (
                <Link key={client.id} href={`/admin/clients/${client.id}`} className="block group">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 h-full flex flex-col hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
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
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}>
                        {client.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="border-t border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-3 gap-3 mb-4">
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
                    <div className="border-t border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 mt-4 flex items-center justify-between">
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
