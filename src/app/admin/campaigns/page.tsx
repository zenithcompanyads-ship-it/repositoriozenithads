import { createClient } from '@/lib/supabase/server';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import { formatCurrency, formatNumber, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';
import type { Campaign, Client } from '@/types';

async function getCampaigns() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('*, clients(name, color, initials)')
    .order('spend', { ascending: false });
  return data ?? [];
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  const statusCounts = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão geral de todas as campanhas — {campaigns.length} campanhas
        </p>
      </div>

      {/* Status Summary */}
      <div className="flex gap-3 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="card px-4 py-2.5 flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusLabel(status)}
            </span>
            <span className="text-sm font-semibold text-gray-900">{count}</span>
          </div>
        ))}
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
                    Nenhuma campanha encontrada.
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
