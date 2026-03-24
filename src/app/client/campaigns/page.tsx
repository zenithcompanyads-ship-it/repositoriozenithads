import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatCurrency, formatNumber, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) return [];

  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', userData.client_id)
    .order('spend', { ascending: false });

  return data ?? [];
}

export default async function ClientCampaignsPage() {
  const campaigns = await getData();
  const active = campaigns.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {active} campanha{active !== 1 ? 's' : ''} ativa{active !== 1 ? 's' : ''} de {campaigns.length} total
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Campanha', 'Objetivo', 'Status', 'Orçamento', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Investido'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma campanha disponível.
                  </td>
                </tr>
              ) : campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">{c.name}</td>
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
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(c.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
