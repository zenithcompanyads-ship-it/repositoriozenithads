import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PortalFooter } from '@/components/client/PortalFooter';
import { CSVReportTabs } from '@/components/client/CSVReportTabs';
import type { CSVReportData } from '@/components/client/CSVReportTabs';

async function getData(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users').select('role, client_id').eq('id', user.id).single();
  if (!userData) redirect('/login');

  const isAdmin = userData.role === 'admin';
  const adminClient = createAdminClient();

  // Fetch the report
  const { data: report } = await adminClient
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('type', 'csv_analysis')
    .single();

  if (!report) return null;

  // Clients can only see published reports for their own account
  if (!isAdmin) {
    if (!report.visible_to_client) return null;
    if (report.client_id !== userData.client_id) return null;
  }

  // Fetch client info
  const { data: client } = await adminClient
    .from('clients').select('name, color, initials')
    .eq('id', report.client_id).single();

  return { report, client, isAdmin };
}

export default async function CSVReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getData(id);
  if (!result) notFound();

  const { report, client, isAdmin } = result;
  const content = report.content_json as CSVReportData & { source?: string };
  const htmlReport: string | null = report.claude_analysis ?? null;

  // Validate content_json has expected shape
  if (!content || content.source !== 'csv') notFound();

  const backHref = isAdmin
    ? `/admin/clients/${report.client_id}`
    : '/client/reports/monthly';

  const activeCampaignCount = (content.campaigns ?? []).filter((c: { status: string }) => c.status === 'ACTIVE').length;

  return (
    <div>
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-[#1e1e1e]">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a14] via-[#0d0d1f] to-[#070710]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#4040E820_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#6B4EFF15_0%,_transparent_60%)]" />

        <div className="relative px-8 py-7">
          {/* Back link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-[#52525b] hover:text-white mb-5 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {isAdmin ? 'Voltar ao cliente' : 'Relatórios'}
          </Link>

          {/* Agency badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/30 bg-[#4040E8]/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4040E8]" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#818CF8] uppercase">
              Zenith Company
            </span>
          </div>

          {/* Hero title */}
          <h1 className="text-[11px] font-bold tracking-[0.2em] text-[#52525b] uppercase mb-1">
            Relatório de Performance Digital
          </h1>
          <h2 className="text-2xl font-black text-white mb-4">
            {client?.name ?? content.clientName}
          </h2>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#ffffff08] border border-[#ffffff10] rounded-lg px-3 py-2">
              <span className="text-[10px] text-[#52525b] uppercase tracking-wider">Período</span>
              <span className="text-xs font-semibold text-white">
                {new Date(content.periodStart + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(content.periodEnd + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
              <span className="text-[10px] text-[#52525b]">{content.numDays} dias</span>
            </div>

            <div className="flex items-center gap-2 bg-[#4040E8]/10 border border-[#4040E8]/20 rounded-lg px-3 py-2">
              <span className="text-[10px] text-[#818CF8] uppercase tracking-wider">Investimento</span>
              <span className="text-sm font-black text-[#818CF8]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.totalSpend)}
              </span>
            </div>

            {activeCampaignCount > 0 && (
              <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-xs font-semibold text-[#22C55E]">
                  {activeCampaignCount} campanha{activeCampaignCount !== 1 ? 's' : ''} ativa{activeCampaignCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {!report.visible_to_client && isAdmin && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/20 text-[#D4A017]">
                Rascunho
              </span>
            )}
            {report.visible_to_client && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
                Publicado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <CSVReportTabs data={content} htmlReport={htmlReport} />

      <PortalFooter
        clientName={client?.name ?? content.clientName}
        periodStart={content.periodStart}
        periodEnd={content.periodEnd}
        totalInvestment={content.totalSpend}
      />
    </div>
  );
}
