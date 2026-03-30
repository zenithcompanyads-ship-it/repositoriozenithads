import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ClientMonthlyReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) redirect('/client/reports');

  const { data: reports } = await supabase
    .from('reports')
    .select('id')
    .eq('client_id', userData.client_id)
    .eq('type', 'monthly')
    .eq('visible_to_client', true)
    .order('period_start', { ascending: false })
    .limit(1);

  const latestReport = reports?.[0];

  if (!latestReport) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
        color: '#71717a',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ fontSize: 48 }}>📊</div>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#a1a1aa' }}>Relatório mensal ainda não disponível</p>
        <p style={{ fontSize: 13, color: '#71717a', textAlign: 'center', maxWidth: 320 }}>
          O relatório será publicado pelo seu gestor ao final do mês.
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={`/api/reports/html/${latestReport.id}`}
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      title="Relatório Mensal"
    />
  );
}
