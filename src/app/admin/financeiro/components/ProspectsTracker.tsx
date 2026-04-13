'use client';

import { useState, useMemo } from 'react';
import { Prospect, Client, addFinancialProspect, updateFinancialProspect, deleteFinancialProspect } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';

interface ProspectsTrackerProps {
  prospects: Prospect[];
  monthIndex: number;
  monthName: string;
  adminId: string;
  clients?: Client[];
  onRefresh: () => void;
}

const statusColors = {
  contato: 'bg-gray-100 text-gray-800',
  interesse: 'bg-blue-100 text-blue-800',
  negociando: 'bg-yellow-100 text-yellow-800',
  fechado: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
};

const statusLabels = {
  contato: 'Contato',
  interesse: 'Interesse',
  negociando: 'Negociando',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export default function ProspectsTracker({
  prospects,
  monthIndex,
  monthName,
  adminId,
  clients = [],
  onRefresh,
}: ProspectsTrackerProps) {
  const [newProspect, setNewProspect] = useState({ name: '', canal: 'Instagram', status: 'contato' });
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const monthProspects = prospects.filter(p => p.month_index === monthIndex);
    const monthClients = clients.filter(c => c.month_index === monthIndex && c.crm !== 'cancelado');

    const contatos = monthProspects.filter(p => p.status === 'contato').length;
    const interesse = monthProspects.filter(p => p.status === 'interesse').length;
    const negociando = monthProspects.filter(p => p.status === 'negociando').length;
    const fechado = monthProspects.filter(p => p.status === 'fechado').length;
    const perdido = monthProspects.filter(p => p.status === 'perdido').length;

    const total = monthProspects.length;
    const conversao = total > 0 ? Math.round((fechado / total) * 100) : 0;

    return { total, contatos, interesse, negociando, fechado, perdido, conversao, monthClients: monthClients.length };
  }, [prospects, clients, monthIndex]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProspect.name.trim() || !newProspect.canal.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      await addFinancialProspect(supabase, adminId, monthIndex, {
        name: newProspect.name,
        canal: newProspect.canal,
        status: newProspect.status as any,
      });
      setNewProspect({ name: '', canal: 'Instagram', status: 'contato' });
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      await updateFinancialProspect(supabase, adminId, monthIndex, id, { status: newStatus as any });
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este prospect?')) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await deleteFinancialProspect(supabase, adminId, monthIndex, id);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProspects = prospects.filter(p => p.month_index === monthIndex);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Prospecções <span className="text-gray-400 font-light">{monthName}</span></h1>
        <p className="text-sm text-gray-500 font-light mt-1">Meta: 20 prospecções por mês</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Progresso</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}/20</p>
          <p className="text-xs text-gray-500 mt-1">Prospecções</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Conversão</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.conversao}%</p>
          <p className="text-xs text-gray-500 mt-1">Taxa</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Meta Mensal</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">20</p>
          <p className="text-xs text-gray-500 mt-1">Prospecções</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Clientes Ativos</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.monthClients}</p>
          <p className="text-xs text-gray-500 mt-1">Este mês</p>
        </div>
      </div>

      {/* Status Breakdown + Próximos Passos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Status dos Leads</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Contato</span>
              <span className="text-lg font-semibold text-gray-500">{stats.contatos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Interesse</span>
              <span className="text-lg font-semibold text-blue-600">{stats.interesse}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Negociando</span>
              <span className="text-lg font-semibold text-yellow-600">{stats.negociando}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Fechado</span>
              <span className="text-lg font-semibold text-green-600">{stats.fechado}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Perdido</span>
              <span className="text-lg font-semibold text-red-600">{stats.perdido}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Próximos Passos</h2>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">📞 Agendar Contatos</p>
              <p className="text-xs text-blue-700 mt-1">Faça 5 chamadas por dia</p>
            </div>
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-sm font-semibold text-green-900">📧 Enviar Propostas</p>
              <p className="text-xs text-green-700 mt-1">Interesse = proposta</p>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
              <p className="text-sm font-semibold text-orange-900">👥 Acompanhar</p>
              <p className="text-xs text-orange-700 mt-1">Leads negociando</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Prospect Form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">+ Nova Prospecção</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Nome do prospect"
            value={newProspect.name}
            onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <select
            value={newProspect.canal}
            onChange={(e) => setNewProspect({ ...newProspect, canal: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Email">Email</option>
            <option value="Indicação">Indicação</option>
          </select>
          <select
            value={newProspect.status}
            onChange={(e) => setNewProspect({ ...newProspect, status: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {/* Prospects Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-500 font-light mt-1">{filteredProspects.length} este mês</p>
        </div>

        {filteredProspects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 font-light">Nenhuma prospecção registrada ainda</p>
            <p className="text-xs text-gray-400 mt-1">Clique em "+ Nova Prospecção" para adicionar leads</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">Canal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-tight">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProspects.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{prospect.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{prospect.canal}</td>
                    <td className="px-6 py-4">
                      <select
                        value={prospect.status}
                        onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 cursor-pointer ${statusColors[prospect.status as keyof typeof statusColors]}`}
                        disabled={loading}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(prospect.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 text-sm font-semibold disabled:opacity-50"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
