'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/lib/financeiro';
import { updateFinancialClient, deleteFinancialClient } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

interface ClientsTableProps {
  clients: Client[];
  monthIndex: number;
  adminId: string;
  onRefresh: () => void;
  onEditClient?: (client: Client) => void;
}

const crmOptions = ['em-dia', 'pendente', 'atrasado', 'novo', 'cancelado'];
const crmLabels = {
  'em-dia': 'Em Dia',
  'pendente': 'Pendente',
  'atrasado': 'Atrasado',
  'novo': 'Novo',
  'cancelado': 'Cancelado',
};

const crmColors = {
  'em-dia': 'bg-green-100 text-green-900 border border-green-300 font-semibold',
  'pendente': 'bg-amber-300 text-gray-900 border border-amber-400 font-semibold',
  'atrasado': 'bg-red-300 text-gray-900 border border-red-400 font-semibold',
  'novo': 'bg-slate-200 text-gray-900 border border-slate-300 font-semibold',
  'cancelado': 'bg-gray-300 text-gray-900 border border-gray-400 font-semibold',
};

export default function ClientsTable({
  clients,
  monthIndex,
  adminId,
  onRefresh,
  onEditClient,
}: ClientsTableProps) {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleToggleRenew = async (id: string, currentRenew: boolean) => {
    setLoading(true);
    try {
      const supabase = createClient();
      await updateFinancialClient(supabase, adminId, monthIndex, id, {
        renew: !currentRenew,
      });
      onRefresh();
    } catch (error) {
      console.error('Error toggling renewal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await deleteFinancialClient(supabase, adminId, monthIndex, id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      await updateFinancialClient(supabase, adminId, monthIndex, id, {
        crm: newStatus as any,
      });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = async (id: string) => {
    if (!editingValue || isNaN(Number(editingValue))) {
      setEditingClientId(null);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      await updateFinancialClient(supabase, adminId, monthIndex, id, {
        value: Number(editingValue),
      });
      setEditingClientId(null);
      setEditingValue('');
      onRefresh();
    } catch (error) {
      console.error('Error updating value:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!clients.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm font-light">Nenhum cliente registrado este mês</p>
      </div>
    );
  }

  const fmt = (value: number) =>
    'R$ ' +
    Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="grid grid-cols-7 gap-3 px-6 py-4 bg-gray-50 rounded-t-lg border border-gray-100 border-b-0">
        <div className="col-span-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-tight">Cliente</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-tight">Valor</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-tight">Vencimento</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-tight">Status</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-tight">Renovação</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-tight">Ações</p>
        </div>
      </div>

      {/* Client Rows */}
      {clients.map((client, index) => {
        const today = new Date().getDate();
        const isOverdue = client.day < today && client.crm === 'atrasado';

        return (
          <div
            key={client.id}
            className={`grid grid-cols-7 gap-3 px-6 py-4 bg-white border border-gray-100 border-t-0 items-center ${
              index === clients.length - 1 ? 'rounded-b-lg' : ''
            } ${isOverdue ? 'bg-red-50' : ''}`}
          >
            {/* Cliente Info */}
            <div className="col-span-2">
              <p className="font-medium text-gray-900 truncate">{client.name}</p>
              <p className="text-xs text-gray-500 truncate">{client.service}</p>
              {isOverdue && (
                <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-red-200 text-red-800 mt-1">
                  🔴 Cobrança Vencida
                </span>
              )}
            </div>

            {/* Valor */}
            <div className="text-right">
              {editingClientId === client.id ? (
                <div className="flex gap-2 justify-end items-center">
                  <input
                    type="number"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleValueChange(client.id);
                      if (e.key === 'Escape') {
                        setEditingClientId(null);
                        setEditingValue('');
                      }
                    }}
                    onBlur={() => handleValueChange(client.id)}
                    autoFocus
                    className="w-24 px-2 py-1 border border-blue-500 rounded text-right font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                  <span className="text-xs text-gray-500">✓</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingClientId(client.id);
                    setEditingValue(String(client.value));
                  }}
                  className="font-semibold text-gray-900 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer"
                  disabled={loading}
                >
                  {fmt(client.value)}
                </button>
              )}
            </div>

            {/* Vencimento */}
            <div className="text-center">
              <p className="font-semibold text-gray-900">{client.day}º</p>
            </div>

            {/* Status Dropdown */}
            <div className="text-center">
              <select
                value={client.crm}
                onChange={(e) => handleStatusChange(client.id, e.target.value)}
                disabled={loading}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer transition-colors disabled:opacity-50 ${
                  crmColors[client.crm as keyof typeof crmColors]
                }`}
              >
                {crmOptions.map((option) => (
                  <option key={option} value={option}>
                    {crmLabels[option as keyof typeof crmLabels]}
                  </option>
                ))}
              </select>
            </div>

            {/* Renovação Toggle */}
            <div className="text-center">
              <label className="flex justify-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={client.renew}
                  onChange={() => handleToggleRenew(client.id, client.renew)}
                  disabled={loading}
                  className="w-5 h-5 cursor-pointer rounded accent-blue-600 disabled:opacity-50"
                />
              </label>
            </div>

            {/* Ações */}
            <div className="text-center flex items-center justify-center gap-2">
              <button
                onClick={() => onEditClient?.(client)}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                disabled={loading}
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeleteClient(client.id)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                disabled={loading}
                title="Excluir"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
