'use client';

import { useState, useEffect } from 'react';
import { Category, getFinancialCategories, addFinancialCategory, deleteFinancialCategory } from '@/lib/financeiro';
import { createClient } from '@/lib/supabase/client';

interface CategoriesManagerProps {
  adminId: string;
  onCategoriesChange?: () => void;
}

export default function CategoriesManager({ adminId, onCategoriesChange }: CategoriesManagerProps) {
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const supabase = createClient();
      const cats = await getFinancialCategories(supabase, adminId);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      await addFinancialCategory(supabase, adminId, newCategoryName);
      setNewCategoryName('');
      setShowForm(false);
      await loadCategories();
      onCategoriesChange?.();
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      await deleteFinancialCategory(supabase, adminId, id);
      await loadCategories();
      onCategoriesChange?.();
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Categorias</h2>
        <p className="text-xs text-gray-500 font-light mt-1">Gerencie as categorias de clientes</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <div key={cat.id} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200">
            <span className="text-sm font-medium">{cat.name}</span>
            <button onClick={() => handleDeleteCategory(cat.id)} disabled={loading} className="text-blue-500 hover:text-blue-700 font-semibold disabled:opacity-50">
              ×
            </button>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} disabled={loading} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm disabled:opacity-50">
          + Adicionar Categoria
        </button>
      ) : (
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da categoria..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
            Salvar
          </button>
          <button type="button" onClick={() => setShowForm(false)} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm disabled:opacity-50">
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
