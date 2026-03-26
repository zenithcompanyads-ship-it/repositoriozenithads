import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single();

  if (!userData?.client_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090D06]">
        <p className="text-[#6E7090] text-sm">Conta não vinculada a um cliente. Contate o suporte.</p>
      </div>
    );
  }

  // Redirect to the latest published CSV report
  const { data: reports } = await supabase
    .from('reports')
    .select('id')
    .eq('client_id', userData.client_id)
    .eq('type', 'csv_analysis')
    .eq('visible_to_client', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (reports && reports.length > 0) {
    redirect(`/client/reports`);
  }

  // No report published yet
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090D06]">
      <div className="text-center">
        <p className="text-[#9FE870] text-4xl font-bold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          ZENITH
        </p>
        <p className="text-[#6E7090] text-sm mt-4">Seu relatório será disponibilizado em breve.</p>
      </div>
    </div>
  );
}
