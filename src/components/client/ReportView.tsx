import { MetricsChart } from '@/components/ui/MetricsChart';
import { formatCurrency, formatNumber, formatPercent, formatDate, getPeriodLabel } from '@/lib/utils';
import type { Report, Metric } from '@/types';
import { FileText, Calendar } from 'lucide-react';

interface Props {
  reports: Report[];
  metrics: Metric[];
  days: number;
}

export function ReportView({ reports, metrics, days }: Props) {
  const latestReport = reports[0];

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const avgCtr = metrics.length ? metrics.reduce((s, m) => s + m.ctr, 0) / metrics.length : 0;
  const avgRoas = metrics.length ? metrics.reduce((s, m) => s + m.roas, 0) / metrics.length : 0;

  return (
    <div className="space-y-6">
      {/* Metrics Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Investido', value: formatCurrency(totalSpend) },
          { label: 'Impressões', value: formatNumber(totalImpressions) },
          { label: 'Cliques', value: formatNumber(totalClicks) },
          { label: 'CTR médio', value: formatPercent(avgCtr) },
          { label: 'ROAS', value: `${avgRoas.toFixed(2)}x` },
        ].map((m) => (
          <div key={m.label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Evolução — últimos {days} dias
        </h3>
        <MetricsChart metrics={metrics} fields={['spend', 'clicks', 'impressions']} height={260} />
      </div>

      {/* Latest Report Analysis */}
      {latestReport ? (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4040E8]" />
              <h3 className="text-base font-semibold text-gray-900">
                Análise do período
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatDate(latestReport.period_start)} —{' '}
                {formatDate(latestReport.period_end)}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {latestReport.admin_edited_analysis ?? latestReport.claude_analysis ?? ''}
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            Nenhum relatório disponível para este período.
          </p>
          <p className="text-gray-300 text-xs mt-1">
            O relatório será disponibilizado em breve pela equipe Zenith.
          </p>
        </div>
      )}

      {/* Previous Reports */}
      {reports.length > 1 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Relatórios anteriores</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {getPeriodLabel(r.type)}
                  </span>
                  <span className="text-xs text-gray-500 ml-3">
                    {formatDate(r.period_start)} — {formatDate(r.period_end)}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
