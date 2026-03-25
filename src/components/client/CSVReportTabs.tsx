'use client';

import { useState } from 'react';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  name: string;
  spend: number;
  conversions: number;
  cpc: number;
  status: string;
  budget: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency?: number;
  objective?: string | null;
  resultType?: string | null;
  ctr?: number;
  cpm?: number;
}

interface MonthRow {
  label: string;
  days: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface AIAnalysis {
  resumo_executivo?: string;
  destaques_performance?: string[];
  pontos_atencao?: string[];
  leitura_estrategica?: string;
  proximos_passos?: string[];
}

export interface CSVReportData {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  numDays: number;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalConversions: number;
  frequency?: number;
  resultType?: string | null;
  monthlyProjection: number;
  daysInMonth: number;
  campaigns: Campaign[];
  monthly: MonthRow[];
  ai_analysis?: AIAnalysis | null;
}

interface Props {
  data: CSVReportData;
  htmlReport: string | null;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'resumo',      label: 'Resumo' },
  { id: 'funil',       label: 'Funil de Resultado' },
  { id: 'ativas',      label: 'Funil Ativo' },
  { id: 'mes-a-mes',   label: 'Mês a Mês' },
  { id: 'estrategia',  label: 'Análise Estratégica' },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fdate(d: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T12:00:00'));
}

function pct(num: number, den: number): string {
  if (!den) return '0%';
  return ((num / den) * 100).toFixed(1) + '%';
}

function dropOff(prev: number, curr: number): number {
  return Math.max(0, prev - curr);
}

// Map Meta Ads "Tipo de resultado" to a friendly label
function getResultLabel(resultType?: string | null): string {
  if (!resultType) return 'Resultados';
  const lower = resultType.toLowerCase();
  if (lower.includes('conversa')) return 'Conversas Iniciadas';
  if (lower.includes('mensagem')) return 'Mensagens';
  if (lower.includes('lead')) return 'Leads';
  if (lower.includes('compra')) return 'Compras';
  if (lower.includes('clique no link') || lower.includes('link click')) return 'Cliques no Link';
  if (lower.includes('curtida')) return 'Curtidas';
  if (lower.includes('visualização') || lower.includes('video view')) return 'Visualizações';
  if (lower.includes('alcance')) return 'Alcance';
  if (lower.includes('cadastro')) return 'Cadastros';
  return resultType; // use raw if unrecognized
}

function getCostPerResultLabel(resultType?: string | null): string {
  const label = getResultLabel(resultType);
  if (label === 'Conversas Iniciadas') return 'Custo/Conversa';
  if (label === 'Mensagens') return 'Custo/Mensagem';
  if (label === 'Leads') return 'Custo/Lead';
  if (label === 'Compras') return 'Custo/Compra';
  if (label === 'Visualizações') return 'Custo/Visualização';
  if (label === 'Curtidas') return 'Custo/Curtida';
  return 'Custo/Resultado';
}

// ── Shared: FunnelSteps ───────────────────────────────────────────────────────
// Real proportional bars. Bars scaled relative to impressions (= 100%).
// Between each step: step-to-step conversion rate + drop-off count.

interface FunnelStep {
  label: string;
  sublabel?: string;
  value: number;
  color: string;
  accentColor: string;
}

interface FunnelStepsProps {
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  spend: number;
  resultType?: string | null;
  title?: string;
  badge?: React.ReactNode;
}

function FunnelSteps({ impressions, reach, clicks, conversions, spend, resultType, title, badge }: FunnelStepsProps) {
  // Use reach only when it has real data (> 0 and <= impressions)
  const hasReach = reach > 0 && reach <= impressions;
  const resultLabel = getResultLabel(resultType);

  const steps: FunnelStep[] = hasReach ? [
    { label: 'Impressões', sublabel: 'Total de exibições',        value: impressions, color: '#4040E8', accentColor: '#6B4EFF' },
    { label: 'Alcance',    sublabel: 'Pessoas únicas alcançadas', value: reach,       color: '#6B4EFF', accentColor: '#818CF8' },
    { label: 'Cliques',    sublabel: 'Cliques no anúncio',        value: clicks,      color: '#818CF8', accentColor: '#a78bfa' },
    { label: resultLabel,  sublabel: 'Resultado principal',       value: conversions, color: '#22C55E', accentColor: '#16a34a' },
  ] : [
    { label: 'Impressões', sublabel: 'Total de exibições',        value: impressions, color: '#4040E8', accentColor: '#6B4EFF' },
    { label: 'Cliques',    sublabel: 'Cliques no anúncio',        value: clicks,      color: '#818CF8', accentColor: '#a78bfa' },
    { label: resultLabel,  sublabel: 'Resultado principal',       value: conversions, color: '#22C55E', accentColor: '#16a34a' },
  ];

  // Real proportional widths (relative to impressions = 100%)
  const barWidths = steps.map(s => impressions > 0 ? Math.max((s.value / impressions) * 100, 1.5) : 0);

  // Step-to-step conversion rates
  const stepRates: string[] = [];
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].value;
    const curr = steps[i].value;
    stepRates.push(pct(curr, prev));
  }

  // Efficiency metrics
  const cpl = conversions > 0 ? spend / conversions : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const overallCvr = impressions > 0 ? (conversions / impressions) * 100 : 0;

  return (
    <div className="portal-card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#111118]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded bg-[#4040E8]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">
            {title ?? 'Funil de Resultados'}
          </h3>
        </div>
        {badge}
      </div>

      <div className="px-6 py-5 space-y-0">
        {steps.map((step, i) => {
          const width = barWidths[i];
          const prevStep = i > 0 ? steps[i - 1] : null;
          const dropped = prevStep ? dropOff(prevStep.value, step.value) : 0;
          const stepRate = i > 0 ? stepRates[i - 1] : null;

          return (
            <div key={step.label}>
              {/* Between-step connector */}
              {i > 0 && (
                <div className="flex items-center justify-between py-2 pl-8">
                  <div className="flex items-center gap-3">
                    {/* Arrow */}
                    <svg width="12" height="14" viewBox="0 0 12 14" className="shrink-0">
                      <path d="M6 14L0 4h12L6 14z" fill="#1e1e30" />
                      <path d="M6 0v8" stroke="#2a2a40" strokeWidth="1.5" />
                    </svg>
                    {/* Rate badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1a1a28] text-[#a78bfa]">
                        {stepRate} de conversão
                      </span>
                      {dropped > 0 && (
                        <span className="text-[10px] text-[#52525b]">
                          − {formatNumber(dropped)} saíram
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step bar */}
              <div className="mb-1">
                <div className="flex justify-between items-end mb-1.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#52525b] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold text-[#e4e4e7]">{step.label}</span>
                      <span className="text-[10px] text-[#52525b]">{step.sublabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold text-white tabular-nums">
                      {formatNumber(step.value)}
                    </span>
                    {/* % of impressions */}
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1a1a28] tabular-nums"
                      style={{ color: step.accentColor }}
                    >
                      {pct(step.value, impressions)} das imp.
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-4 bg-[#0e0e18] rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-700"
                    style={{
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${step.color}, ${step.accentColor})`,
                    }}
                  />
                  {/* Value label inside bar if wide enough */}
                  {width > 15 && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/80 tabular-nums">
                      {formatNumber(step.value)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom efficiency row */}
      <div className="border-t border-[#111118] px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: getCostPerResultLabel(resultType), value: cpl > 0 ? formatCurrency(cpl) : '—', color: '#22C55E' },
          { label: 'CPC (Custo/Clique)', value: cpc > 0 ? formatCurrency(cpc) : '—',             color: '#4040E8' },
          { label: 'CPM (Custo/1k imp)', value: cpm > 0 ? formatCurrency(cpm) : '—',             color: '#6B4EFF' },
          { label: 'CVR Geral',          value: overallCvr > 0 ? overallCvr.toFixed(2) + '%' : '—', color: '#a78bfa' },
        ].map(m => (
          <div key={m.label} className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#52525b] mb-1">{m.label}</p>
            <p className="text-base font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Resumo ───────────────────────────────────────────────────────────────

function TabResumo({ data }: { data: CSVReportData }) {
  const { totalSpend, totalImpressions, totalReach, totalClicks, totalConversions,
    monthlyProjection, numDays, daysInMonth, campaigns, resultType, frequency } = data;
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const cpr    = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const freq   = frequency ?? (totalReach > 0 ? totalImpressions / totalReach : 0);
  const dailyRate = numDays > 0 ? totalSpend / numDays : 0;
  const progressPct = Math.min(100, Math.round((numDays / daysInMonth) * 100));
  const resultLabel = getResultLabel(resultType);
  const costLabel   = getCostPerResultLabel(resultType);

  return (
    <div className="space-y-5">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Investimento',  value: formatCurrency(totalSpend),    accent: '#4040E8' },
          { label: 'Impressões',    value: formatNumber(totalImpressions), accent: '#a1a1aa' },
          { label: 'Alcance',       value: formatNumber(totalReach),       accent: '#a78bfa' },
          { label: 'Frequência',    value: freq > 0 ? freq.toFixed(2) + 'x' : '—', accent: '#818CF8' },
          { label: 'Cliques',       value: formatNumber(totalClicks),      accent: '#22C55E' },
          { label: resultLabel,     value: formatNumber(totalConversions), accent: '#22C55E' },
        ].map(k => (
          <div key={k.label} className="portal-metric-card">
            <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-2">{k.label}</p>
            <p className="text-xl font-bold" style={{ color: k.accent }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CTR Médio',  value: formatPercent(avgCtr),                 color: '#4040E8' },
          { label: 'CPC Médio',  value: avgCpc > 0 ? formatCurrency(avgCpc) : '—', color: '#6B4EFF' },
          { label: 'CPM Médio',  value: avgCpm > 0 ? formatCurrency(avgCpm) : '—', color: '#818CF8' },
          { label: costLabel,    value: cpr > 0 ? formatCurrency(cpr) : '—',   color: '#22C55E' },
        ].map(m => (
          <div key={m.label} className="portal-metric-card">
            <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-2">{m.label}</p>
            <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel preview (mini) */}
      <FunnelSteps
        impressions={totalImpressions}
        reach={totalReach}
        clicks={totalClicks}
        conversions={totalConversions}
        spend={totalSpend}
        resultType={resultType}
        title="Visão do Funil — Período Completo"
      />

      {/* Budget projection */}
      <div className="portal-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded bg-[#f59e0b]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Projeção de Orçamento</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#52525b] mb-1">Gasto Atual</p>
            <p className="text-xl font-bold text-white">{formatCurrency(totalSpend)}</p>
            <p className="text-[11px] text-[#52525b] mt-1">{numDays} dias de dados</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#52525b] mb-1">Média Diária</p>
            <p className="text-xl font-bold text-[#a78bfa]">{formatCurrency(dailyRate)}</p>
            <p className="text-[11px] text-[#52525b] mt-1">por dia</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#52525b] mb-1">Projeção Mensal</p>
            <p className="text-xl font-bold text-[#f59e0b]">{formatCurrency(monthlyProjection)}</p>
            <p className="text-[11px] text-[#52525b] mt-1">{formatCurrency(dailyRate)}/dia × {daysInMonth} dias</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-[#71717a] mb-2">
            <span>Progresso do período</span>
            <span className="font-semibold text-[#e4e4e7]">{numDays} / {daysInMonth} dias ({progressPct}%)</span>
          </div>
          <div className="h-2 bg-[#1a1a28] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#4040E8] to-[#6B4EFF]"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Campaign summary */}
      <div className="portal-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded bg-[#4040E8]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Visão Geral das Campanhas</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-white">{campaigns.length}</p>
            <p className="text-[11px] text-[#71717a] mt-1">Total de campanhas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-[#22C55E]">{activeCampaigns.length}</p>
            <p className="text-[11px] text-[#71717a] mt-1">Ativas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-[#71717a]">{campaigns.length - activeCampaigns.length}</p>
            <p className="text-[11px] text-[#71717a] mt-1">Inativas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Funil de Resultado (ALL campaigns) ───────────────────────────────────

function TabFunil({ data }: { data: CSVReportData }) {
  const { totalImpressions, totalReach, totalClicks, totalConversions, totalSpend, resultType } = data;

  return (
    <div className="space-y-4">
      {/* Real proportional funnel */}
      <FunnelSteps
        impressions={totalImpressions}
        reach={totalReach}
        clicks={totalClicks}
        conversions={totalConversions}
        spend={totalSpend}
        resultType={resultType}
        title="Funil de Resultados — Todas as Campanhas"
        badge={
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4040E8]/10 text-[#4040E8] border border-[#4040E8]/20">
            {data.campaigns.length} campanhas
          </span>
        }
      />

      {/* All campaigns breakdown */}
      <div className="portal-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded bg-[#52525b]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Todas as Campanhas</h3>
          </div>
          <span className="text-[11px] text-[#52525b]">{data.campaigns.length} campanhas</span>
        </div>
        <div className="divide-y divide-[#111118]">
          {[...data.campaigns].sort((a, b) => b.spend - a.spend).map((c, idx) => {
            const campImps = c.impressions;
            const campCvr  = campImps > 0 ? (c.conversions / campImps) * 100 : 0;
            const campCtr  = campImps > 0 ? (c.clicks / campImps) * 100 : 0;
            const resLabel = getResultLabel(c.resultType ?? data.resultType);
            return (
              <div key={c.name} className={`px-5 py-3 ${c.status !== 'ACTIVE' ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-[#52525b] shrink-0">#{idx + 1}</span>
                    <span className="text-sm text-white font-medium truncate">{c.name}</span>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      c.status === 'ACTIVE'
                        ? 'bg-[#22C55E]/10 text-[#22C55E]'
                        : 'bg-[#1e1e1e] text-[#52525b]'
                    }`}>
                      {c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <span className="text-[11px] text-[#71717a]">{c.conversions} {resLabel.toLowerCase()}</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(c.spend)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-[#52525b]">
                  <span>{formatNumber(c.impressions)} imp.</span>
                  <span>{formatNumber(c.clicks)} cliques · CTR {campCtr.toFixed(1)}%</span>
                  <span>CVR {campCvr.toFixed(2)}%</span>
                  <span>CPC {c.cpc > 0 ? formatCurrency(c.cpc) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Funil Ativo (ACTIVE campaigns only) ──────────────────────────────────

function TabFunilAtivo({ data }: { data: CSVReportData }) {
  const activeCampaigns = data.campaigns
    .filter(c => c.status === 'ACTIVE')
    .sort((a, b) => b.spend - a.spend);

  if (!activeCampaigns.length) {
    return (
      <div className="portal-card p-10 text-center">
        <p className="text-[#71717a] text-sm">Nenhuma campanha ativa neste período.</p>
        <p className="text-[#52525b] text-xs mt-2">Verifique o status das campanhas no CSV importado.</p>
      </div>
    );
  }

  // Aggregate metrics from ACTIVE campaigns only
  const activeImpressions = activeCampaigns.reduce((s, c) => s + c.impressions, 0);
  const activeReach       = activeCampaigns.reduce((s, c) => s + c.reach, 0);
  const activeClicks      = activeCampaigns.reduce((s, c) => s + c.clicks, 0);
  const activeConversions = activeCampaigns.reduce((s, c) => s + c.conversions, 0);
  const activeSpend       = activeCampaigns.reduce((s, c) => s + c.spend, 0);

  const maxSpend = activeCampaigns[0]?.spend ?? 1;

  return (
    <div className="space-y-4">
      {/* REAL FUNNEL from active campaigns */}
      <FunnelSteps
        impressions={activeImpressions}
        reach={activeReach}
        clicks={activeClicks}
        conversions={activeConversions}
        spend={activeSpend}
        resultType={data.resultType}
        title="Funil Ativo — Campanhas em Veiculação"
        badge={
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
            {activeCampaigns.length} ativas
          </span>
        }
      />

      {/* Comparison: active vs total */}
      {data.campaigns.length > activeCampaigns.length && (
        <div className="portal-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded bg-[#a78bfa]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">
              Participação das Ativas no Total
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Investimento', active: activeSpend,       total: data.totalSpend,       fmt: formatCurrency },
              { label: 'Leads',        active: activeConversions, total: data.totalConversions, fmt: formatNumber },
              { label: 'Cliques',      active: activeClicks,      total: data.totalClicks,      fmt: formatNumber },
              { label: 'Impressões',   active: activeImpressions, total: data.totalImpressions, fmt: formatNumber },
            ].map(m => {
              const sharePct = m.total > 0 ? (m.active / m.total) * 100 : 0;
              return (
                <div key={m.label} className="bg-[#0e0e18] rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#52525b] mb-1">{m.label}</p>
                  <p className="text-base font-bold text-white">{m.fmt(m.active)}</p>
                  <div className="mt-2 h-1 bg-[#1a1a28] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${sharePct}%` }} />
                  </div>
                  <p className="text-[10px] text-[#52525b] mt-1">{sharePct.toFixed(0)}% do total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Campaigns: hero card for #1, compact cards for rest */}
      <div className="space-y-3">
        {activeCampaigns.map((c, idx) => {
          const barPct        = maxSpend > 0 ? (c.spend / maxSpend) * 100 : 0;
          const shareOfActive = activeSpend > 0 ? (c.spend / activeSpend) * 100 : 0;
          const campCtr       = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
          const campCvr       = c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0;
          const campCpl       = c.conversions > 0 ? c.spend / c.conversions : 0;

          // Hero card for #1 campaign
          if (idx === 0) return (
            <div key={c.name} className="portal-card overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#4040E8]/15 via-[#6B4EFF]/8 to-transparent" />
                <div className="relative px-6 pt-6 pb-5">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black tracking-[0.15em] text-[#818CF8] uppercase">
                          #1 · Campanha Principal
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
                          ● Ativa
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-snug">{c.name}</h3>
                      {c.objective && (
                        <p className="text-[11px] text-[#71717a] mt-1">{c.objective}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-[#71717a] uppercase tracking-wider mb-0.5">Investido</p>
                      <p className="text-2xl font-black text-white">{formatCurrency(c.spend)}</p>
                      <p className="text-[10px] text-[#818CF8] mt-0.5">{shareOfActive.toFixed(1)}% do total ativo</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="h-2 rounded-full bg-[#1a1a28] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#4040E8] to-[#6B4EFF]"
                        style={{ width: `${barPct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: 'Impressões',                           value: formatNumber(c.impressions), color: '#a1a1aa' },
                      { label: 'Cliques',                              value: formatNumber(c.clicks),      color: '#818CF8' },
                      { label: getResultLabel(c.resultType ?? data.resultType), value: String(c.conversions), color: '#22C55E' },
                      { label: 'CTR',                                  value: campCtr.toFixed(2) + '%',    color: '#a78bfa' },
                      { label: 'CVR',                                  value: campCvr.toFixed(2) + '%',    color: '#a78bfa' },
                      { label: getCostPerResultLabel(c.resultType ?? data.resultType), value: campCpl > 0 ? formatCurrency(campCpl) : '—', color: '#22C55E' },
                    ].map(m => (
                      <div key={m.label} className="bg-[#0a0a18] border border-[#ffffff08] rounded-lg px-3 py-2.5 text-center">
                        <p className="text-[9px] text-[#52525b] uppercase tracking-wide mb-1">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );

          // Compact card for remaining campaigns
          return (
            <div key={c.name} className="portal-card px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-black text-[#52525b] shrink-0 w-5 text-center">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm text-white font-medium block truncate">{c.name}</span>
                    {c.objective && (
                      <span className="text-[10px] text-[#52525b]">{c.objective}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E]">
                    Ativa
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-4">
                  <span className="text-sm font-bold text-white">{formatCurrency(c.spend)}</span>
                  <span className="text-[10px] text-[#52525b]">{shareOfActive.toFixed(1)}%</span>
                </div>
              </div>

              <div className="h-1 rounded-full bg-[#1a1a28] overflow-hidden mb-3">
                <div className="h-full rounded-full bg-gradient-to-r from-[#4040E8] to-[#6B4EFF]"
                  style={{ width: `${barPct}%` }} />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: 'Impressões',                                        value: formatNumber(c.impressions), color: '#52525b' },
                  { label: 'Cliques',                                           value: formatNumber(c.clicks),      color: '#818CF8' },
                  { label: getResultLabel(c.resultType ?? data.resultType),     value: String(c.conversions),       color: '#22C55E' },
                  { label: 'CTR',                                               value: campCtr.toFixed(2) + '%',    color: '#a78bfa' },
                  { label: 'CVR',                                               value: campCvr.toFixed(2) + '%',    color: '#a78bfa' },
                  { label: getCostPerResultLabel(c.resultType ?? data.resultType), value: campCpl > 0 ? formatCurrency(campCpl) : '—', color: '#22C55E' },
                ].map(m => (
                  <div key={m.label} className="bg-[#0e0e18] rounded px-2 py-1.5 text-center">
                    <p className="text-[9px] text-[#52525b] uppercase tracking-wide mb-0.5">{m.label}</p>
                    <p className="text-xs font-bold" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Mês a Mês ────────────────────────────────────────────────────────────

function TabMesAMes({ data }: { data: CSVReportData }) {
  const { monthly, totalSpend, periodStart, periodEnd } = data;

  if (!monthly?.length) {
    return (
      <div className="portal-card p-10 text-center">
        <p className="text-[#71717a] text-sm">Dados de mês a mês não disponíveis.</p>
      </div>
    );
  }

  const maxMonthSpend = Math.max(...monthly.map(m => m.spend), 1);

  return (
    <div className="space-y-4">
      <div className="portal-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded bg-[#6B4EFF]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Histórico por Competência</h3>
          <span className="text-[11px] text-[#52525b] ml-auto">
            {fdate(periodStart)} — {fdate(periodEnd)}
          </span>
        </div>

        <div className="flex items-end gap-2 h-20 mb-4">
          {monthly.map(m => {
            const barHeight = Math.round((m.spend / maxMonthSpend) * 100);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                  <div className="w-full rounded-t-sm bg-gradient-to-t from-[#4040E8] to-[#6B4EFF]"
                    style={{ height: `${barHeight}%` }} />
                </div>
                <span className="text-[10px] text-[#71717a] truncate w-full text-center">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="portal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Mês', 'Dias', 'Investido', '% do Total', 'Impressões', 'Cliques', 'Leads', 'CPL'].map(h => (
                  <th key={h}
                    className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#52525b] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => {
                const sharePct = totalSpend > 0 ? (m.spend / totalSpend) * 100 : 0;
                const cpl = m.conversions > 0 ? m.spend / m.conversions : 0;
                return (
                  <tr key={m.label} className={`border-b border-[#111118] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-5 py-3 font-bold text-white">{m.label}</td>
                    <td className="px-5 py-3 text-[#71717a]">{m.days}</td>
                    <td className="px-5 py-3 text-[#4040E8] font-bold">{formatCurrency(m.spend)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 rounded-full bg-[#1a1a28] flex-1 overflow-hidden">
                          <div className="h-full rounded-full bg-[#6B4EFF]" style={{ width: `${sharePct}%` }} />
                        </div>
                        <span className="text-[#71717a] shrink-0">{sharePct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#a1a1aa]">{formatNumber(m.impressions)}</td>
                    <td className="px-5 py-3 text-[#818CF8]">{formatNumber(m.clicks)}</td>
                    <td className="px-5 py-3 text-[#22C55E] font-semibold">{formatNumber(m.conversions)}</td>
                    <td className="px-5 py-3 text-[#22C55E]">{cpl > 0 ? formatCurrency(cpl) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Análise Estratégica ──────────────────────────────────────────────────

function TabEstrategia({ data, htmlReport }: { data: CSVReportData; htmlReport: string | null }) {
  const ai = data.ai_analysis;
  const [showHtml, setShowHtml] = useState(false);

  // If no AI analysis and no HTML, show empty state
  if (!ai && !htmlReport) {
    return (
      <div className="portal-card p-10 text-center">
        <p className="text-[#71717a] text-sm">Análise estratégica não disponível.</p>
        <p className="text-[#52525b] text-xs mt-2">Gere uma nova análise com o botão &ldquo;Gerar Relatório&rdquo; para obter a leitura estratégica com IA.</p>
      </div>
    );
  }

  // Funnel insight calculated here for context
  const activeCampaigns = data.campaigns.filter(c => c.status === 'ACTIVE');
  const activeImpressions = activeCampaigns.reduce((s, c) => s + c.impressions, 0);
  const activeConversions = activeCampaigns.reduce((s, c) => s + c.conversions, 0);
  const activeSpend       = activeCampaigns.reduce((s, c) => s + c.spend, 0);
  const activeCpl         = activeConversions > 0 ? activeSpend / activeConversions : 0;
  const activeCvr         = activeImpressions > 0 ? (activeConversions / activeImpressions) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Context bar from data */}
      <div className="portal-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded bg-[#22C55E]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Contexto do Período</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Investimento',                              value: formatCurrency(data.totalSpend),                              color: '#4040E8' },
            { label: getResultLabel(data.resultType),             value: formatNumber(data.totalConversions),                          color: '#22C55E' },
            { label: getCostPerResultLabel(data.resultType),      value: activeCpl > 0 ? formatCurrency(activeCpl) : '—',             color: '#22C55E' },
            { label: 'CVR Geral',                                 value: activeCvr > 0 ? activeCvr.toFixed(2) + '%' : '—',            color: '#a78bfa' },
          ].map(m => (
            <div key={m.label} className="bg-[#0e0e18] rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-[#52525b] mb-1">{m.label}</p>
              <p className="text-base font-bold" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {ai ? (
        <>
          {/* Resumo Executivo */}
          {ai.resumo_executivo && (
            <div className="portal-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded bg-[#4040E8]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Resumo Executivo</h3>
              </div>
              <div className="text-[13px] text-[#a1a1aa] leading-relaxed whitespace-pre-line">
                {ai.resumo_executivo}
              </div>
            </div>
          )}

          {/* Pontos Positivos + Oportunidades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ai.destaques_performance?.length ? (
              <div className="portal-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded bg-[#22C55E]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Pontos Positivos</h3>
                </div>
                <ul className="space-y-3">
                  {ai.destaques_performance.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/25 flex items-center justify-center">
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="text-[12px] text-[#a1a1aa] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ai.pontos_atencao?.length ? (
              <div className="portal-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded bg-[#f59e0b]" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Oportunidades de Melhoria</h3>
                </div>
                <ul className="space-y-3">
                  {ai.pontos_atencao.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/25 flex items-center justify-center">
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M4.5 1v4M4.5 7.5v.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span className="text-[12px] text-[#a1a1aa] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Leitura Estratégica */}
          {ai.leitura_estrategica && (
            <div className="portal-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded bg-[#6B4EFF]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Leitura Estratégica</h3>
              </div>
              <div className="text-[13px] text-[#a1a1aa] leading-relaxed whitespace-pre-line">
                {ai.leitura_estrategica}
              </div>
            </div>
          )}

          {/* Próximos Passos */}
          {ai.proximos_passos?.length ? (
            <div className="portal-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded bg-[#22C55E]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#e4e4e7]">Próximos Passos</h3>
              </div>
              <ol className="space-y-3">
                {ai.proximos_passos.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-[10px] font-bold text-[#22C55E]">
                      {i + 1}
                    </span>
                    <span className="text-[12px] text-[#a1a1aa] leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Toggle HTML report */}
          {htmlReport && (
            <div className="portal-card overflow-hidden">
              <button
                onClick={() => setShowHtml(!showHtml)}
                className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold text-[#71717a] hover:text-white transition-colors"
              >
                <span className="uppercase tracking-widest">Relatório Detalhado (HTML)</span>
                <span className="text-[10px]">{showHtml ? '▲ ocultar' : '▼ expandir'}</span>
              </button>
              {showHtml && (
                <div
                  className="text-white border-t border-[#1e1e1e]"
                  dangerouslySetInnerHTML={{ __html: htmlReport }}
                />
              )}
            </div>
          )}
        </>
      ) : (
        /* Fallback: only HTML report */
        <div
          className="text-white"
          dangerouslySetInnerHTML={{ __html: htmlReport! }}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CSVReportTabs({ data, htmlReport }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('resumo');

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto px-8 py-3 border-b border-[#1e1e1e] bg-[#070710]/50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#4040E8] to-[#6B4EFF] text-white shadow-lg shadow-[#4040E8]/20'
                : 'text-[#71717a] hover:text-[#e4e4e7] hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-8 py-6">
        {activeTab === 'resumo'     && <TabResumo data={data} />}
        {activeTab === 'funil'      && <TabFunil data={data} />}
        {activeTab === 'ativas'     && <TabFunilAtivo data={data} />}
        {activeTab === 'mes-a-mes'  && <TabMesAMes data={data} />}
        {activeTab === 'estrategia' && <TabEstrategia data={data} htmlReport={htmlReport} />}
      </div>
    </div>
  );
}
