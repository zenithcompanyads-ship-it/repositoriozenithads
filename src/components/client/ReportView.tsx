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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Investido', value: formatCurrency(totalSpend) },
          { label: 'Impressões', value: formatNumber(totalImpressions) },
          { label: 'Cliques', value: formatNumber(totalClicks) },
          { label: 'CTR médio', value: formatPercent(avgCtr) },
          { label: 'ROAS', value: `${avgRoas.toFixed(2)}x` },
        ].map((m) => (
          <div key={m.label} className="portal-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-1">{m.label}</p>
            <p className="text-lg font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="portal-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Evolução — últimos {days} dias
        </h3>
        <MetricsChart metrics={metrics} fields={['spend', 'clicks', 'impressions']} height={260} dark />
      </div>

      {/* Latest Report Analysis */}
      {latestReport ? (
        <div className="portal-card p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4040E8]" />
              <h3 className="text-base font-semibold text-white">
                Análise do período
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#71717a]">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatDate(latestReport.period_start)} —{' '}
                {formatDate(latestReport.period_end)}
              </span>
            </div>
          </div>
          <div className="bg-[#0f0f0f] rounded-xl p-5 text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap border border-[#1e1e1e]">
            {latestReport.admin_edited_analysis ?? latestReport.claude_analysis ?? ''}
          </div>
        </div>
      ) : (
        <div className="portal-card p-10 text-center">
          <FileText className="w-10 h-10 text-[#2a2a2a] mx-auto mb-3" />
          <p className="text-[#71717a] text-sm">
            Nenhum relatório disponível para este período.
          </p>
          <p className="text-[#4a4a4a] text-xs mt-1">
            O relatório será disponibilizado em breve pela equipe Zenith.
          </p>
        </div>
      )}

      {/* Previous Reports */}
      {reports.length > 1 && (
        <div className="portal-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e1e]">
            <h3 className="text-sm font-semibold text-white">Relatórios anteriores</h3>
          </div>
          <div className="divide-y divide-[#1e1e1e]">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-white">
                    {getPeriodLabel(r.type)}
                  </span>
                  <span className="text-xs text-[#71717a] ml-3">
                    {formatDate(r.period_start)} — {formatDate(r.period_end)}
                  </span>
                </div>
                <span className="text-xs text-[#71717a]">{formatDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
