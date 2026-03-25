import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatNumber, formatPercent, isActiveCampaign } from '@/lib/utils';
import type { Campaign } from '@/types';

async function getData(showAll: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single();

  if (!userData?.client_id) return { campaigns: [] as Campaign[], total: 0 };

  // Default: only active campaigns — real DB filter, not UI-only
  const activeQuery = supabase
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('client_id', userData.client_id)
    .eq('status', 'ACTIVE')
    .order('spend', { ascending: false });

  if (showAll) {
    const allQuery = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .eq('client_id', userData.client_id)
      .order('spend', { ascending: false });

    const [{ data: all, count: total }, { count: activeCount }] = await Promise.all([
      allQuery,
      supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', userData.client_id)
        .eq('status', 'ACTIVE'),
    ]);

    return {
      campaigns: (all ?? []) as Campaign[],
      total: total ?? 0,
      activeCount: activeCount ?? 0,
    };
  }

  const { data, count } = await activeQuery;
  return { campaigns: (data ?? []) as Campaign[], total: count ?? 0, activeCount: count ?? 0 };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE:   { label: 'ATIVO',      color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    PAUSED:   { label: 'PAUSADO',    color: '#D4A017', bg: 'rgba(212,160,23,0.12)' },
    DELETED:  { label: 'EXCLUÍDO',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    ARCHIVED: { label: 'ARQUIVADO',  color: '#71717a', bg: 'rgba(113,113,122,0.12)' },
    INACTIVE: { label: 'INATIVA',    color: '#71717a', bg: 'rgba(113,113,122,0.12)' },
  };
  const cfg = map[status] ?? map['INACTIVE'];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export default async function ClientCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const showAll = all === '1';
  const { campaigns, total, activeCount } = await getData(showAll);

  const inactiveCount = showAll ? total - (activeCount ?? 0) : undefined;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/40 bg-[#4040E8]/10 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#4040E8] uppercase">
            Zenith Company · Gestão de Tráfego
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {showAll ? 'Todas as Campanhas' : 'Campanhas Ativas'}
            </h1>
            <p className="text-sm text-[#71717a]">
              {showAll ? (
                <>
                  <span className="text-[#22C55E] font-semibold">{activeCount}</span> ativas ·{' '}
                  <span className="text-[#71717a] font-semibold">{inactiveCount}</span> inativas ·{' '}
                  <span className="text-[#a1a1aa]">{total}</span> total
                </>
              ) : (
                <>
                  <span className="text-[#22C55E] font-semibold">{total}</span>{' '}
                  campanha{total !== 1 ? 's' : ''} em veiculação
                </>
              )}
            </p>
          </div>

          {/* Toggle filter */}
          <div className="flex items-center gap-2">
            {showAll ? (
              <Link
                href="/client/campaigns"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 hover:bg-[#22C55E]/20 transition-colors"
              >
                Ver apenas ativas
              </Link>
            ) : (
              <Link
                href="/client/campaigns?all=1"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-white/5 text-[#71717a] border border-[#1e1e1e] hover:text-white hover:bg-white/10 transition-colors"
              >
                Ver todas (incluindo inativas)
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="portal-card p-12 text-center">
          <p className="text-[#71717a] text-sm">
            {showAll ? 'Nenhuma campanha disponível.' : 'Nenhuma campanha ativa no momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, idx) => (
            <div
              key={c.id}
              className={`portal-card p-5 transition-colors ${
                isActiveCampaign(c.status)
                  ? 'hover:border-[#2a2a2a]'
                  : 'opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-sm font-bold text-[#4040E8] shrink-0 tabular-nums w-6">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white break-words">{c.name}</p>
                    {c.objective && (
                      <p className="text-xs text-[#71717a] mt-0.5">{c.objective}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-[#1e1e1e]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-1">Impressões</p>
                  <p className="text-sm font-semibold text-white">{formatNumber(c.impressions)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-1">Cliques</p>
                  <p className="text-sm font-semibold text-white">{formatNumber(c.clicks)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-1">CTR</p>
                  <p className="text-sm font-semibold text-white">{formatPercent(c.ctr)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-1">Investido</p>
                  <p className="text-sm font-semibold text-[#4040E8]">{formatCurrency(c.spend)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-1">CPC</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(c.cpc)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
