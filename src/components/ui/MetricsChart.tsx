'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Metric } from '@/types';

interface MetricsChartProps {
  metrics: Metric[];
  fields?: Array<keyof Metric>;
  height?: number;
  dark?: boolean;
}

const fieldConfig: Record<string, { label: string; color: string; formatter: (v: number) => string }> = {
  spend: { label: 'Investido (R$)', color: '#4040E8', formatter: (v) => `R$ ${v.toFixed(2)}` },
  impressions: { label: 'Impressões', color: '#10B981', formatter: (v) => v.toLocaleString('pt-BR') },
  clicks: { label: 'Cliques', color: '#F59E0B', formatter: (v) => v.toLocaleString('pt-BR') },
  ctr: { label: 'CTR (%)', color: '#8B5CF6', formatter: (v) => `${v.toFixed(2)}%` },
  cpc: { label: 'CPC (R$)', color: '#EF4444', formatter: (v) => `R$ ${v.toFixed(2)}` },
  roas: { label: 'ROAS', color: '#06B6D4', formatter: (v) => `${v.toFixed(2)}x` },
  conversions: { label: 'Conversões', color: '#84CC16', formatter: (v) => v.toLocaleString('pt-BR') },
};

export function MetricsChart({
  metrics,
  fields = ['spend', 'clicks'],
  height = 300,
  dark = false,
}: MetricsChartProps) {
  const data = metrics.map((m) => ({
    ...m,
    dateLabel: format(new Date(m.date), 'dd/MM', { locale: ptBR }),
  }));

  const gridColor = dark ? '#2a2a2a' : '#f0f0f0';
  const tickColor = dark ? '#71717a' : '#9CA3AF';
  const tooltipBg = dark ? '#1a1a1a' : '#fff';
  const tooltipBorder = dark ? '#2a2a2a' : '#e5e7eb';
  const tooltipTextColor = dark ? '#ffffff' : '#111827';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 12, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            fontSize: '12px',
            color: tooltipTextColor,
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', color: tickColor }} />
        {fields.map((field) => {
          const config = fieldConfig[field as string];
          if (!config) return null;
          return (
            <Line
              key={field as string}
              type="monotone"
              dataKey={field as string}
              name={config.label}
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
