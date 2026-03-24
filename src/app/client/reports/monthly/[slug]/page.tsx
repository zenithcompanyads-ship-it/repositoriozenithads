import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PortalFooter } from '@/components/client/PortalFooter';
import { MonthReportClient } from '@/components/client/MonthReportClient';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

async function getData(slug: string) {
  // slug = "2026-03"
  if (!/^\d{4}-\d{2}$/.test(slug)) return null;
  const [year, month] = slug.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) return null;

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [{ data: metrics }, { data: campaigns }, { data: reports }, { data: client }] = await Promise.all([
    supabase.from('metrics').select('*')
      .eq('client_id', userData.client_id)
      .gte('date', monthStart).lte('date', monthEnd)
      .order('date'),
    supabase.from('campaigns').select('*')
      .eq('client_id', userData.client_id)
      .order('spend', { ascending: false }),
    supabase.from('reports').select('*')
      .eq('client_id', userData.client_id)
      .eq('type', 'monthly').eq('visible_to_client', true)
      .gte('period_start', monthStart).lte('period_start', monthEnd)
      .order('created_at', { ascending: false }).limit(1),
    supabase.from('clients').select('name, color, initials, monthly_budget')
      .eq('id', userData.client_id).single(),
  ]);

  if (!metrics?.length) return null;

  return {
    metrics: metrics ?? [],
    campaigns: campaigns ?? [],
    report: reports?.[0] ?? null,
    client,
    monthStart,
    monthEnd,
    monthName: MONTH_NAMES[month - 1],
    year,
  };
}

export default async function MonthReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  const { metrics, campaigns, report, client, monthStart, monthEnd, monthName, year } = data;

  // Aggregate totals
  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalReach = metrics.reduce((s, m) => s + (m.reach ?? 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;
  const costPerReach = totalReach > 0 ? totalSpend / totalReach : 0;

  const analysisText = report?.admin_edited_analysis ?? report?.claude_analysis ?? null;

  // Chart data (daily)
  const chartData = metrics.map((m) => ({
    date: m.date.substring(5), // MM-DD
    spend: Math.round(m.spend * 100) / 100,
    impressions: m.impressions,
    reach: m.reach ?? 0,
    clicks: m.clicks,
    conversions: m.conversions ?? 0,
    cpc: Math.round((m.cpc ?? 0) * 100) / 100,
  }));

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#1e1e1e]">
        <Link
          href="/client/reports/monthly"
          className="inline-flex items-center gap-1.5 text-xs text-[#71717a] hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Todos os meses
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/40 bg-[#4040E8]/10 mb-3">
              <span className="text-[10px] font-bold tracking-widest text-[#4040E8] uppercase">
                Zenith Company · Relatório Mensal
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">
              {monthName} {year}
            </h1>
            <p className="text-[#a1a1aa] text-sm mt-1">{client?.name} — performance do mês</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-[#71717a]">Período</p>
            <p className="text-sm font-semibold text-white">
              {new Date(monthStart + 'T12:00:00').toLocaleDateString('pt-BR')} —{' '}
              {new Date(monthEnd + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[#71717a] mt-2">Investimento</p>
            <p className="text-lg font-bold text-[#4040E8]">{formatCurrency(totalSpend)}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">
        {/* Row 1 — Primary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Investimento Total', value: formatCurrency(totalSpend), accent: '#4040E8' },
            { label: 'Impressões', value: formatNumber(totalImpressions), accent: undefined },
            { label: 'Alcance', value: formatNumber(totalReach), accent: undefined },
            { label: 'Cliques', value: formatNumber(totalClicks), accent: '#22C55E' },
            { label: 'Conversões', value: formatNumber(totalConversions), accent: '#22C55E' },
          ].map((card) => (
            <div key={card.label} className="portal-metric-card">
              <p className="text-[10px] uppercase tracking-widest text-[#71717a]">{card.label}</p>
              <p className="text-2xl font-bold" style={card.accent ? { color: card.accent } : { color: '#fff' }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Row 2 — Secondary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'CTR Médio', value: formatPercent(avgCtr) },
            { label: 'CPC Médio', value: formatCurrency(avgCpc) },
            { label: 'CPM Médio', value: formatCurrency(avgCpm) },
            { label: 'Frequência', value: frequency.toFixed(2) + 'x' },
          ].map((card) => (
            <div key={card.label} className="portal-metric-card">
              <p className="text-[10px] uppercase tracking-widest text-[#71717a]">{card.label}</p>
              <p className="text-xl font-bold text-white">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Charts + campaigns (client component for Recharts) */}
        <MonthReportClient
          chartData={chartData}
          campaigns={campaigns}
          totalSpend={totalSpend}
          analysisText={analysisText}
        />
      </div>

      <PortalFooter
        clientName={client?.name}
        periodStart={monthStart}
        periodEnd={monthEnd}
        totalInvestment={totalSpend}
      />
    </div>
  );
}
