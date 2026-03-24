import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatMonthYear,
} from '@/lib/utils';
import { Plus, Search, ArrowRight } from 'lucide-react';
import type { Client, Metric } from '@/types';

async function getClientsData() {
  const supabase = await createClient();

  const today = new Date();
  const since = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const until = today.toISOString().split('T')[0];

  const [{ data: clients }, { data: metrics }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('metrics').select('*').gte('date', since).lte('date', until),
  ]);

  return { clients: clients ?? [], metrics: metrics ?? [] };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const query = params.q ?? '';

  const { clients, metrics } = await getClientsData();

  const metricsByClient = metrics.reduce<Record<string, Metric[]>>((acc, m) => {
    if (!acc[m.client_id]) acc[m.client_id] = [];
    acc[m.client_id].push(m);
    return acc;
  }, {});

  let filtered = clients as Client[];
  if (filter === 'active') filtered = filtered.filter((c) => c.active);
  if (filter === 'paused') filtered = filtered.filter((c) => !c.active);
  if (query) {
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.segment ?? '').toLowerCase().includes(query.toLowerCase())
    );
  }

  const clientsWithStats = filtered.map((client) => {
    const cms = metricsByClient[client.id] ?? [];
    const spend = cms.reduce((s, m) => s + (m.spend ?? 0), 0);
    const impressions = cms.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const avgCtr =
      cms.length ? cms.reduce((s, m) => s + (m.ctr ?? 0), 0) / cms.length : 0;
    const budgetPct =
      client.monthly_budget > 0
        ? Math.min((spend / client.monthly_budget) * 100, 100)
        : 0;
    return { ...client, spend, impressions, avgCtr, budgetPct };
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length} clientes cadastrados
          </p>
        </div>
        <Link href="/admin/clients/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo cliente
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <form className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar cliente..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
          />
        </form>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'paused', label: 'Pausados' },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={`/admin/clients?filter=${opt.value}${query ? `&q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {clientsWithStats.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum cliente encontrado.</p>
          <Link href="/admin/clients/new" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />
            Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {clientsWithStats.map((client) => (
            <div key={client.id} className="card p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <ClientAvatar
                  name={client.name}
                  color={client.color}
                  initials={client.initials}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {client.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {client.segment ?? 'Sem segmento'}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    client.active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {client.active ? 'Ativo' : 'Pausado'}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Impressões</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatNumber(client.impressions)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">CTR</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatPercent(client.avgCtr)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Investido</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatCurrency(client.spend)}
                  </p>
                </div>
              </div>

              {/* Budget Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Orçamento mensal</span>
                  <span className="font-medium text-orange-600">
                    {client.budgetPct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${client.budgetPct}%`,
                      backgroundColor:
                        client.budgetPct > 90
                          ? '#EF4444'
                          : client.budgetPct > 70
                          ? '#FF4D00'
                          : '#4040E8',
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  Desde{' '}
                  {client.since_date ? formatMonthYear(client.since_date) : '—'}
                </span>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="text-xs text-[#4040E8] font-medium hover:underline flex items-center gap-1"
                >
                  Ver relatório
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
