import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WelcomeScreen } from '@/components/client/WelcomeScreen';

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

  const { data: clientData } = await supabase
    .from('clients')
    .select('name')
    .eq('id', userData.client_id)
    .single();

  // Check if there are published reports so we can redirect correctly
  const { data: reports } = await supabase
    .from('reports')
    .select('id')
    .eq('client_id', userData.client_id)
    .eq('visible_to_client', true)
    .limit(1);

  const hasReports = (reports?.length ?? 0) > 0;
  const redirectTo = hasReports ? '/client/reports' : '/client/documents';

  return (
    <WelcomeScreen
      clientName={clientData?.name ?? 'Cliente'}
      redirectTo={redirectTo}
    />
  );
}
