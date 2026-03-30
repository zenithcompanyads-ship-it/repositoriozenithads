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
    <div style={{ background: 'var(--adm-bg)', minHeight: '100vh', padding: '36px 40px', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--adm-accent)', marginBottom: 6 }}>
          Zenith · Meta Ads
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: 'var(--adm-text)', margin: 0 }}>
          Campanhas<em style={{ color: 'var(--adm-accent)', fontStyle: 'italic' }}>.</em>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--adm-secondary)', marginTop: 6 }}>
          {counts['all'] ?? 0} campanhas no total ·{' '}
          <span style={{ color: '#22C87A', fontWeight: 600 }}>{counts['ACTIVE'] ?? 0} ativas</span>
        </p>
        <div style={{ width: 40, height: 2, background: 'var(--adm-accent)', borderRadius: 2, marginTop: 12, opacity: 0.6 }} />
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(({ key, label }) => {
          const count = key === 'all' ? counts['all'] : counts[key];
          const isActive = status === key;
          return (
            <a
              key={key}
              href={key === 'all' ? '/admin/campaigns' : `/admin/campaigns?status=${key}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.12s', letterSpacing: '-0.01em',
                background: isActive ? 'var(--adm-accent)' : 'var(--adm-card)',
                color: isActive ? 'var(--adm-accent-on)' : 'var(--adm-secondary)',
                border: `1px solid ${isActive ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              }}
            >
              {label}
              {count != null && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                  background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--adm-border)',
                  color: isActive ? 'var(--adm-accent-on)' : 'var(--adm-muted)',
                }}>
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--adm-surface)', borderBottom: '1px solid var(--adm-border)' }}>
                {['Cliente', 'Campanha', 'Objetivo', 'Status', 'Orçamento', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Conversões'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 10,
                    fontWeight: 600, color: 'var(--adm-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--adm-muted)', fontSize: 13 }}>
                    Nenhuma campanha encontrada para este filtro.
                  </td>
                </tr>
              ) : campaigns.map((c: Campaign & { clients?: Client }, idx) => {
                const sc = statusColor(c.status);
                const initials = c.clients ? (c.clients.initials ?? c.clients.name?.slice(0, 2).toUpperCase()) : '?';
                const avatarColor = c.clients?.color ?? '#C9A84C';
                return (
                  <tr key={c.id} className="dark-row" style={{ borderTop: idx > 0 ? '1px solid var(--adm-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: `linear-gradient(135deg,${avatarColor},${avatarColor}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <span style={{ color: 'var(--adm-secondary)', fontSize: 12 }}>{c.clients?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--adm-text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-secondary)' }}>{c.objective ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      }}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatCurrency(c.budget)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatNumber(c.impressions)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatNumber(c.clicks)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatPercent(c.ctr)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatCurrency(c.cpc)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatNumber(c.conversions)}</td>
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
