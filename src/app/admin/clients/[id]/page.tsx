import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import { ClientTabsSection } from './ClientTabsSection';
import { formatMonthYear } from '@/lib/utils';

async function getClientData(id: string) {
  const supabase = await createSupabaseClient();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];

  const [
    { data: client },
    { data: metrics },
    { data: campaigns },
    { data: reports },
    { data: alerts },
    { data: goals },
    { data: plans },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('metrics').select('*').eq('client_id', id).gte('date', since).lte('date', until).order('date'),
    supabase.from('campaigns').select('*').eq('client_id', id).order('spend', { ascending: false }),
    supabase.from('reports').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('alerts').select('*').eq('client_id', id).order('triggered_at', { ascending: false }),
    supabase.from('goals').select('*').eq('client_id', id),
    supabase.from('monthly_plans').select('*').eq('client_id', id).order('month', { ascending: false }),
  ]);

  return {
    client,
    metrics: metrics ?? [],
    campaigns: campaigns ?? [],
    reports: reports ?? [],
    alerts: alerts ?? [],
    goals: goals ?? [],
    plans: plans ?? [],
  };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, metrics, campaigns, reports, alerts, goals, plans } =
    await getClientData(id);

  if (!client) notFound();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/clients" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <ClientAvatar
            name={client.name}
            color={client.color}
            initials={client.initials}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">{client.segment ?? 'Sem segmento'}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  client.active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {client.active ? 'Ativo' : 'Pausado'}
              </span>
              {client.since_date && (
                <span className="text-xs text-gray-400">
                  Desde {formatMonthYear(client.since_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section (client component) */}
      <ClientTabsSection
        client={client}
        metrics={metrics}
        campaigns={campaigns}
        reports={reports}
        alerts={alerts}
        goals={goals}
        plans={plans}
      />
    </div>
  );
}
