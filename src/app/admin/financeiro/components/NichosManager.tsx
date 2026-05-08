'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Category, addFinancialCategory, deleteFinancialCategory } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';

interface NichosManagerProps {
  categories: Category[];
  adminId: string;
  onRefresh: () => void;
}

export default function NichosManager({ categories, adminId, onRefresh }: NichosManagerProps) {
  const [newNicho, setNewNicho] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNicho.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      await addFinancialCategory(supabase, adminId, { name: newNicho });
      setNewNicho('');
      setShowForm(false);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este nicho?')) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await deleteFinancialCategory(supabase, adminId, id);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-2">Nichos/Categorias</h2>
      <p className="text-sm text-gray-500 font-light mb-5">Gerencie os nichos de seu negócio</p>

      {/* Display Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 group hover:shadow-sm transition-shadow"
            >
              <span className="flex-1">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={loading}
                className="text-blue-400 hover:text-red-500 opacity-60 group-hover:opacity-100 transition-all disabled:opacity-30"
                title="Remover"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-2">
          <input
            type="text"
            placeholder="Nome do nicho"
            value={newNicho}
            onChange={(e) => setNewNicho(e.target.value)}
            autoFocus
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !newNicho.trim()}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewNicho('');
              }}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition text-sm bg-gray-50"
        >
          + Adicionar Nicho
        </button>
      )}
    </div>
  );
}
