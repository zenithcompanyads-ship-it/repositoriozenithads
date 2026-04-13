'use client';

import { useState } from 'react';
import { Client } from '@/lib/financeiro';
import ClientsTable from './ClientsTable';
import AddClientModal from './AddClientModal';
import CategoriesPerformance from './CategoriesPerformance';
import CategoriesManager from './CategoriesManager';
import { Category } from '@/lib/financeiro';

interface DashboardProps {
  clients: Client[];
  monthName: string;
  monthIndex: number;
  adminId: string;
  categories: Category[];
  onRefresh: () => void;
}

export default function Dashboard({ clients, monthName, monthIndex, adminId, categories, onRefresh }: DashboardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const totalRevenue = clients.filter(c => c.crm !== 'cancelado').reduce((sum, c) => sum + c.value, 0);
  const pendingRevenue = clients.filter(c => c.crm === 'pendente').reduce((sum, c) => sum + c.value, 0);
  const overdueRevenue = clients.filter(c => c.crm === 'atrasado').reduce((sum, c) => sum + c.value, 0);

  const fmt = (n: number) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Clientes <span className="text-gray-600 font-light">{monthName}</span>
        </h1>
        <p className="text-sm text-gray-500 font-light mt-1">{clients.length} clientes cadastrados</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Total</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Pendente</p>
          <p className="text-lg sm:text-2xl font-bold text-amber-600">{fmt(pendingRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Atrasado</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{fmt(overdueRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-600 font-semibold tracking-tight mb-2 uppercase">Clientes</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{clients.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <CategoriesPerformance clients={clients} />
        <CategoriesManager adminId={adminId} onCategoriesChange={onRefresh} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Clientes</h2>
            <p className="text-sm text-gray-500 font-light mt-1">{clients.length} neste mês</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-5 py-2.5 rounded-lg font-semibold hover:shadow-md transition-all w-full sm:w-auto">
            + Novo Cliente
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <ClientsTable clients={clients} monthIndex={monthIndex} adminId={adminId} onRefresh={onRefresh} onEditClient={(client) => { setEditingClient(client); setIsAddModalOpen(true); }} />
        </div>
      </div>

      <AddClientModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingClient(null); }} onClientAdded={onRefresh} monthIndex={monthIndex} adminId={adminId} categories={categories} editingClient={editingClient} />
    </div>
  );
}
