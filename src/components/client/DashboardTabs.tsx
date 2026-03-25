'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MetricsChart } from '@/components/ui/MetricsChart';
import { formatCurrency, formatNumber, formatPercent, isActiveCampaign } from '@/lib/utils';
import type { Metric, Campaign } from '@/types';

interface MonthlyDataPoint {
  month: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
}

interface DashboardTabsProps {
  activeTab: string;
  metrics: Metric[];
  campaigns: Campaign[];
  monthlyData: MonthlyDataPoint[];
  analysisText: string | null;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalConversions: number;
  avgCpc: number;
  avgCpm: number;
  avgFrequency: number;
  costPerReach: number;
  periodDays: number;
  activeCampaigns: number;
}

const TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'funnel', label: 'Funil' },
  { key: 'analysis', label: 'Análise' },
];

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="portal-metric-card">
      <p className="text-[11px] uppercase tracking-widest text-[#71717a]">{label}</p>
      <p
        className="text-2xl font-bold text-white"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#71717a]">{sub}</p>}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-[#a1a1aa]">{label}</span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[10px] text-[#71717a] mt-1 text-right">{percent.toFixed(1)}%</p>
    </div>
  );
}

export function DashboardTabs({
  activeTab,
  metrics,
  campaigns,
  monthlyData,
  analysisText,
  totalSpend,
  totalImpressions,
  totalReach,
  totalClicks,
  totalConversions,
  avgCpc,
  avgCpm,
  avgFrequency,
  costPerReach,
  periodDays,
  activeCampaigns,
}: DashboardTabsProps) {
  const pathname = usePathname();

  // Campaigns arriving here are already pre-filtered to ACTIVE at the DB level
  const topCampaigns = campaigns
    .filter((c) => isActiveCampaign(c.status))
    .slice(0, 8);
  const maxSpend = topCampaigns.length > 0 ? topCampaigns[0].spend : 1;

  // Funnel relative percents (reach = 100% base)
  const baseReach = totalReach > 0 ? totalReach : 1;
  const funnelData = [
    { label: 'Alcance', value: formatNumber(totalReach), percent: 100, color: '#4040E8' },
    { label: 'Impressões', value: formatNumber(totalImpressions), percent: (totalImpressions / baseReach) * 100, color: '#6B4EFF' },
    { label: 'Cliques', value: formatNumber(totalClicks), percent: (totalClicks / baseReach) * 100, color: '#D4A017' },
    { label: 'Conversões', value: formatNumber(totalConversions), percent: (totalConversions / baseReach) * 100, color: '#22C55E' },
  ];

  // Monthly chart data
  const monthlyChartData = monthlyData.map((d) => ({
    name: d.month.substring(5), // MM
    spend: d.spend,
    clicks: d.clicks,
  }));

  const campaignChartData = topCampaigns.map((c) => ({
    name: c.name.length > 18 ? c.name.substring(0, 18) + '…' : c.name,
    spend: c.spend,
  }));

  return (
    <div>
      {/* In-page Tab Bar */}
      <div
        className="sticky top-16 z-40 flex items-center gap-1 px-8 py-3 border-b border-[#1e1e1e]"
        style={{ backgroundColor: 'var(--pt-tab-bg, #0a0a0a)' }}
      >
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`${pathname}?tab=${key}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#4040E8] text-white'
                : 'text-[#71717a] hover:text-white hover:bg-white/5'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-8 py-8">
        {/* VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Row 1 — 6 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard label="Investimento Total" value={formatCurrency(totalSpend)} accent="#4040E8" />
              <MetricCard label="Impressões" value={formatNumber(totalImpressions)} />
              <MetricCard label="Alcance" value={formatNumber(totalReach)} />
              <MetricCard label="Cliques" value={formatNumber(totalClicks)} />
              <MetricCard label="Conversões" value={formatNumber(totalConversions)} accent="#22C55E" />
              <MetricCard label="Dias de Campanha" value={String(periodDays)} />
            </div>

            {/* Row 2 — 4 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Custo por Alcance" value={formatCurrency(costPerReach)} />
              <MetricCard label="CPC Médio" value={formatCurrency(avgCpc)} />
              <MetricCard label="CPM Médio" value={formatCurrency(avgCpm)} />
              <MetricCard label="Frequência" value={avgFrequency.toFixed(2)} />
            </div>

            {/* Row 3 — 2 charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="portal-card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Evolução de Investimento — 30 dias
                </h3>
                <MetricsChart metrics={metrics} fields={['spend', 'clicks']} height={240} dark />
              </div>
              <div className="portal-card p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Campanhas por Investimento
                </h3>
                {campaignChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={campaignChartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                        tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#fff',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Investido']}
                      />
                      <Bar dataKey="spend" fill="#4040E8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-[#71717a] text-sm">
                    Nenhuma campanha disponível
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FUNIL */}
        {activeTab === 'funnel' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Funnel bars */}
            <div className="lg:col-span-2 portal-card p-6">
              <h3 className="text-sm font-semibold text-white mb-6">Funil de Performance</h3>
              {funnelData.map((item) => (
                <FunnelBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  percent={Math.min(item.percent, 100)}
                  color={item.color}
                />
              ))}
              <div className="mt-6 pt-4 border-t border-[#1e1e1e]">
                <p className="text-[11px] uppercase tracking-widest text-[#71717a] mb-1">
                  Investimento total no período
                </p>
                <p className="text-xl font-bold text-[#4040E8]">{formatCurrency(totalSpend)}</p>
              </div>
            </div>

            {/* Right: Top campaigns + breakdown */}
            <div className="lg:col-span-3 space-y-4">
              <div className="portal-card p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Top Campanhas por Investimento</h3>
                {topCampaigns.length === 0 ? (
                  <p className="text-[#71717a] text-sm">Nenhuma campanha disponível.</p>
                ) : (
                  <div className="space-y-3">
                    {topCampaigns.map((c, idx) => {
                      const barPct = maxSpend > 0 ? (c.spend / maxSpend) * 100 : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#a1a1aa] truncate max-w-[60%]">
                              <span className="text-[#71717a] mr-1.5">#{idx + 1}</span>
                              {c.name}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {formatCurrency(c.spend)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${barPct}%`, backgroundColor: '#4040E8' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active campaigns investment summary */}
              <div className="portal-card p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Resumo das Campanhas Ativas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#22C55E]">{topCampaigns.length}</p>
                    <p className="text-xs text-[#71717a] mt-0.5">Campanhas ativas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#4040E8]">
                      {formatCurrency(topCampaigns.reduce((s, c) => s + c.spend, 0))}
                    </p>
                    <p className="text-xs text-[#71717a] mt-0.5">Investimento top 8</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANÁLISE */}
        {activeTab === 'analysis' && (
          <div className="max-w-3xl">
            <div className="portal-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-[#4040E8]" />
                <h3 className="text-sm font-semibold text-white">Análise de Performance — IA Zenith</h3>
              </div>
              {analysisText ? (
                <div className="prose prose-invert max-w-none">
                  <div className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">
                    {analysisText}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-[#1e1e1e] flex items-center justify-center mx-auto mb-4">
                    <span className="text-[#71717a] text-xl">✦</span>
                  </div>
                  <p className="text-[#71717a] text-sm">
                    Nenhuma análise publicada ainda.
                  </p>
                  <p className="text-[#4a4a4a] text-xs mt-1">
                    Sua equipe Zenith publicará a análise em breve.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
