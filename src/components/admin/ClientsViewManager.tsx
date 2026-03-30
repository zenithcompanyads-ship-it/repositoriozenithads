'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, ChevronDown } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, formatMonthYear } from '@/lib/utils';

export interface ClientWithStats {
  id: string;
  name: string;
  segment: string | null;
  active: boolean;
  color: string;
  initials: string | null;
  since_date: string | null;
  monthly_budget: number;
  spend: number;
  impressions: number;
  avgCtr: number;
  budgetPct: number;
  lastReportDate: string | null;
}

type SortKey = 'name' | 'spend' | 'lastReport' | 'budget';

const SORT_OPTS: { value: SortKey; label: string }[] = [
  { value: 'name',       label: 'Nome (A–Z)' },
  { value: 'spend',      label: 'Maior investimento' },
  { value: 'lastReport', label: 'Último relatório' },
  { value: 'budget',     label: 'Orçamento consumido' },
];

function sortClients(clients: ClientWithStats[], key: SortKey): ClientWithStats[] {
  return [...clients].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR');
      case 'spend':
        return b.spend - a.spend;
      case 'lastReport': {
        if (!a.lastReportDate && !b.lastReportDate) return 0;
        if (!a.lastReportDate) return 1;
        if (!b.lastReportDate) return -1;
        return b.lastReportDate.localeCompare(a.lastReportDate);
      }
      case 'budget':
        return b.budgetPct - a.budgetPct;
      default:
        return 0;
    }
  });
}

function fmtLastReport(date: string | null): string {
  if (!date) return 'Sem relatório';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
  return formatMonthYear(date);
}

export function ClientsViewManager({ clients }: { clients: ClientWithStats[] }) {
  const [view, setView]   = useState<'grid' | 'list'>('grid');
  const [sort, setSort]   = useState<SortKey>('name');
  const [sortOpen, setSortOpen] = useState(false);

  const sorted = useMemo(() => sortClients(clients, sort), [clients, sort]);

  const currentSortLabel = SORT_OPTS.find(o => o.value === sort)?.label ?? 'Ordenar';

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>

        {/* Sort dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'var(--adm-card)', border: '1px solid var(--adm-border-strong)', color: 'var(--adm-secondary)',
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            {currentSortLabel}
            <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
              background: 'var(--adm-card)', border: '1px solid var(--adm-border-strong)', borderRadius: 8,
              padding: 4, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}>
              {SORT_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: sort === opt.value ? 'var(--adm-accent-subtle)' : 'transparent',
                    color: sort === opt.value ? 'var(--adm-accent)' : 'var(--adm-body)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--adm-card)', border: '1px solid var(--adm-border-strong)', borderRadius: 8, padding: 2 }}>
          {(['grid', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--adm-border)' : 'transparent',
                color: view === v ? 'var(--adm-accent)' : 'var(--adm-muted)',
              }}
            >
              {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {sorted.map((client) => {
            const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
            const avatarColor = client.color ?? '#C9A84C';
            const barColor = client.budgetPct > 90 ? '#F2703D' : client.budgetPct > 70 ? '#E8D48A' : 'var(--adm-accent)';

            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                <div className="dark-card">
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: `linear-gradient(135deg,${avatarColor},${avatarColor}88)`,
                      border: `1.5px solid ${avatarColor}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 2 }}>{client.segment ?? 'Sem segmento'}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 999, flexShrink: 0,
                      background: client.active ? 'rgba(34,200,122,0.12)' : 'rgba(242,112,61,0.12)',
                      color: client.active ? '#22C87A' : '#F2703D',
                      border: `1px solid ${client.active ? 'rgba(34,200,122,0.3)' : 'rgba(242,112,61,0.3)'}`,
                    }}>
                      {client.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', borderTop: '1px solid var(--adm-border)', borderBottom: '1px solid var(--adm-border)' }}>
                    {[
                      { label: 'Impressões', value: formatNumber(client.impressions) },
                      { label: 'CTR',        value: formatPercent(client.avgCtr) },
                      { label: 'Investido',  value: formatCurrency(client.spend) },
                    ].map((m, i) => (
                      <div key={m.label} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--adm-border)' : 'none' }}>
                        <div style={{ fontSize: 10, color: 'var(--adm-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-body)' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 6 }}>
                      <span style={{ color: 'var(--adm-muted)' }}>
                        {client.lastReportDate
                          ? `Relatório: ${fmtLastReport(client.lastReportDate)}`
                          : `Desde ${client.since_date ? formatMonthYear(client.since_date) : '—'}`}
                      </span>
                      <span style={{ color: barColor, fontWeight: 600 }}>{client.budgetPct.toFixed(0)}% do orçamento</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--adm-border)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${barColor},${barColor === 'var(--adm-accent)' ? 'var(--adm-accent-light)' : barColor + '88'})`, width: `${client.budgetPct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div style={{ background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--adm-surface)', borderBottom: '1px solid var(--adm-border)' }}>
                {['Cliente', 'Segmento', 'Status', 'Investido', 'Impressões', 'CTR', 'Orçamento', 'Último relatório'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 10,
                    fontWeight: 600, color: 'var(--adm-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((client, idx) => {
                const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
                const avatarColor = client.color ?? '#C9A84C';
                const barColor = client.budgetPct > 90 ? '#F2703D' : client.budgetPct > 70 ? '#E8D48A' : 'var(--adm-accent)';
                return (
                  <tr key={client.id} className="dark-row" style={{ borderTop: idx > 0 ? '1px solid var(--adm-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/clients/${client.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg,${avatarColor},${avatarColor}88)`,
                          border: `1.5px solid ${avatarColor}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff',
                        }}>
                          {initials}
                        </div>
                        <span style={{ color: 'var(--adm-text)', fontWeight: 500 }}>{client.name}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-secondary)' }}>{client.segment ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                        background: client.active ? 'rgba(34,200,122,0.12)' : 'rgba(242,112,61,0.12)',
                        color: client.active ? '#22C87A' : '#F2703D',
                        border: `1px solid ${client.active ? 'rgba(34,200,122,0.3)' : 'rgba(242,112,61,0.3)'}`,
                      }}>
                        {client.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatCurrency(client.spend)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatNumber(client.impressions)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--adm-body)' }}>{formatPercent(client.avgCtr)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 3, background: 'var(--adm-border)', borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', borderRadius: 999, background: barColor, width: `${client.budgetPct}%` }} />
                        </div>
                        <span style={{ color: barColor, fontSize: 11, fontWeight: 600 }}>{client.budgetPct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: client.lastReportDate ? 'var(--adm-body)' : 'var(--adm-muted)', fontSize: 12 }}>
                      {fmtLastReport(client.lastReportDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
