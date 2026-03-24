import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { CalendarDays, FileText } from 'lucide-react';

async function getData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', user.id)
    .single();

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
  if (!data) {
    return <div className="p-8 text-[#71717a]">Conta não vinculada.</div>;
  }

  const { plans } = data;
  const currentPlan = plans[0];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/40 bg-[#4040E8]/10 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-[#4040E8] uppercase">
            Zenith Company · Planejamento
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Planejamento Mensal</h1>
        <p className="text-sm text-[#71717a]">
          Estratégia e objetivos definidos pela equipe Zenith
        </p>
      </div>

      {currentPlan ? (
        <div className="space-y-5">
          <div className="portal-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#4040E8]" />
                <h3 className="text-base font-semibold text-white">
                  Plano do mês
                </h3>
              </div>
              <span className="text-xs text-[#71717a]">
                Atualizado em {formatDate(currentPlan.updated_at)}
              </span>
            </div>
            <div className="bg-[#0f0f0f] rounded-xl p-5 text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap min-h-[300px] border border-[#1e1e1e]">
              {currentPlan.content ?? 'Conteúdo do planejamento será publicado em breve.'}
            </div>
          </div>

          {/* Previous Plans */}
          {plans.length > 1 && (
            <div className="portal-card overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e1e1e]">
                <h3 className="text-sm font-semibold text-white">Meses anteriores</h3>
              </div>
              <div className="divide-y divide-[#1e1e1e]">
                {plans.slice(1).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#a1a1aa]">
                      {new Intl.DateTimeFormat('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      }).format(new Date(p.month))}
                    </span>
                    <span className="text-xs text-[#71717a]">{formatDate(p.updated_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="portal-card p-12 text-center">
          <FileText className="w-10 h-10 text-[#2a2a2a] mx-auto mb-3" />
          <p className="text-[#71717a] text-sm">
            Nenhum planejamento disponível para este mês.
          </p>
          <p className="text-[#4a4a4a] text-xs mt-1">
            Sua equipe Zenith publicará o planejamento em breve.
          </p>
        </div>
      )}
    </div>
  );
}
