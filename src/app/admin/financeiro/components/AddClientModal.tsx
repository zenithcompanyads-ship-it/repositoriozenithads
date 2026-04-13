'use client';

import { useState, useEffect } from 'react';
import { Category, addFinancialClient, updateFinancialClient, convertProspectToClient } from '@/lib/financeiro';
import { Client, Prospect } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: () => void;
  monthIndex: number;
  adminId: string;
  categories: Category[];
  editingClient?: Client | null;
  sourceProspect?: Prospect | null;
}

const crmOptions = ['em-dia', 'pendente', 'atrasado', 'novo', 'cancelado'];
const crmLabels = { 'em-dia': 'Em Dia', 'pendente': 'Pendente', 'atrasado': 'Atrasado', 'novo': 'Novo', 'cancelado': 'Cancelado' };

export default function AddClientModal({
  isOpen,
  onClose,
  onClientAdded,
  monthIndex,
  adminId,
  categories,
  editingClient = null,
  sourceProspect = null,
}: AddClientModalProps) {
  const [name, setName] = useState('');
  const [service, setService] = useState('Gestão de Tráfego');
  const [value, setValue] = useState('');
  const [day, setDay] = useState('');
  const [crm, setCrm] = useState('novo');
  const [renew, setRenew] = useState(true);
  const [link, setLink] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sourceProspect && !editingClient) {
      setName(sourceProspect.name);
      setRenew(true);
      setCrm('novo');
    } else if (editingClient) {
      setName(editingClient.name);
      setService(editingClient.service);
      setValue(editingClient.value.toString());
      setDay(editingClient.day.toString());
      setCrm(editingClient.crm);
      setRenew(editingClient.renew);
      setLink(editingClient.link || '');
      setCategoryId(editingClient.category_id || '');
    }
  }, [editingClient, sourceProspect, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value || !day) return;

    setLoading(true);
    try {
      const supabase = createClient();
      if (editingClient) {
        await updateFinancialClient(supabase, adminId, monthIndex, editingClient.id, {
          name,
          service,
          value: parseFloat(value),
          day: parseInt(day),
          crm: crm as any,
          renew,
          link,
          category_id: categoryId || null,
        });
      } else if (sourceProspect) {
        await convertProspectToClient(supabase, adminId, monthIndex, sourceProspect);
      } else {
        await addFinancialClient(supabase, adminId, monthIndex, {
          name,
          service,
          value: parseFloat(value),
          day: parseInt(day),
          crm: crm as any,
          renew,
          link,
          category_id: categoryId || null,
          source_prospect_id: null,
          source_channel: null,
          admin_id: adminId,
          month_index: monthIndex,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      setName('');
      setValue('');
      setDay('');
      setCategoryId('');
      setLink('');
      setCrm('novo');
      onClientAdded();
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
        <p className="text-xs text-gray-500 font-light mb-6">{editingClient ? 'Atualize as informações' : 'Adicione um novo cliente'}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-tight mb-2">Nome *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={loading} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-tight mb-2">Serviço</label>
            <input type="text" value={service} onChange={(e) => setService(e.target.value)} placeholder="Tipo de serviço" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={loading} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-tight mb-2">Valor *</label>
              <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-tight mb-2">Dia *</label>
              <input type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="10" min="1" max="31" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={loading} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-tight mb-2">Status</label>
            <select value={crm} onChange={(e) => setCrm(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={loading}>
              {crmOptions.map((option) => (
                <option key={option} value={option}>
                  {crmLabels[option as keyof typeof crmLabels]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-tight mb-2">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={loading}>
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <input type="checkbox" checked={renew} onChange={(e) => setRenew(e.target.checked)} id="renew" className="w-4 h-4 cursor-pointer rounded accent-blue-600" disabled={loading} />
            <label htmlFor="renew" className="flex-1 cursor-pointer text-sm">
              <p className="font-semibold text-gray-900">Renovação Automática</p>
            </label>
          </div>

          <div className="flex gap-3 pt-6">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
