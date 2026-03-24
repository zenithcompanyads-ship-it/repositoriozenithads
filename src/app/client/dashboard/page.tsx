import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { PortalHeader } from '@/components/client/PortalHeader';
import { PortalFooter } from '@/components/client/PortalFooter';
import { DashboardTabs } from '@/components/client/DashboardTabs';

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
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const since = thirtyDaysAgo.toISOString().split('T')[0];
  const since90 = ninetyDaysAgo.toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];

  const [
    { data: metrics },
    { data: metrics90 },
    { data: campaigns },
    { data: client },
    { data: reports },
  ] = await Promise.all([
    supabase
      .from('metrics')
      .select('*')
      .eq('client_id', userData.client_id)
      .gte('date', since)
      .lte('date', until)
      .order('date'),
    supabase
      .from('metrics')
      .select('*')
      .eq('client_id', userData.client_id)
      .gte('date', since90)
      .lte('date', until)
      .order('date'),
    supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', userData.client_id)
      .order('spend', { ascending: false }),
    supabase
      .from('clients')
      .select('name, segment, monthly_budget, color, initials, since_date')
      .eq('id', userData.client_id)
      .single(),
    supabase
      .from('reports')
      .select('*')
      .eq('client_id', userData.client_id)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return {
    metrics: metrics ?? [],
    metrics90: metrics90 ?? [],
    campaigns: campaigns ?? [],
    client,
    report: reports?.[0] ?? null,
    periodStart: since,
    periodEnd: until,
  };
}

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'overview' } = await searchParams;
  const data = await getClientDashboardData();

  if (!data) {
    return (
      <div className="p-8 text-center text-[#71717a]">
        <p>Sua conta ainda não está vinculada a um cliente. Contate o suporte.</p>
      </div>
    );
  }

  const { metrics, metrics90, campaigns, client, report, periodStart, periodEnd } = data;

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalReach = metrics.reduce((s, m) => s + (m.reach ?? 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
  const costPerReach = totalReach > 0 ? totalSpend / totalReach : 0;

  const periodDays =
    metrics.length > 0
      ? Math.round(
          (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;

  // Aggregate 90-day metrics by month for Funil/monthly grouping
  const monthlyMap: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; reach: number }> = {};
  for (const m of metrics90) {
    const key = m.date.substring(0, 7); // YYYY-MM
    if (!monthlyMap[key]) {
      monthlyMap[key] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 };
    }
    monthlyMap[key].spend += m.spend;
    monthlyMap[key].impressions += m.impressions;
    monthlyMap[key].clicks += m.clicks;
    monthlyMap[key].conversions += m.conversions ?? 0;
    monthlyMap[key].reach += m.reach ?? 0;
  }

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));

  const analysisText =
    report?.admin_edited_analysis ?? report?.claude_analysis ?? null;

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

      <DashboardTabs
        activeTab={tab}
        metrics={metrics}
        campaigns={campaigns}
        monthlyData={monthlyData}
        analysisText={analysisText}
        totalSpend={totalSpend}
        totalImpressions={totalImpressions}
        totalReach={totalReach}
        totalClicks={totalClicks}
        totalConversions={totalConversions}
        avgCpc={avgCpc}
        avgCpm={avgCpm}
        avgFrequency={avgFrequency}
        costPerReach={costPerReach}
        periodDays={periodDays}
        activeCampaigns={activeCampaigns}
        formatCurrency={formatCurrency}
        formatNumber={formatNumber}
        formatPercent={formatPercent}
      />

      <PortalFooter
        clientName={client?.name}
        periodStart={periodStart}
        periodEnd={periodEnd}
        totalInvestment={totalSpend}
      />
    </div>
  );
}
