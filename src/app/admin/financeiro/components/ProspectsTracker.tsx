'use client';

import { useState } from 'react';
import { Prospect, addFinancialProspect, updateFinancialProspect, deleteFinancialProspect } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';

interface ProspectsTrackerProps {
  prospects: Prospect[];
  monthIndex: number;
  monthName: string;
  adminId: string;
  onRefresh: () => void;
}

const statusLabels = { contato: 'Contato', interesse: 'Interesse', negociando: 'Negociando', fechado: 'Fechado', perdido: 'Perdido' };

export default function ProspectsTracker({ prospects, monthIndex, monthName, adminId, onRefresh }: ProspectsTrackerProps) {
  const [newName, setNewName] = useState('');
  const [newCanal, setNewCanal] = useState('Instagram');
  const [loading, setLoading] = useState(false);

  const statusCounts = {
    contato: prospects.filter(p => p.status === 'contato').length,
    interesse: prospects.filter(p => p.status === 'interesse').length,
    negociando: prospects.filter(p => p.status === 'negociando').length,
    fechado: prospects.filter(p => p.status === 'fechado').length,
    perdido: prospects.filter(p => p.status === 'perdido').length,
  };

  const total = prospects.length;
  const conversionRate = total > 0 ? Math.round((statusCounts.fechado / total) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      await addFinancialProspect(supabase, adminId, monthIndex, {
        id: '',
        admin_id: adminId,
        name: newName,
        canal: newCanal,
        status: 'contato',
        observacoes: null,
        month_index: monthIndex,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setNewName('');
      onRefresh();
    } catch (error) {
      console.error('Error adding prospect:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (prospectId: string, newStatus: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      await updateFinancialProspect(supabase, adminId, monthIndex, prospectId, { status: newStatus as any });
      onRefresh();
    } catch (error) {
      console.error('Error updating prospect:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (prospectId: string) => {
    if (!confirm('Excluir este prospect?')) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await deleteFinancialProspect(supabase, adminId, monthIndex, prospectId);
      onRefresh();
    } catch (error) {
      console.error('Error deleting prospect:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-8">
        Prospecções <span className="text-gray-600 font-light">{monthName}</span>
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Total</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{total}</p>
        </div>
        {(Object.keys(statusLabels) as any[]).map((status) => (
          <div key={status} className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
            <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">{statusLabels[status]}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{statusCounts[status as keyof typeof statusCounts]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-xs p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Prospects</h2>
          {prospects.length === 0 ? (
            <p className="text-gray-500 text-sm font-light">Nenhum prospect registrado</p>
          ) : (
            <div className="space-y-2">
              {prospects.map((prospect) => (
                <div key={prospect.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{prospect.name}</p>
                    <p className="text-xs text-gray-500">{prospect.canal}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={prospect.status} onChange={(e) => handleStatusChange(prospect.id, e.target.value)} disabled={loading} className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                      {(Object.keys(statusLabels) as any[]).map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleDelete(prospect.id)} disabled={loading} className="text-red-600 hover:text-red-700 text-lg disabled:opacity-50">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">+ Novo Prospect</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" disabled={loading} />
            <select value={newCanal} onChange={(e) => setNewCanal(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" disabled={loading}>
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Email">Email</option>
              <option value="Indicação">Indicação</option>
            </select>
            <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
