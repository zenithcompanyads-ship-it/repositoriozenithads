'use client';

import { useMemo } from 'react';
import { Client } from '@/lib/financeiro';

interface CategoriesPerformanceProps {
  clients: Client[];
}

const fmt = (n: number) =>
  'R$ ' +
  Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CategoriesPerformance({ clients }: CategoriesPerformanceProps) {
  const categoryStats = useMemo(() => {
    const stats: Record<string, { revenue: number; count: number; percentage: number }> = {};

    const activeClients = clients.filter((c) => c.crm !== 'cancelado');
    const totalRevenue = activeClients.reduce((sum, c) => sum + c.value, 0);

    activeClients.forEach((client) => {
      const cat = client.category_id ? 'Com Categoria' : 'Sem categoria';
      if (!stats[cat]) {
        stats[cat] = { revenue: 0, count: 0, percentage: 0 };
      }
      stats[cat].revenue += client.value;
      stats[cat].count += 1;
    });

    Object.keys(stats).forEach((cat) => {
      stats[cat].percentage = totalRevenue > 0 ? (stats[cat].revenue / totalRevenue) * 100 : 0;
    });

    return Object.entries(stats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([name, data]) => ({ name, ...data }));
  }, [clients]);

  if (categoryStats.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Desempenho por Categoria</h2>
        <p className="text-gray-500 text-sm font-light">Nenhum cliente registrado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Desempenho por Categoria</h2>
      <div className="space-y-4">
        {categoryStats.map((stat) => (
          <div key={stat.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{stat.name}</p>
                <p className="text-xs text-gray-500">{stat.count} cliente{stat.count !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{fmt(stat.revenue)}</p>
                <p className="text-xs text-gray-500">{stat.percentage.toFixed(1)}% do total</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${stat.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
