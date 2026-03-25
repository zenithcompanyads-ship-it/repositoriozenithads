import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PortalHeader } from '@/components/client/PortalHeader';
import { PortalFooter } from '@/components/client/PortalFooter';
import { formatCurrency } from '@/lib/utils';
import { FileText } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) return null;

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [{ data: metrics }, { data: reports }, { data: csvReports }, { data: client }] = await Promise.all([
    supabase.from('metrics').select('date, spend, impressions, clicks, reach, conversions')
      .eq('client_id', userData.client_id)
      .gte('date', yearStart).lte('date', yearEnd),
    supabase.from('reports').select('id, period_start, period_end, visible_to_client, claude_analysis, admin_edited_analysis')
      .eq('client_id', userData.client_id)
      .eq('type', 'monthly').eq('visible_to_client', true),
    supabase.from('reports').select('id, period_start, period_end, content_json, created_at')
      .eq('client_id', userData.client_id)
      .eq('type', 'csv_analysis').eq('visible_to_client', true)
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('name, color, initials, monthly_budget')
      .eq('id', userData.client_id).single(),
  ]);

  // Aggregate metrics by month
  const byMonth: Record<string, { spend: number; impressions: number; clicks: number; reach: number; conversions: number }> = {};
  for (const m of metrics ?? []) {
    const key = m.date.substring(0, 7);
    if (!byMonth[key]) byMonth[key] = { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0 };
    byMonth[key].spend += m.spend;
    byMonth[key].impressions += m.impressions;
    byMonth[key].clicks += m.clicks;
    byMonth[key].reach += m.reach ?? 0;
    byMonth[key].conversions += m.conversions ?? 0;
  }

  // Map reports by month
  const reportByMonth: Record<string, { id: string; visible: boolean }> = {};
  for (const r of reports ?? []) {
    const key = r.period_start?.substring(0, 7);
    if (key) reportByMonth[key] = { id: r.id, visible: r.visible_to_client };
  }

  return { byMonth, reportByMonth, csvReports: csvReports ?? [], client, year, clientId: userData.client_id };
}

export default async function MonthlyReportsPage() {
  const data = await getData();
  if (!data) return <div className="p-8 text-[#71717a]">Conta não vinculada.</div>;

  const { byMonth, reportByMonth, csvReports, client, year } = data;

  const totalYearSpend = Object.values(byMonth).reduce((s, m) => s + m.spend, 0);
  const monthsWithData = Object.keys(byMonth).length;

  return (
    <div>
      <PortalHeader
        clientName={client?.name ?? 'Cliente'}
        clientColor={client?.color}
        clientInitials={client?.initials}
        periodStart={`${year}-01-01`}
        periodEnd={`${year}-12-31`}
        activeCampaigns={monthsWithData}
      />

      <div className="px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Relatórios Mensais {year}</h2>
            <p className="text-sm text-[#71717a] mt-1">
              Clique em um mês para ver o relatório completo com gráficos e análise
            </p>
          </div>
          {totalYearSpend > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-[#71717a]">Investimento {year}</p>
              <p className="text-xl font-bold text-[#4040E8]">{formatCurrency(totalYearSpend)}</p>
            </div>
          )}
        </div>

        {/* 12-month grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => {
            const monthNum = i + 1;
            const key = `${year}-${String(monthNum).padStart(2, '0')}`;
            const mData = byMonth[key];
            const report = reportByMonth[key];
            const hasData = !!mData;
            const now = new Date();
            const isPast = monthNum < now.getMonth() + 1 || year < now.getFullYear();
            const isCurrent = monthNum === now.getMonth() + 1 && year === now.getFullYear();

            return (
              <div key={key}>
                {hasData ? (
                  <Link href={`/client/reports/monthly/${key}`}>
                    <div className="portal-card p-5 cursor-pointer hover:border-[#4040E8]/50 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-widest text-[#71717a]">
                          {isCurrent ? 'Atual' : isPast ? 'Concluído' : 'Futuro'}
                        </span>
                        {report ? (
                          <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">
                            Publicado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#D4A017] bg-[#D4A017]/10 px-2 py-0.5 rounded-full">
                            Em revisão
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#4040E8] transition-colors">
                        {MONTH_NAMES[i]}
                      </h3>
                      <p className="text-[#4040E8] font-semibold text-sm mt-1">
                        {formatCurrency(mData.spend)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] text-[#71717a]">
                        <span>{(mData.impressions / 1000).toFixed(0)}k impressões</span>
                        <span>{mData.conversions} conversões</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="portal-card p-5 opacity-40">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-[#71717a]">
                        {isPast ? 'Sem dados' : 'Pendente'}
                      </span>
                      <span className="text-[10px] font-bold text-[#71717a] bg-[#1e1e1e] px-2 py-0.5 rounded-full">
                        —
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#71717a]">{MONTH_NAMES[i]}</h3>
                    <p className="text-[#4a4a4a] text-xs mt-2">
                      {isPast ? 'Relatório não disponível' : 'Em breve'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* CSV Analysis Reports */}
        {csvReports.length > 0 && (
          <div className="mt-4 space-y-3">
            <div>
              <h2 className="text-xl font-bold text-white">Análises de Período</h2>
              <p className="text-sm text-[#71717a] mt-1">Relatórios gerados a partir de exportações do Meta Ads</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {csvReports.map((r) => {
                const content = r.content_json as {
                  totalSpend?: number;
                  totalConversions?: number;
                  numDays?: number;
                  campaigns?: unknown[];
                } | null;
                return (
                  <Link key={r.id} href={`/client/reports/csv/${r.id}`}>
                    <div className="portal-card p-5 cursor-pointer hover:border-[#4040E8]/50 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-[#4040E8]/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[#4040E8]" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[#4040E8]">
                            Análise CSV
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">
                          Publicado
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-[#4040E8] transition-colors">
                        {new Date(r.period_start + 'T12:00:00').toLocaleDateString('pt-BR')} —{' '}
                        {new Date(r.period_end + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      {content && (
                        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] text-[#71717a]">
                          {content.totalSpend != null && (
                            <span>{formatCurrency(content.totalSpend)}</span>
                          )}
                          {content.numDays != null && (
                            <span>{content.numDays} dias</span>
                          )}
                          {content.campaigns != null && (
                            <span>{content.campaigns.length} campanhas</span>
                          )}
                          {content.totalConversions != null && (
                            <span>{content.totalConversions} conversões</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <PortalFooter
        clientName={client?.name}
        periodStart={`${year}-01-01`}
        periodEnd={`${year}-12-31`}
        totalInvestment={totalYearSpend}
      />
    </div>
  );
}
