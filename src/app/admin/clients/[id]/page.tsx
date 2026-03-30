import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    { data: documents },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('metrics').select('*').eq('client_id', id).gte('date', since).lte('date', until).order('date'),
    supabase.from('campaigns').select('*').eq('client_id', id).order('spend', { ascending: false }),
    supabase.from('reports').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('alerts').select('*').eq('client_id', id).order('triggered_at', { ascending: false }),
    supabase.from('goals').select('*').eq('client_id', id),
    supabase.from('monthly_plans').select('*').eq('client_id', id).order('month', { ascending: false }),
    supabase.from('client_documents').select('*').eq('client_id', id).order('created_at', { ascending: false }),
  ]);

  return {
    client,
    metrics: metrics ?? [],
    campaigns: campaigns ?? [],
    reports: reports ?? [],
    alerts: alerts ?? [],
    goals: goals ?? [],
    plans: plans ?? [],
    documents: documents ?? [],
  };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, metrics, campaigns, reports, alerts, goals, plans, documents } =
    await getClientData(id);

  if (!client) notFound();

  const initials = client.initials ?? client.name.slice(0, 2).toUpperCase();
  const avatarColor = client.color ?? '#C9A84C';

  return (
    <div style={{ background: 'var(--adm-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '20px 32px 0',
        borderBottom: '1px solid var(--adm-border)',
        background: 'var(--adm-surface)',
      }}>
        <Link
          href="/admin/clients"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--adm-secondary)',
            textDecoration: 'none',
            marginBottom: 16,
            transition: 'color 0.15s',
          }}
        >
          <ArrowLeft size={13} />
          Clientes
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
            border: `2px solid ${avatarColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            letterSpacing: '0.04em',
          }}>
            {initials}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--adm-text)',
              margin: 0,
              lineHeight: 1.2,
            }}>
              {client.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              {client.segment && (
                <span style={{ fontSize: 12, color: 'var(--adm-secondary)' }}>{client.segment}</span>
              )}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '3px 10px',
                borderRadius: 999,
                background: client.active ? 'rgba(34,200,122,0.12)' : 'rgba(242,112,61,0.12)',
                color: client.active ? '#22C87A' : '#F2703D',
                border: `1px solid ${client.active ? 'rgba(34,200,122,0.3)' : 'rgba(242,112,61,0.3)'}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                {client.active ? 'Ativo' : 'Pausado'}
              </span>
              {client.since_date && (
                <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                  Desde {formatMonthYear(client.since_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <ClientTabsSection
        client={client}
        metrics={metrics}
        campaigns={campaigns}
        reports={reports}
        alerts={alerts}
        goals={goals}
        plans={plans}
        documents={documents}
      />
    </div>
  );
}
