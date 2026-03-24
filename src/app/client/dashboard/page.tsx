import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MetricCard } from '@/components/ui/MetricCard';
import { MetricsChart } from '@/components/ui/MetricsChart';
import { formatCurrency, formatNumber, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Eye, MousePointerClick, DollarSign, TrendingUp, Megaphone } from 'lucide-react';

async function getClientDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single();

  if (!userData?.client_id) return null;

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];

  const [{ data: metrics }, { data: campaigns }, { data: client }] = await Promise.all([
    supabase.from('metrics').select('*').eq('client_id', userData.client_id).gte('date', since).lte('date', until).order('date'),
    supabase.from('campaigns').select('*').eq('client_id', userData.client_id).order('spend', { ascending: false }).limit(10),
    supabase.from('clients').select('name, segment, monthly_budget').eq('id', userData.client_id).single(),
  ]);

  return { metrics: metrics ?? [], campaigns: campaigns ?? [], client };
}

export default async function ClientDashboardPage() {
  const data = await getClientDashboardData();

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Sua conta ainda não está vinculada a um cliente. Contate o suporte.</p>
      </div>
    );
  }

  const { metrics, campaigns, client } = data;

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const avgCtr = metrics.length ? metrics.reduce((s, m) => s + m.ctr, 0) / metrics.length : 0;
  const avgRoas = metrics.length ? metrics.reduce((s, m) => s + m.roas, 0) / metrics.length : 0;

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {client?.name ?? 'Cliente'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Aqui está o resumo do seu desempenho nos últimos 30 dias
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <MetricCard
          label="Investimento Total"
          value={formatCurrency(totalSpend)}
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <MetricCard
          label="Impressões"
          value={formatNumber(totalImpressions)}
          icon={<Eye className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <MetricCard
          label="Cliques"
          value={formatNumber(totalClicks)}
          icon={<MousePointerClick className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <MetricCard
          label="ROAS"
          value={`${avgRoas.toFixed(2)}x`}
          icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-50"
        />
      </div>

      {/* Chart */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Evolução — 30 dias</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>CTR médio: {formatPercent(avgCtr)}</span>
          </div>
        </div>
        <MetricsChart metrics={metrics} fields={['spend', 'clicks']} height={260} />
      </div>

      {/* Campaigns Summary */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Campanhas ativas</h2>
            <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              {activeCampaigns}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Campanha', 'Status', 'Impressões', 'Cliques', 'CTR', 'Investido'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma campanha disponível.
                  </td>
                </tr>
              ) : campaigns.slice(0, 5).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(c.impressions)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(c.clicks)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatPercent(c.ctr)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(c.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
