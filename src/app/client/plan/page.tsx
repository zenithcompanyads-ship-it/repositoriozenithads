import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { CalendarDays, FileText } from 'lucide-react';

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase.from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) return null;

  const { data: plans } = await supabase
    .from('monthly_plans')
    .select('*')
    .eq('client_id', userData.client_id)
    .order('month', { ascending: false });

  return { plans: plans ?? [] };
}

export default async function ClientPlanPage() {
  const data = await getData();
  if (!data) return <div className="p-8 text-gray-400">Conta não vinculada.</div>;

  const { plans } = data;
  const currentPlan = plans[0];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Planejamento Mensal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estratégia e objetivos definidos pela equipe Zenith
        </p>
      </div>

      {currentPlan ? (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#4040E8]" />
                <h3 className="text-base font-semibold text-gray-900">
                  Plano do mês
                </h3>
              </div>
              <span className="text-xs text-gray-400">
                Atualizado em {formatDate(currentPlan.updated_at)}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[300px]">
              {currentPlan.content ?? 'Conteúdo do planejamento será publicado em breve.'}
            </div>
          </div>

          {/* Previous Plans */}
          {plans.length > 1 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Meses anteriores</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {plans.slice(1).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(p.month))}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(p.updated_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            Nenhum planejamento disponível para este mês.
          </p>
          <p className="text-gray-300 text-xs mt-1">
            Sua equipe Zenith publicará o planejamento em breve.
          </p>
        </div>
      )}
    </div>
  );
}
