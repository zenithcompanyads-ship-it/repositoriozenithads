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

  return (
    <div>
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#1e1e1e]">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-[#71717a] hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {isAdmin ? 'Voltar ao cliente' : 'Relatórios mensais'}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/40 bg-[#4040E8]/10 mb-3">
              <span className="text-[10px] font-bold tracking-widest text-[#4040E8] uppercase">
                Zenith Company · Análise CSV
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{client?.name ?? content.clientName}</h1>
            <p className="text-[#a1a1aa] text-sm mt-1">
              {new Date(content.periodStart + 'T12:00:00').toLocaleDateString('pt-BR')} —{' '}
              {new Date(content.periodEnd + 'T12:00:00').toLocaleDateString('pt-BR')}
              &nbsp;·&nbsp; {content.numDays} dias
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-[#71717a]">Investimento Total</p>
            <p className="text-2xl font-bold text-[#4040E8]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.totalSpend)}
            </p>
            {!report.visible_to_client && isAdmin && (
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4A017]/10 text-[#D4A017]">
                Rascunho
              </span>
            )}
            {report.visible_to_client && (
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E]">
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
