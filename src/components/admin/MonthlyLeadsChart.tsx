'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ComposedChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Info, TrendingUp, Users, DollarSign, MousePointer } from 'lucide-react';
import type { Metric, Report } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function brl(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt(v: number) {
  return v.toLocaleString('pt-BR');
}
function fdate(d: string) {
  return format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR });
}
function fmonth(d: string) {
  return format(new Date(d + 'T12:00:00'), "MMM 'yy", { locale: ptBR });
}

function isEvenlyDistributed(metrics: Metric[]): boolean {
  if (metrics.length < 3) return false;
  const values = metrics.map(m => m.conversions);
  const first = values[0];
  return values.every(v => Math.abs(v - first) <= 0.01);
}

// ── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const get = (name: string) => payload.find(p => p.name === name)?.value ?? 0;
  const leads = get('conversions');
  const spend = get('spend');
  const clicks = get('clicks');
  const cpl = leads > 0 ? spend / leads : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;

  return (
    <div className="bg-[#111827] border border-[#2a2a2a] rounded-lg p-3 text-xs shadow-xl min-w-[180px]">
      <p className="text-[#71717a] font-semibold mb-2 uppercase tracking-wide text-[10px]">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#22C55E]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            Leads
          </span>
          <span className="font-bold text-[#22C55E]">{fmt(leads)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#4040E8]">
            <span className="w-2 h-2 rounded-full bg-[#4040E8]" />
            Investimento
          </span>
          <span className="font-semibold text-white">{brl(spend)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#F59E0B]">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            Cliques
          </span>
          <span className="text-[#a1a1aa]">{fmt(clicks)}</span>
        </div>
        {(cpl > 0 || cpc > 0) && (
          <div className="border-t border-[#2a2a2a] pt-1.5 mt-1.5 space-y-1">
            {cpl > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#a1a1aa]">CPL</span>
                <span className="text-white">{brl(cpl)}</span>
              </div>
            )}
            {cpc > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#a1a1aa]">CPC</span>
                <span className="text-white">{brl(cpc)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary pills ────────────────────────────────────────────────────────────

function SummaryPill({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" style={{ color: accent ?? '#6b7280' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-sm font-bold text-gray-900 truncate" style={accent ? { color: accent } : {}}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  initialMetrics: Metric[];
  csvReports: Report[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function MonthlyLeadsChart({ clientId, initialMetrics, csvReports }: Props) {
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('default');
  const [loading, setLoading] = useState(false);

  const currentReport = csvReports.find(r => r.id === selectedPeriod) ?? null;

  // Period change → fetch metrics for CSV report window
  const changePeriod = useCallback(async (reportId: string) => {
    setSelectedPeriod(reportId);

    if (reportId === 'default') {
      setMetrics(initialMetrics);
      return;
    }

    const report = csvReports.find(r => r.id === reportId);
    if (!report) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        clientId,
        since: report.period_start,
        until: report.period_end,
      });
      const res = await fetch(`/api/admin/metrics?${params}`);
      if (res.ok) {
        const data: Metric[] = await res.json();
        setMetrics(data.length > 0 ? data : initialMetrics);
      }
    } catch {
      setMetrics(initialMetrics);
    } finally {
      setLoading(false);
    }
  }, [clientId, csvReports, initialMetrics]);

  // ── Computed values ────────────────────────────────────────────────────────

  const totalLeads    = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);
  const totalSpend    = metrics.reduce((s, m) => s + m.spend, 0);
  const totalClicks   = metrics.reduce((s, m) => s + m.clicks, 0);
  const cpl           = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const leadsPerDay   = metrics.length > 0 ? totalLeads / metrics.length : 0;
  const flat          = isEvenlyDistributed(metrics);

  const chartData = metrics.map(m => ({
    date:        fdate(m.date),
    conversions: m.conversions ?? 0,
    spend:       Math.round(m.spend * 100) / 100,
    clicks:      m.clicks,
  }));

  // ── Tick density: skip labels if too many points ──────────────────────────
  const tickEvery = chartData.length > 20 ? 3 : chartData.length > 10 ? 2 : 1;

  return (
    <div className="space-y-4">
      {/* Period selector + data source info */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Período:</span>
          <select
            value={selectedPeriod}
            onChange={e => changePeriod(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
          >
            <option value="default">
              Últimos {initialMetrics.length} dias
            </option>
            {csvReports.map(r => (
              <option key={r.id} value={r.id}>
                CSV: {r.period_start} → {r.period_end}
                {' '}({Math.round((new Date(r.period_end).getTime() - new Date(r.period_start).getTime()) / 86400000) + 1}d)
              </option>
            ))}
          </select>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4040E8]" />}
        </div>

        {flat && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <Info className="w-3 h-3 shrink-0" />
            Distribuição estimada (dados importados via CSV)
          </div>
        )}
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryPill
          icon={Users}
          label="Total de Leads"
          value={fmt(totalLeads)}
          sub={`${leadsPerDay.toFixed(1)} / dia`}
          accent="#22C55E"
        />
        <SummaryPill
          icon={DollarSign}
          label="Custo por Lead"
          value={cpl > 0 ? brl(cpl) : '—'}
          sub={`${fmt(totalLeads)} resultados`}
          accent="#4040E8"
        />
        <SummaryPill
          icon={TrendingUp}
          label="Investimento"
          value={brl(totalSpend)}
          sub={`${metrics.length} dias`}
          accent="#4040E8"
        />
        <SummaryPill
          icon={MousePointer}
          label="Cliques"
          value={fmt(totalClicks)}
          sub={totalLeads > 0 ? `Taxa conv. ${((totalLeads / totalClicks) * 100).toFixed(1)}%` : undefined}
          accent="#F59E0B"
        />
      </div>

      {/* Main chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#4040E8]" />
          </div>
        )}

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">
            Sem dados de métricas para este período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval={tickEvery - 1}
              />
              {/* Left Y axis — leads + clicks (counts) */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              {/* Right Y axis — spend (R$) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `R$${v}`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={v => v === 'conversions' ? 'Leads' : v === 'spend' ? 'Investimento' : 'Cliques'}
                wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
              />

              {/* Spend bars (background, right axis) */}
              <Bar
                yAxisId="right"
                dataKey="spend"
                fill="#4040E8"
                opacity={0.18}
                radius={[2, 2, 0, 0]}
              />

              {/* Clicks line (left axis, subtle) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />

              {/* Leads area (PRIMARY — left axis, bold) */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="conversions"
                stroke="#22C55E"
                strokeWidth={2.5}
                fill="url(#leadsGradient)"
                dot={chartData.length <= 15 ? { fill: '#22C55E', r: 3 } : false}
                activeDot={{ r: 5, fill: '#22C55E' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period context from CSV report */}
      {currentReport && (
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Período do relatório CSV selecionado: {currentReport.period_start} → {currentReport.period_end}
          {' · '}
          <a
            href={`/client/reports/csv/${currentReport.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4040E8] hover:underline"
          >
            Ver relatório completo ↗
          </a>
        </div>
      )}
    </div>
  );
}
