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
      <div className="flex items-center justify-end gap-3 mb-6">

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(v => !v)}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {currentSortLabel}
            <ChevronDown size={14} />
          </button>
          {sortOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-gray-200 rounded-lg p-2 min-w-[180px] shadow-lg">
              {SORT_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false); }}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    sort === opt.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-1 flex gap-1">
          {(['grid', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                view === v
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((client) => {
            const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
            const avatarColor = client.color ?? '#60A5FA';
            const barColor = client.budgetPct > 90 ? '#F87171' : client.budgetPct > 70 ? '#FBBF24' : '#3B82F6';

            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`} className="block group">
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 h-full flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`,
                          border: `1.5px solid ${avatarColor}60`,
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {client.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{client.segment ?? 'Sem segmento'}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 border ${
                      client.active
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {client.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 grid grid-cols-3 gap-2 text-center mb-4">
                    {[
                      { label: 'Impressões', value: formatNumber(client.impressions) },
                      { label: 'CTR',        value: formatPercent(client.avgCtr) },
                      { label: 'Investido',  value: formatCurrency(client.spend) },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="text-xs text-gray-500 font-semibold mb-1 uppercase">{m.label}</div>
                        <div className="text-sm font-bold text-gray-900">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-auto">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-500">
                        {client.lastReportDate
                          ? `Relatório: ${fmtLastReport(client.lastReportDate)}`
                          : `Desde ${client.since_date ? formatMonthYear(client.since_date) : '—'}`}
                      </span>
                      <span className="font-semibold" style={{ color: barColor }}>{client.budgetPct.toFixed(0)}% do orçamento</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`,
                          width: `${client.budgetPct}%`
                        }}
                      />
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Cliente', 'Segmento', 'Status', 'Investido', 'Impressões', 'CTR', 'Orçamento', 'Último relatório'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => {
                const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
                const avatarColor = client.color ?? '#60A5FA';
                const barColor = client.budgetPct > 90 ? '#F87171' : client.budgetPct > 70 ? '#FBBF24' : '#3B82F6';
                return (
                  <tr key={client.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${client.id}`} className="text-gray-900 font-semibold hover:text-blue-600 transition-colors flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`,
                            border: `1.5px solid ${avatarColor}60`,
                          }}
                        >
                          {initials}
                        </div>
                        <span>{client.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.segment ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        client.active
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {client.active ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{formatCurrency(client.spend)}</td>
                    <td className="px-4 py-3 text-gray-900">{formatNumber(client.impressions)}</td>
                    <td className="px-4 py-3 text-gray-900">{formatPercent(client.avgCtr)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              background: barColor,
                              width: `${client.budgetPct}%`
                            }}
                          />
                        </div>
                        <span className="font-semibold text-xs" style={{ color: barColor }}>{client.budgetPct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs ${client.lastReportDate ? 'text-gray-900' : 'text-gray-500'}`}>
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
