import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  change?: number; // percent change vs previous period
  icon: React.ReactNode;
  iconBg?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  icon,
  iconBg = 'bg-blue-50',
  className,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className={cn('metric-card', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zenith-gray font-medium">{label}</span>
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', iconBg)}>
          {icon}
        </div>
      </div>

      <div className="text-2xl font-bold text-gray-900">{value}</div>

      {change !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-gray-500'
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          <span>
            {isPositive && '+'}
            {change?.toFixed(1)}% vs período anterior
          </span>
        </div>
      )}
    </div>
  );
}
