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
      <h2 className="text-lg font-bold text-gray-900 mb-4">Nichos/Categorias</h2>
      <p className="text-sm text-gray-500 font-light mb-4">Gerencie os nichos de seu negócio</p>

      {/* Display Categories */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 group"
          >
            {cat.name}
            <button
              onClick={() => handleDelete(cat.id)}
              disabled={loading}
              className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="Nome do nicho"
            value={newNicho}
            onChange={(e) => setNewNicho(e.target.value)}
            autoFocus
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? '...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setNewNicho('');
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm"
        >
          + Adicionar Nicho
        </button>
      )}
    </div>
  );
}
