import { createClient } from '@/lib/supabase/server';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import { formatCurrency, formatNumber, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';
import type { Campaign, Client } from '@/types';

const STATUS_FILTERS = [
  { key: 'all',      label: 'Todas' },
  { key: 'ACTIVE',   label: 'Ativas' },
  { key: 'PAUSED',   label: 'Pausadas' },
  { key: 'ARCHIVED', label: 'Arquivadas' },
  { key: 'INACTIVE', label: 'Inativas' },
] as const;

async function getCampaigns(statusFilter: string) {
  const supabase = await createClient();
  let query = supabase
    .from('campaigns')
    .select('*, clients(name, color, initials)')
    .order('spend', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data } = await query;
  return data ?? [];
}

async function getCounts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('status');

  const counts: Record<string, number> = { all: 0 };
  for (const row of data ?? []) {
    counts['all'] = (counts['all'] ?? 0) + 1;
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = 'all' } = await searchParams;
  const [campaigns, counts] = await Promise.all([getCampaigns(status), getCounts()]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {counts['all'] ?? 0} campanhas no total ·{' '}
          <span className="text-emerald-600 font-medium">{counts['ACTIVE'] ?? 0} ativas</span>
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(({ key, label }) => {
          const count = key === 'all' ? counts['all'] : counts[key];
          const isActive = status === key;
          return (
            <a
              key={key}
              href={key === 'all' ? '/admin/campaigns' : `/admin/campaigns?status=${key}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                isActive
                  ? 'bg-[#4040E8] text-white border-[#4040E8]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#4040E8]/40 hover:text-[#4040E8]'
              }`}
            >
              {label}
              {count != null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Campaigns Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Cliente', 'Campanha', 'Objetivo', 'Status', 'Orçamento', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Conversões'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma campanha encontrada para este filtro.
                  </td>
                </tr>
              ) : campaigns.map((c: Campaign & { clients?: Client }) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.clients && (
                        <ClientAvatar
                          name={c.clients.name}
                          color={c.clients.color}
                          initials={c.clients.initials}
                          size="sm"
                        />
                      )}
                      <span className="text-gray-700 text-xs">{c.clients?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.objective ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(c.budget)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(c.impressions)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(c.clicks)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatPercent(c.ctr)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(c.cpc)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatNumber(c.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
