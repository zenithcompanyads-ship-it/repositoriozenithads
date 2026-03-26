import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PortalClientPage } from '@/components/client/PortalClientPage';

export default async function ClientReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) redirect('/client/dashboard');

  const clientId = userData.client_id;

  const [
    { data: client },
    { data: reports },
    { data: dbCampaigns },
  ] = await Promise.all([
    supabase.from('clients')
      .select('name, initials, color, avatar_url, segment')
      .eq('id', clientId).single(),
    supabase.from('reports')
      .select('id, period_start, period_end, created_at, content_json, type')
      .eq('client_id', clientId)
      .eq('type', 'csv_analysis')
      .eq('visible_to_client', true)
      .order('period_start', { ascending: false }),
    supabase.from('campaigns')
      .select('name, status, objective, result_type, spend, impressions, conversions, reach, budget')
      .eq('client_id', clientId)
      .order('spend', { ascending: false }),
  ]);

  return (
    <PortalClientPage
      client={client ?? { name: 'Cliente', initials: null, color: '#9FE870', avatar_url: null, segment: null }}
      reports={reports ?? []}
      dbCampaigns={dbCampaigns ?? []}
    />
  );
}
