import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatNumber, formatPercent, getStatusLabel } from '@/lib/utils';
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
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);
  const { data } = await query;
  return data ?? [];
}

async function getCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from('campaigns').select('status');
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

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return { bg: 'rgba(34,200,122,0.12)', color: '#22C87A', border: 'rgba(34,200,122,0.3)' };
    if (s === 'PAUSED') return { bg: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: 'rgba(201,168,76,0.3)' };
    return { bg: 'rgba(139,139,153,0.1)', color: '#8B8B99', border: 'rgba(139,139,153,0.2)' };
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-white">

      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <div className="text-xs text-blue-600 font-semibold tracking-widest uppercase mb-4">
          Meta Ads · Campanhas
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
          Campanhas<span className="text-blue-600">.</span>
        </h1>
        <p className="text-sm text-gray-600 font-light mt-2">
          {counts['all'] ?? 0} campanhas no total · <span className="text-emerald-600 font-semibold">{counts['ACTIVE'] ?? 0} ativas</span>
        </p>
        <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mt-6" />
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {STATUS_FILTERS.map(({ key, label }) => {
          const count = key === 'all' ? counts['all'] : counts[key];
          const isActive = status === key;
          return (
            <a
              key={key}
              href={key === 'all' ? '/admin/campaigns' : `/admin/campaigns?status=${key}`}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'text-white bg-blue-600 hover:bg-blue-700 border border-blue-600'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
              {count != null && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Cliente', 'Campanha', 'Objetivo', 'Status', 'Orçamento', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Conversões'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500 text-sm">
                    Nenhuma campanha encontrada para este filtro.
                  </td>
                </tr>
              ) : campaigns.map((c: Campaign & { clients?: Client }) => {
                const sc = statusColor(c.status);
                const initials = c.clients ? (c.clients.initials ?? c.clients.name?.slice(0, 2).toUpperCase()) : '?';
                const avatarColor = c.clients?.color ?? '#60A5FA';
                return (
                  <tr key={c.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`,
                            border: `1.5px solid ${avatarColor}60`,
                          }}
                        >
                          {initials}
                        </div>
                        <span className="text-gray-700 text-xs sm:text-sm">{c.clients?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate text-xs sm:text-sm">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs sm:text-sm">{c.objective ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                        style={{
                          background: sc.bg,
                          color: sc.color,
                          borderColor: sc.border,
                        }}
                      >
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-xs sm:text-sm">{formatCurrency(c.budget)}</td>
                    <td className="px-4 py-3 text-gray-900 text-xs sm:text-sm">{formatNumber(c.impressions)}</td>
                    <td className="px-4 py-3 text-gray-900 text-xs sm:text-sm">{formatNumber(c.clicks)}</td>
                    <td className="px-4 py-3 text-gray-900 text-xs sm:text-sm">{formatPercent(c.ctr)}</td>
                    <td className="px-4 py-3 text-gray-900 text-xs sm:text-sm">{formatCurrency(c.cpc)}</td>
                    <td className="px-4 py-3 text-gray-900 text-xs sm:text-sm">{formatNumber(c.conversions)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
