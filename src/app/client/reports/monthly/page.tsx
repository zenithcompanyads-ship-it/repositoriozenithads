import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportView } from '@/components/client/ReportView';
import { PortalHeader } from '@/components/client/PortalHeader';
import { PortalFooter } from '@/components/client/PortalFooter';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single();

  if (!userData?.client_id) return null;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [{ data: reports }, { data: metrics }, { data: client }] = await Promise.all([
    supabase
      .from('reports')
      .select('*')
      .eq('client_id', userData.client_id)
      .eq('type', 'monthly')
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('metrics')
      .select('*')
      .eq('client_id', userData.client_id)
      .gte('date', ninetyDaysAgo)
      .order('date'),
    supabase
      .from('clients')
      .select('name, color, initials')
      .eq('id', userData.client_id)
      .single(),
  ]);

  return { reports: reports ?? [], metrics: metrics ?? [], client };
}

function formatMonthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
    new Date(Number(year), Number(month) - 1, 1)
  );
}

export default async function MonthlyReportPage() {
  const data = await getData();
  if (!data) {
    return <div className="p-8 text-[#71717a]">Conta não vinculada.</div>;
  }

  const { reports, metrics, client } = data;

  // Group metrics by month (YYYY-MM)
  const monthlyMap: Record<
    string,
    { spend: number; impressions: number; clicks: number; conversions: number; cpc_sum: number; count: number }
  > = {};

  for (const m of metrics) {
    const key = m.date.substring(0, 7);
    if (!monthlyMap[key]) {
      monthlyMap[key] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, cpc_sum: 0, count: 0 };
    }
    monthlyMap[key].spend += m.spend;
    monthlyMap[key].impressions += m.impressions;
    monthlyMap[key].clicks += m.clicks;
    monthlyMap[key].conversions += m.conversions ?? 0;
    monthlyMap[key].cpc_sum += m.cpc;
    monthlyMap[key].count += 1;
  }

  const monthlyRows = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-3)
    .map(([month, vals]) => ({
      month,
      label: formatMonthLabel(month),
      spend: vals.spend,
      impressions: vals.impressions,
      clicks: vals.clicks,
      conversions: vals.conversions,
      avgCpc: vals.count > 0 ? vals.cpc_sum / vals.count : 0,
    }));

  // Last 30 days for header
  const last30 = metrics.slice(-30);
  const totalSpend = last30.reduce((s, m) => s + m.spend, 0);
  const activeCampaigns = 0; // not available here

  const periodStart = metrics.length > 0 ? metrics[0].date : undefined;
  const periodEnd = metrics.length > 0 ? metrics[metrics.length - 1].date : undefined;

  return (
    <div>
      <PortalHeader
        clientName={client?.name ?? 'Cliente'}
        clientColor={client?.color}
        clientInitials={client?.initials}
        periodStart={periodStart}
        periodEnd={periodEnd}
        activeCampaigns={activeCampaigns}
      />

      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Relatório Mensal</h2>
          <p className="text-sm text-[#71717a]">Análise de performance — comparativo 3 meses</p>
        </div>

        {/* Monthly comparison table */}
        {monthlyRows.length > 0 && (
          <div className="portal-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-semibold text-white">Comparativo Mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e1e]">
                    {['Mês', 'Investimento', 'Impressões', 'Cliques', 'Conversões', 'CPC Médio'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-[#71717a] font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row, idx) => {
                    const isLatest = idx === monthlyRows.length - 1;
                    return (
                      <tr
                        key={row.month}
                        className={`border-b border-[#1e1e1e] ${isLatest ? 'bg-[#4040E8]/5' : ''}`}
                      >
                        <td className="px-5 py-3 text-sm font-medium text-white">
                          {row.label}
                          {isLatest && (
                            <span className="ml-2 text-[10px] text-[#4040E8] font-bold">ATUAL</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#4040E8] font-semibold">
                          {formatCurrency(row.spend)}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#a1a1aa]">
                          {formatNumber(row.impressions)}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#a1a1aa]">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#22C55E]">
                          {formatNumber(row.conversions)}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#a1a1aa]">
                          {formatCurrency(row.avgCpc)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CPC/CPV trend */}
        {monthlyRows.length > 1 && (
          <div className="portal-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tendência de CPC por Mês</h3>
            <div className="flex items-end gap-4 h-24">
              {monthlyRows.map((row, idx) => {
                const maxCpc = Math.max(...monthlyRows.map((r) => r.avgCpc), 0.01);
                const barH = maxCpc > 0 ? (row.avgCpc / maxCpc) * 100 : 0;
                return (
                  <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#71717a]">{formatCurrency(row.avgCpc)}</span>
                    <div className="w-full relative" style={{ height: '60px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                        style={{
                          height: `${barH}%`,
                          backgroundColor: idx === monthlyRows.length - 1 ? '#4040E8' : '#2a2a2a',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#71717a]">{row.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reports */}
        <ReportView reports={data.reports} metrics={metrics.slice(-30)} days={30} />
      </div>

      <PortalFooter
        clientName={client?.name}
        periodStart={periodStart}
        periodEnd={periodEnd}
        totalInvestment={totalSpend}
      />
    </div>
  );
}
