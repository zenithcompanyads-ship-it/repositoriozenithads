'use client';

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Campaign } from '@/types';

interface ChartDay {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  cpc: number;
}

interface Props {
  chartData: ChartDay[];
  campaigns: Campaign[];
  totalSpend: number;
  analysisText: string | null;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#fff',
};

export function MonthReportClient({ chartData, campaigns, totalSpend, analysisText }: Props) {
  const maxSpend   = campaigns[0]?.spend ?? 1;
  const totalLeads  = chartData.reduce((s, d) => s + d.conversions, 0);
  const totalClicks = chartData.reduce((s, d) => s + d.clicks, 0);
  const cpl         = totalLeads > 0 ? totalSpend / totalLeads : 0;

  return (
    <div className="space-y-6">
      {/* Chart 1 — Leads ao longo do tempo (PRIMARY) */}
      <div className="portal-card p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Evolução de Leads ao Longo do Tempo</h3>
            <p className="text-[11px] text-[#71717a] mt-0.5">Leads (eixo esq.) · Investimento (eixo dir.)</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wide">Total Leads</p>
              <p className="text-base font-bold text-[#22C55E]">{formatNumber(totalLeads)}</p>
            </div>
            {cpl > 0 && (
              <div>
                <p className="text-[10px] text-[#71717a] uppercase tracking-wide">CPL</p>
                <p className="text-base font-bold text-[#4040E8]">{formatCurrency(cpl)}</p>
              </div>
            )}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 50, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={40} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `R$${v}`} width={55} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, name: string) => {
                if (name === 'conversions') return [formatNumber(v), 'Leads'];
                if (name === 'spend') return [formatCurrency(v), 'Investimento'];
                if (name === 'clicks') return [formatNumber(v), 'Cliques'];
                return [v, name];
              }}
            />
            <Legend
              formatter={(v) => v === 'conversions' ? 'Leads' : v === 'spend' ? 'Investimento' : 'Cliques'}
              wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
            />
            <Line yAxisId="right" type="monotone" dataKey="spend" stroke="#4040E8" strokeWidth={1.5}
              dot={false} strokeDasharray="4 2" opacity={0.6} />
            <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#D4A017" strokeWidth={1.5}
              dot={false} strokeDasharray="2 3" opacity={0.7} />
            <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#22C55E" strokeWidth={2.5}
              dot={chartData.length <= 15 ? { fill: '#22C55E', r: 3 } : false}
              activeDot={{ r: 5, fill: '#22C55E' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2 — Investimento diário */}
      <div className="portal-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Investimento Diário (R$)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `R$${v}`} width={55} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatCurrency(v), 'Investido']} />
            <Bar dataKey="spend" fill="#4040E8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3 — Impressões e Alcance */}
      <div className="portal-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Impressões e Alcance Diário</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => formatNumber(v)} width={60} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, name: string) => [formatNumber(v), name === 'impressions' ? 'Impressões' : 'Alcance']} />
            <Legend formatter={(v) => v === 'impressions' ? 'Impressões' : 'Alcance'}
              wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
            <Line type="monotone" dataKey="impressions" stroke="#4040E8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="reach" stroke="#6B4EFF" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 4 — CPC diário */}
      <div className="portal-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">CPC Diário (R$)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `R$${v.toFixed(2)}`} width={55} />
            <Tooltip contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [formatCurrency(v), 'CPC']} />
            <Line type="monotone" dataKey="cpc" stroke="#FF4D00" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Campaigns breakdown */}
      {campaigns.length > 0 && (
        <div className="portal-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e1e]">
            <h3 className="text-sm font-semibold text-white">Campanhas do Período</h3>
          </div>
          <div className="divide-y divide-[#1e1e1e]">
            {campaigns.slice(0, 10).map((c, idx) => {
              const pct = maxSpend > 0 ? (c.spend / maxSpend) * 100 : 0;
              return (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[#71717a] text-xs shrink-0">#{idx + 1}</span>
                      <span className="text-sm text-white font-medium truncate">{c.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        c.status === 'ACTIVE'
                          ? 'text-[#22C55E] bg-[#22C55E]/10'
                          : 'text-[#71717a] bg-[#1e1e1e]'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0 ml-4">
                      {formatCurrency(c.spend)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden mb-2">
                    <div className="h-full rounded-full bg-[#4040E8]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-[#71717a]">
                    <span>{formatNumber(c.impressions)} impressões</span>
                    <span>{formatNumber(c.clicks)} cliques</span>
                    <span>{(c.ctr * 100).toFixed(2)}% CTR</span>
                    <span>{formatCurrency(c.cpc)} CPC</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {analysisText && (
        <div className="portal-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-2 w-2 rounded-full bg-[#4040E8]" />
            <h3 className="text-sm font-semibold text-white">Análise de Performance — IA Zenith</h3>
          </div>
          <div className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">
            {analysisText}
          </div>
        </div>
      )}
    </div>
  );
}
