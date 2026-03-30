import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Client, Metric } from '@/types';
import { ClientsViewManager } from '@/components/admin/ClientsViewManager';

async function getClientsData() {
  const supabase = await createClient();
  const today = new Date();
  const since = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];
  const [{ data: clients }, { data: metrics }, { data: reports }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('metrics').select('*').gte('date', since).lte('date', until),
    supabase.from('reports').select('client_id, created_at').order('created_at', { ascending: false }),
  ]);
  return { clients: clients ?? [], metrics: metrics ?? [], reports: reports ?? [] };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const query = params.q ?? '';

  const { clients, metrics, reports } = await getClientsData();

  const lastReportByClient: Record<string, string> = {};
  for (const r of reports) {
    if (!lastReportByClient[r.client_id]) {
      lastReportByClient[r.client_id] = r.created_at;
    }
  }

  const metricsByClient = metrics.reduce<Record<string, Metric[]>>((acc, m) => {
    if (!acc[m.client_id]) acc[m.client_id] = [];
    acc[m.client_id].push(m);
    return acc;
  }, {});

  let filtered = clients as Client[];
  if (filter === 'active') filtered = filtered.filter((c) => c.active);
  if (filter === 'paused') filtered = filtered.filter((c) => !c.active);
  if (query) filtered = filtered.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.segment ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const clientsWithStats = filtered.map((client) => {
    const cms = metricsByClient[client.id] ?? [];
    const spend = cms.reduce((s, m) => s + (m.spend ?? 0), 0);
    const impressions = cms.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const avgCtr = cms.length ? cms.reduce((s, m) => s + (m.ctr ?? 0), 0) / cms.length : 0;
    const budgetPct = client.monthly_budget > 0 ? Math.min((spend / client.monthly_budget) * 100, 100) : 0;
    const lastReportDate = lastReportByClient[client.id] ?? null;
    return { ...client, spend, impressions, avgCtr, budgetPct, lastReportDate };
  });

  const filterOpts = [
    { value: 'all',    label: 'Todos',    count: clients.length },
    { value: 'active', label: 'Ativos',   count: (clients as Client[]).filter(c => c.active).length },
    { value: 'paused', label: 'Pausados', count: (clients as Client[]).filter(c => !c.active).length },
  ];

  return (
    <div style={{ background: 'var(--adm-bg)', minHeight: '100vh', padding: '36px 40px', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--adm-accent)', marginBottom: 6 }}>
          Zenith · Gestão
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: 'var(--adm-text)', margin: 0 }}>
              Clientes<em style={{ color: 'var(--adm-accent)', fontStyle: 'italic' }}>.</em>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--adm-secondary)', marginTop: 6 }}>{clients.length} clientes cadastrados</p>
          </div>
          <Link href="/admin/clients/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--adm-accent)', color: 'var(--adm-accent-on)', fontSize: 13, fontWeight: 700,
            padding: '10px 18px', borderRadius: 8, textDecoration: 'none', letterSpacing: '-0.01em',
          }}>
            <Plus size={14} /> Novo cliente
          </Link>
        </div>
        <div style={{ width: 40, height: 2, background: 'var(--adm-accent)', borderRadius: 2, marginTop: 12, opacity: 0.6 }} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <form style={{ position: 'relative', flex: '0 0 auto' }}>
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar cliente..."
            style={{
              width: 220, padding: '8px 14px',
              background: 'var(--adm-card)', border: '1px solid var(--adm-border-strong)', borderRadius: 8,
              color: 'var(--adm-text)', fontSize: 13, outline: 'none',
            }}
          />
        </form>

        <div style={{ display: 'flex', gap: 4, background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 8, padding: 4 }}>
          {filterOpts.map((opt) => (
            <Link
              key={opt.value}
              href={`/admin/clients?filter=${opt.value}${query ? `&q=${query}` : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.12s',
                background: filter === opt.value ? 'var(--adm-accent)' : 'transparent',
                color: filter === opt.value ? 'var(--adm-accent-on)' : 'var(--adm-secondary)',
              }}
            >
              {opt.label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                background: filter === opt.value ? 'rgba(0,0,0,0.2)' : 'var(--adm-border)',
                color: filter === opt.value ? 'var(--adm-accent-on)' : 'var(--adm-muted)',
              }}>
                {opt.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      {clientsWithStats.length === 0 ? (
        <div style={{ background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--adm-secondary)', fontSize: 14, marginBottom: 16 }}>Nenhum cliente encontrado.</p>
          <Link href="/admin/clients/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--adm-accent)', color: 'var(--adm-accent-on)', fontSize: 13, fontWeight: 700,
            padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
          }}>
            <Plus size={14} /> Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <ClientsViewManager clients={clientsWithStats} />
      )}
    </div>
  );
}
