'use client';

import { useState, useMemo } from 'react';
import { Client } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';

interface ClientAnalysisProps {
  clients: Client[];
  monthIndex: number;
  monthName: string;
  adminId: string;
  onRefresh: () => void;
}

interface ClientMetrics {
  id: string;
  name: string;
  service: string;
  monthlyValue: number;
  annualProjection: number;
  annualLiquid: number; // with 6% tax
  timeSpent?: number; // hours per month
  notes?: string;
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ClientAnalysis({
  clients,
  monthIndex,
  monthName,
  adminId,
  onRefresh,
}: ClientAnalysisProps) {
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const monthClients = useMemo(() => {
    return clients.filter(c => c.month_index === monthIndex && c.crm !== 'cancelado');
  }, [clients, monthIndex]);

  const metrics = useMemo(() => {
    return monthClients.map(client => {
      const monthlyValue = client.value;
      const annualProjection = monthlyValue * 12;
      const annualLiquid = annualProjection * 0.94; // 6% tax discount

      return {
        id: client.id,
        name: client.name,
        service: client.service,
        monthlyValue,
        annualProjection,
        annualLiquid,
        timeSpent: timeSpent[client.id] || 0,
        notes: notes[client.id] || '',
      };
    });
  }, [monthClients, timeSpent, notes]);

  const fmt = (n: number) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalAnnualProjection = metrics.reduce((sum, m) => sum + m.annualProjection, 0);
  const totalAnnualLiquid = metrics.reduce((sum, m) => sum + m.annualLiquid, 0);
  const totalTimeSpent = metrics.reduce((sum, m) => sum + m.timeSpent, 0);

  const renderClientMonthlyProjection = (client: Client) => {
    const monthlyValue = client.value;
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(2026, i, 1);
      const renewal = client.renew ? monthlyValue : 0;
      return renewal;
    });
    return months;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Análise de Clientes</h1>
        <p className="text-sm text-gray-500 font-light mt-1">Rentabilidade, projeção e oportunidades por cliente</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Projeção Anual</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{fmt(totalAnnualProjection)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Líquido (-6%)</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{fmt(totalAnnualLiquid)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Clientes</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{monthClients.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Tempo Total</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-600">{totalTimeSpent}h</p>
        </div>
      </div>

      {/* Clients Analysis */}
      <div className="space-y-4">
        {monthClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-8 text-center">
            <p className="text-gray-500 font-light">Nenhum cliente neste mês</p>
          </div>
        ) : (
          monthClients.map(client => {
            const monthlyValue = client.value;
            const annualProjection = monthlyValue * 12;
            const annualLiquid = annualProjection * 0.94;
            const isExpanded = expandedClient === client.id;

            return (
              <div key={client.id} className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                  className="w-full p-6 hover:bg-gray-50 transition flex justify-between items-center"
                >
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                    <p className="text-sm text-gray-500">{client.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{fmt(monthlyValue)}</p>
                    <p className="text-xs text-gray-500">por mês</p>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-6 space-y-6">
                    {/* Projection Grid */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3">Projeção Mensal (12 meses)</h4>
                      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                        {MONTHS_SHORT.map((month, idx) => (
                          <div key={idx} className="text-center">
                            <p className="text-xs text-gray-500 mb-1">{month}</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {fmt(monthlyValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Mensal</p>
                        <p className="text-lg font-bold text-gray-900">{fmt(monthlyValue)}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Anual Bruto</p>
                        <p className="text-lg font-bold text-blue-600">{fmt(annualProjection)}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Anual Líquido</p>
                        <p className="text-lg font-bold text-green-600">{fmt(annualLiquid)}</p>
                      </div>
                    </div>

                    {/* Time Spent */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Tempo gasto por mês (horas)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={timeSpent[client.id] || 0}
                        onChange={(e) => setTimeSpent({ ...timeSpent, [client.id]: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Custo por hora: R$ {annualLiquid > 0 && (timeSpent[client.id] || 0) > 0 ? ((annualLiquid / 12) / (timeSpent[client.id] || 1)).toFixed(2) : '0,00'}
                      </p>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        O que pode vender para este cliente?
                      </label>
                      <textarea
                        value={notes[client.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [client.id]: e.target.value })}
                        placeholder="Ex: Aumentar orçamento de anúncios, consulting, novas campanhas..."
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Rentability Analysis */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">Análise de Rentabilidade</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Receita Anual Líquida:</span>
                          <span className="font-semibold text-gray-900">{fmt(annualLiquid)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Imposto (6%):</span>
                          <span className="font-semibold text-red-600">{fmt(annualProjection * 0.06)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Tempo Total/Ano:</span>
                          <span className="font-semibold text-gray-900">{(timeSpent[client.id] || 0) * 12}h</span>
                        </div>
                        {(timeSpent[client.id] || 0) > 0 && (
                          <div className="flex justify-between pt-2 border-t border-purple-200">
                            <span className="text-gray-700 font-semibold">R$ por hora:</span>
                            <span className={`font-bold text-lg ${((annualLiquid / 12) / (timeSpent[client.id] || 1)) > 500 ? 'text-green-600' : 'text-orange-600'}`}>
                              R$ {((annualLiquid / 12) / (timeSpent[client.id] || 1)).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
