import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatNumber, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';
import { MetricCard } from '@/components/ui/MetricCard';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import Link from 'next/link';
import {
  Eye,
  MousePointerClick,
  MessageSquare,
  DollarSign,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import type { Client, Metric, Alert } from '@/types';

async function getDashboardData() {
  const supabase = await createClient();

  // Last 30 days range
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];

  const [
    { data: clients },
    { data: metrics },
    { data: alerts },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase
      .from('metrics')
      .select('*')
      .gte('date', since)
      .lte('date', until),
    supabase
      .from('alerts')
      .select('*, clients(name, color, initials)')
      .eq('resolved', false)
      .order('triggered_at', { ascending: false })
      .limit(5),
  ]);

  return { clients: clients ?? [], metrics: metrics ?? [], alerts: alerts ?? [] };
}

export default async function AdminDashboard() {
  const { clients, metrics, alerts } = await getDashboardData();

  // Aggregate totals
  const totalSpend = metrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  // Group metrics by client
  const metricsByClient = metrics.reduce<Record<string, Metric[]>>((acc, m) => {
    if (!acc[m.client_id]) acc[m.client_id] = [];
    acc[m.client_id].push(m);
    return acc;
  }, {});

  // Build client rows
  const clientRows = clients.map((client: Client) => {
    const cms = metricsByClient[client.id] ?? [];
    const spend = cms.reduce((s, m) => s + (m.spend ?? 0), 0);
    const impressions = cms.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const avgCtr = cms.length ? cms.reduce((s, m) => s + (m.ctr ?? 0), 0) / cms.length : 0;
    const avgRoas = cms.length ? cms.reduce((s, m) => s + (m.roas ?? 0), 0) / cms.length : 0;
    return { ...client, spend, impressions, avgCtr, avgRoas };
  });

  const statCards = [
    {
      label: 'Impressões Totais',
      value: formatNumber(totalImpressions),
      icon: <Eye className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Cliques Totais',
      value: formatNumber(totalClicks),
      icon: <MousePointerClick className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Conversões',
      value: formatNumber(totalConversions),
      icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-50',
    },
    {
      label: 'Investimento Total',
      value: formatCurrency(totalSpend),
      icon: <DollarSign className="w-5 h-5 text-orange-600" />,
      iconBg: 'bg-orange-50',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Geral</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão consolidada de todos os clientes — últimos 30 dias
        </p>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-[12px] p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} ativo
            {alerts.length > 1 ? 's' : ''} — verifique as métricas dos clientes
          </p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Atividade Recente dos Clientes
          </h2>
          <Link
            href="/admin/clients"
            className="text-sm text-[#4040E8] font-medium hover:underline flex items-center gap-1"
          >
            Ver todos
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Cliente', 'Segmento', 'Status', 'Impressões', 'CTR', 'Investido', 'ROAS', 'Detalhes'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                clientRows.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ClientAvatar
                          name={client.name}
                          color={client.color}
                          initials={client.initials}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {client.segment ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {client.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatNumber(client.impressions)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatPercent(client.avgCtr)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(client.spend)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {client.avgRoas.toFixed(2)}x
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-[#4040E8] text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        Detalhes
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
