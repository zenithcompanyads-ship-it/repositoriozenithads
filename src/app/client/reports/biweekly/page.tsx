import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportView } from '@/components/client/ReportView';

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

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', userData.client_id)
    .eq('type', 'biweekly')
    .eq('visible_to_client', true)
    .order('created_at', { ascending: false });

  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('client_id', userData.client_id)
    .gte('date', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date');

  return { reports: reports ?? [], metrics: metrics ?? [] };
}

export default async function BiweeklyReportPage() {
  const data = await getData();
  if (!data) {
    return <div className="p-8 text-[#71717a]">Conta não vinculada.</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/40 bg-[#4040E8]/10 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#4040E8] uppercase">
            Zenith Company · Análise Quinzenal
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Relatório Quinzenal</h1>
        <p className="text-sm text-[#71717a]">Análise de performance dos últimos 15 dias</p>
      </div>
      <ReportView reports={data.reports} metrics={data.metrics} days={15} />
    </div>
  );
}
