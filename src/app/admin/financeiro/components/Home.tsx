'use client';

import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Client } from '@/lib/financeiro';

interface HomeProps {
  clients: Client[];
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Home({ clients }: HomeProps) {
  const stats = useMemo(() => {
    const allClients = clients.filter(c => c.crm !== 'cancelado');
    const totalRevenue = allClients.reduce((sum, c) => sum + c.value, 0);
    const avgMonthly = totalRevenue / 12;
    const projection = totalRevenue * 12;
    const clientCount = new Set(allClients.map(c => c.name)).size;

    // Group by month for charts
    const monthlyData = MONTHS.map((month, idx) => {
      const monthClients = clients.filter(c => c.month_index === idx && c.crm !== 'cancelado');
      const revenue = monthClients.reduce((sum, c) => sum + c.value, 0);
      const liquid = revenue * 0.94; // 6% de impostos
      return { month, revenue, liquid };
    });

    // Group by service
    const serviceMap = new Map<string, number>();
    allClients.forEach(c => {
      serviceMap.set(c.service, (serviceMap.get(c.service) || 0) + 1);
    });

    return { totalRevenue, avgMonthly, projection, clientCount, monthlyData, serviceMap };
  }, [clients]);

  const fmt = (n: number) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard Anual</h1>
        <p className="text-sm text-gray-500 font-light mt-1">Visão consolidada de 2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Acumulado</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{fmt(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">5 meses</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Projeção</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{fmt(stats.projection)}</p>
          <p className="text-xs text-gray-500 mt-1">12 meses</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Média</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{fmt(stats.avgMonthly)}</p>
          <p className="text-xs text-gray-500 mt-1">Por mês</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Clientes</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.clientCount}</p>
          <p className="text-xs text-gray-500 mt-1">Ativos</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Faturamento Mensal</h2>
          <p className="text-xs text-gray-500 mb-4">Receita bruta ao longo de 2026</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value) => fmt(value as number)} />
              <Bar dataKey="revenue" fill="#1f2937" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Faturamento Líquido</h2>
          <p className="text-xs text-gray-500 mb-4">Receita líquida (bruto - 6% impostos)</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value) => fmt(value as number)} />
              <Line type="monotone" dataKey="liquid" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 text-white">
          <h2 className="text-lg font-bold mb-4">Resumo de 2026</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-tight mb-1">Meses Processados</p>
              <p className="text-3xl font-bold">5</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-tight mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-400">{fmt(stats.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-tight mb-1">Média/Mês</p>
              <p className="text-2xl font-bold">{fmt(stats.avgMonthly)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Insights</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-lg">📈</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Crescimento</p>
                <p className="text-xs text-gray-500">+37% em relação ao mês anterior</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">👥</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Clientes</p>
                <p className="text-xs text-gray-500">{stats.clientCount} clientes ativos gerando receita</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">📊</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Projeção</p>
                <p className="text-xs text-gray-500">{fmt(stats.projection)} para 12 meses</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Clientes por Serviço</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Array.from(stats.serviceMap.entries()).map(([service, count]) => (
              <div key={service} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <p className="text-sm text-gray-700">{service}</p>
                <p className="text-sm font-semibold text-gray-900">{count}</p>
              </div>
            ))}
            {stats.serviceMap.size === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Nenhum cliente registrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
