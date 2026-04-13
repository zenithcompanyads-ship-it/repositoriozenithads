'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getFinancialClients, getFinancialProspects, getFinancialCategories } from '@/lib/financeiro';
import Dashboard from './Dashboard';
import ProspectsTracker from './ProspectsTracker';
import Home from './Home';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function FinanceiroWrapper() {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('clientes');
  const [clients, setClients] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setAdminId(user.id);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const loadData = async () => {
    if (!adminId) return;

    setLoading(true);
    try {
      const supabase = createClient();

      if (currentMonth === null) {
        // Load all months for Home view
        const allClientsPromises = Array.from({ length: 12 }, (_, i) =>
          getFinancialClients(supabase, adminId, i)
        );
        const allProspectsPromises = Array.from({ length: 12 }, (_, i) =>
          getFinancialProspects(supabase, adminId, i)
        );

        const [allClientsArrays, allProspectsArrays, categoriesData] = await Promise.all([
          Promise.all(allClientsPromises),
          Promise.all(allProspectsPromises),
          getFinancialCategories(supabase, adminId),
        ]);

        // Flatten arrays
        const allClients = allClientsArrays.flat();
        const allProspects = allProspectsArrays.flat();

        setClients(allClients);
        setProspects(allProspects);
        setCategories(categoriesData);
      } else {
        // Load specific month
        const [clientsData, prospectsData, categoriesData] = await Promise.all([
          getFinancialClients(supabase, adminId, currentMonth),
          getFinancialProspects(supabase, adminId, currentMonth),
          getFinancialCategories(supabase, adminId),
        ]);
        setClients(clientsData);
        setProspects(prospectsData);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adminId, currentMonth]);

  if (!adminId) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div style={{ width: '100%' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center gap-0 overflow-x-auto">
          <button
            onClick={() => {
              setCurrentMonth(null);
              setActiveTab('clientes');
            }}
            className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              currentMonth === null ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            📊 Home
          </button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          {MONTHS.map((month, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentMonth(idx);
                setActiveTab('clientes');
              }}
              className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                currentMonth === idx ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {month.slice(0, 3)}
            </button>
          ))}

          {currentMonth !== null && (
            <>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <button
                onClick={() => setActiveTab(activeTab === 'clientes' ? 'prospects' : 'clientes')}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === 'prospects' ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                📋 Prospecções
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-gray-50">
        {loading ? (
          <div className="p-8 text-center">Carregando...</div>
        ) : currentMonth === null ? (
          <Home clients={clients} />
        ) : activeTab === 'clientes' ? (
          <Dashboard clients={clients} monthName={MONTHS[currentMonth]} monthIndex={currentMonth} adminId={adminId} categories={categories} onRefresh={loadData} />
        ) : (
          <ProspectsTracker prospects={prospects} clients={clients} monthIndex={currentMonth} monthName={MONTHS[currentMonth]} adminId={adminId} onRefresh={loadData} />
        )}
      </div>
    </div>
  );
}
