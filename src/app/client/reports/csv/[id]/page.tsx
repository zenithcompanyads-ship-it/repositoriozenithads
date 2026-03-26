import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PortalFooter } from '@/components/client/PortalFooter';

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
  const content = report.content_json as { source?: string; clientName?: string; periodStart?: string; periodEnd?: string; totalSpend?: number };
  const htmlReport: string | null = report.claude_analysis ?? null;

  // Validate content_json has expected shape
  if (!content || content.source !== 'csv') notFound();

  const backHref = isAdmin
    ? `/admin/clients/${report.client_id}`
    : '/client/reports/monthly';

  return (
    <div className="min-h-screen bg-[#08090D]">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#1F2030] bg-[#0E0F15] sticky top-0 z-[200]">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-[#6E7090] hover:text-[#ECEEF8] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {isAdmin ? 'Voltar ao cliente' : 'Relatórios'}
        </Link>

        <div className="flex items-center gap-3">
          {!report.visible_to_client && isAdmin && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C8A030]/10 border border-[#C8A030]/20 text-[#EAC860]">
              Rascunho
            </span>
          )}
          {report.visible_to_client && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#12C47C]/10 border border-[#12C47C]/20 text-[#6EEDB0]">
              Publicado
            </span>
          )}
        </div>
      </div>

      {/* HTML Report */}
      {htmlReport ? (
        <div
          className="w-full"
          dangerouslySetInnerHTML={{ __html: htmlReport }}
        />
      ) : (
        <div className="p-8 text-center text-[#6E7090] text-sm">
          Relatório ainda não gerado.
        </div>
      )}

      <PortalFooter
        clientName={client?.name ?? content.clientName}
        periodStart={content.periodStart}
        periodEnd={content.periodEnd}
        totalInvestment={content.totalSpend}
      />
    </div>
  );
}
