'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CalendarDays, Sparkles, Loader2, Save, Eye, EyeOff,
  CheckCircle, Plus, Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { MonthlyPlan, Metric } from '@/types';

interface CampaignRow {
  id: string;
  name: string;
  objective: string;
  budget: string;
  period: string;
  notes: string;
}

interface PlanData {
  objective: string;
  totalBudget: string;
  campaigns: CampaignRow[];
  strategies: string;
  goals: { roas: string; maxCpc: string; minCtr: string; conversions: string };
  notes: string;
}

function parsePlanContent(content: string | null): PlanData {
  try {
    if (content?.startsWith('{')) return JSON.parse(content);
  } catch {/* fall through */}
  // Legacy plain text
  return {
    objective: content ?? '',
    totalBudget: '',
    campaigns: [],
    strategies: '',
    goals: { roas: '', maxCpc: '', minCtr: '', conversions: '' },
    notes: '',
  };
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options = [];
  const now = new Date();
  for (let i = -1; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = d.toISOString().split('T')[0].slice(0, 7);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

interface Props {
  clientId: string;
  clientName: string;
  plans: MonthlyPlan[];
  metrics: Metric[];
}

export function MonthlyPlanTab({ clientId, clientName, plans, metrics }: Props) {
  const { toast } = useToast();
  const monthOptions = generateMonthOptions();
  const currentMonthValue = new Date().toISOString().slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [plan, setPlan] = useState<PlanData>({
    objective: '',
    totalBudget: '',
    campaigns: [],
    strategies: '',
    goals: { roas: '', maxCpc: '', minCtr: '', conversions: '' },
    notes: '',
  });

  // Load plan for selected month
  useEffect(() => {
    const existing = plans.find((p) => p.month.slice(0, 7) === selectedMonth);
    if (existing) {
      setPlan(parsePlanContent(existing.content));
      setCurrentPlanId(existing.id);
      setIsPublished((existing as MonthlyPlan & { visible_to_client?: boolean }).visible_to_client ?? false);
    } else {
      setPlan({ objective: '', totalBudget: '', campaigns: [], strategies: '', goals: { roas: '', maxCpc: '', minCtr: '', conversions: '' }, notes: '' });
      setCurrentPlanId(null);
      setIsPublished(false);
    }
  }, [selectedMonth, plans]);

  // Auto-save every 30s
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planRef = useRef(plan);
  planRef.current = plan;

  const savePlan = useCallback(async (publishOverride?: boolean) => {
    const content = JSON.stringify(planRef.current);
    const monthDate = selectedMonth + '-01';
    const body: Record<string, unknown> = { client_id: clientId, content, month: monthDate };
    if (publishOverride !== undefined) body.visible_to_client = publishOverride;

    const url = currentPlanId ? `/api/admin/plans/${currentPlanId}` : '/api/admin/plans';
    const method = currentPlanId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar');
    if (!currentPlanId && data.id) setCurrentPlanId(data.id);
    return data;
  }, [clientId, currentPlanId, selectedMonth]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await savePlan();
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 30000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [plan, savePlan]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePlan();
      toast('success', 'Planejamento salvo!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await savePlan(!isPublished);
      setIsPublished(!isPublished);
      toast('success', isPublished ? 'Planejamento despublicado.' : 'Planejamento publicado para o cliente!');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao publicar.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName,
          month: selectedMonth,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Parse the AI response into structured fields
      const text: string = data.content;
      const extract = (label: string): string => {
        const re = new RegExp(`\\*\\*${label}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
        return re.exec(text)?.[1]?.trim() ?? '';
      };

      setPlan((prev) => ({
        ...prev,
        objective: extract('OBJETIVO DO MÊS') || prev.objective,
        strategies: extract('ESTRATÉGIAS PLANEJADAS') || prev.strategies,
        notes: extract('OBSERVAÇÕES GERAIS') || prev.notes,
        totalBudget: extract('ORÇAMENTO RECOMENDADO').match(/R\$\s*([\d.,]+)/)?.[1]?.replace(',', '.') || prev.totalBudget,
      }));

      toast('success', 'Planejamento gerado pela IA! Revise e ajuste antes de publicar.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao gerar.');
    } finally {
      setGenerating(false);
    }
  };

  const addCampaignRow = () => {
    setPlan((prev) => ({
      ...prev,
      campaigns: [
        ...prev.campaigns,
        { id: Math.random().toString(36).slice(2), name: '', objective: '', budget: '', period: '', notes: '' },
      ],
    }));
  };

  const updateCampaignRow = (id: string, field: keyof CampaignRow, value: string) => {
    setPlan((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const removeCampaignRow = (id: string) => {
    setPlan((prev) => ({ ...prev, campaigns: prev.campaigns.filter((c) => c.id !== id) }));
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8] transition-colors';
  const textareaClass = `${inputClass} resize-none`;

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-[#4040E8]" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {isPublished && (
            <span className="badge-active text-[10px]">Publicado</span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Salvo
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} disabled={generating} className="btn-secondary text-xs py-1.5">
            {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</> : <><Sparkles className="w-3.5 h-3.5" /> Gerar com IA</>}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </button>
          <button onClick={handlePublish} disabled={saving} className={isPublished ? 'btn-secondary text-xs py-1.5' : 'btn-primary text-xs py-1.5'}>
            {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isPublished ? 'Despublicar' : 'Publicar para cliente'}
          </button>
        </div>
      </div>

      {generating && (
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <Sparkles className="w-8 h-8 text-[#4040E8] animate-pulse" />
          <p className="font-medium text-gray-800">Gerando planejamento com IA...</p>
          <p className="text-sm text-gray-400">Claude está analisando o histórico do cliente.</p>
          <Loader2 className="w-5 h-5 animate-spin text-[#4040E8]" />
        </div>
      )}

      {/* Section: Objective */}
      <Section title="Objetivo do Mês" color="blue">
        <textarea
          value={plan.objective}
          onChange={(e) => setPlan({ ...plan, objective: e.target.value })}
          rows={4}
          className={textareaClass}
          placeholder="Descreva o principal objetivo estratégico para este mês..."
        />
      </Section>

      {/* Section: Budget */}
      <Section title="Orçamento Total Previsto" color="green">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">R$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={plan.totalBudget}
            onChange={(e) => setPlan({ ...plan, totalBudget: e.target.value })}
            className={`${inputClass} max-w-xs`}
            placeholder="0,00"
          />
        </div>
      </Section>

      {/* Section: Campaigns */}
      <Section title="Distribuição por Campanha" color="purple">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Campanha', 'Objetivo', 'Orçamento (R$)', 'Período', 'Observações', ''].map((h) => (
                  <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {plan.campaigns.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-3">
                    <input value={row.name} onChange={(e) => updateCampaignRow(row.id, 'name', e.target.value)}
                      className={inputClass} placeholder="Nome da campanha" />
                  </td>
                  <td className="py-2 pr-3">
                    <input value={row.objective} onChange={(e) => updateCampaignRow(row.id, 'objective', e.target.value)}
                      className={inputClass} placeholder="Ex: Conversão" />
                  </td>
                  <td className="py-2 pr-3 w-32">
                    <input type="number" value={row.budget} onChange={(e) => updateCampaignRow(row.id, 'budget', e.target.value)}
                      className={inputClass} placeholder="0,00" />
                  </td>
                  <td className="py-2 pr-3 w-32">
                    <input value={row.period} onChange={(e) => updateCampaignRow(row.id, 'period', e.target.value)}
                      className={inputClass} placeholder="Ex: 1-15/mês" />
                  </td>
                  <td className="py-2 pr-3">
                    <input value={row.notes} onChange={(e) => updateCampaignRow(row.id, 'notes', e.target.value)}
                      className={inputClass} placeholder="Observações" />
                  </td>
                  <td className="py-2">
                    <button onClick={() => removeCampaignRow(row.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addCampaignRow} className="btn-secondary text-xs py-1.5 mt-3">
          <Plus className="w-3.5 h-3.5" />
          Adicionar campanha
        </button>
      </Section>

      {/* Section: Strategies */}
      <Section title="Estratégias Planejadas" color="orange">
        <textarea
          value={plan.strategies}
          onChange={(e) => setPlan({ ...plan, strategies: e.target.value })}
          rows={6}
          className={textareaClass}
          placeholder="Descreva as estratégias táticas, criativos, públicos-alvo, testes A/B..."
        />
      </Section>

      {/* Section: Performance Goals */}
      <Section title="Metas de Performance" color="red">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ROAS meta</label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.01" value={plan.goals.roas}
                onChange={(e) => setPlan({ ...plan, goals: { ...plan.goals, roas: e.target.value } })}
                className={`${inputClass} flex-1`} placeholder="Ex: 3.5"
              />
              <span className="text-sm text-gray-400">x</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CPC máximo</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">R$</span>
              <input
                type="number" step="0.01" value={plan.goals.maxCpc}
                onChange={(e) => setPlan({ ...plan, goals: { ...plan.goals, maxCpc: e.target.value } })}
                className={`${inputClass} flex-1`} placeholder="Ex: 1.50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CTR mínimo</label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.01" value={plan.goals.minCtr}
                onChange={(e) => setPlan({ ...plan, goals: { ...plan.goals, minCtr: e.target.value } })}
                className={`${inputClass} flex-1`} placeholder="Ex: 1.5"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Conversões meta</label>
            <input
              type="number" value={plan.goals.conversions}
              onChange={(e) => setPlan({ ...plan, goals: { ...plan.goals, conversions: e.target.value } })}
              className={inputClass} placeholder="Ex: 50"
            />
          </div>
        </div>
      </Section>

      {/* Section: Notes */}
      <Section title="Observações Gerais" color="gray">
        <textarea
          value={plan.notes}
          onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
          rows={4}
          className={textareaClass}
          placeholder="Pontos de atenção, contexto adicional, sazonalidades..."
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  children: React.ReactNode;
}) {
  const borderColors = {
    blue: 'border-[#4040E8]',
    green: 'border-emerald-400',
    purple: 'border-purple-400',
    orange: 'border-amber-400',
    red: 'border-red-400',
    gray: 'border-gray-300',
  };
  const titleColors = {
    blue: 'text-[#4040E8]',
    green: 'text-emerald-700',
    purple: 'text-purple-700',
    orange: 'text-amber-700',
    red: 'text-red-700',
    gray: 'text-gray-600',
  };

  return (
    <div className={`card p-5 border-t-4 ${borderColors[color]}`}>
      <h3 className={`text-xs font-bold uppercase tracking-wide mb-4 ${titleColors[color]}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}
