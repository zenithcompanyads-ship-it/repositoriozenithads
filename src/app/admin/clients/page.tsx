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
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white">

      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <div className="text-xs text-blue-600 font-semibold tracking-widest uppercase mb-4">
          Gestão de Clientes
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
              Clientes<span className="text-blue-600">.</span>
            </h1>
            <p className="text-sm text-gray-600 font-light mt-2">{clients.length} clientes cadastrados</p>
          </div>
          <Link href="/admin/clients/new" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 self-start sm:self-auto transition-colors">
            <Plus size={16} /> Novo cliente
          </Link>
        </div>
        <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mt-6" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-8">
        <form className="flex-1 sm:flex-none">
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar cliente..."
            className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-wrap sm:flex-nowrap gap-2">
          {filterOpts.map((opt) => (
            <Link
              key={opt.value}
              href={`/admin/clients?filter=${opt.value}${query ? `&q=${query}` : ''}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === opt.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {opt.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === opt.value
                  ? 'bg-blue-200 text-blue-700'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {opt.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      {clientsWithStats.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-600 text-base mb-6">Nenhum cliente encontrado.</p>
          <Link href="/admin/clients/new" className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <div>
          <ClientsViewManager clients={clientsWithStats} />
        </div>
      )}
    </div>
  );
}
