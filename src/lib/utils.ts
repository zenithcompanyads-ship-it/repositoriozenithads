import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatMonthYear(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getPeriodLabel(type: string): string {
  const labels: Record<string, string> = {
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
  };
  return labels[type] || type;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    DELETED: 'bg-red-100 text-red-700',
    ARCHIVED: 'bg-gray-100 text-gray-600',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-600';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    PAUSED: 'Pausado',
    DELETED: 'Excluído',
    ARCHIVED: 'Arquivado',
    INACTIVE: 'Inativo',
  };
  return labels[status] ?? status;
}

/**
 * Maps Meta Ads "Tipo de resultado" to a friendly display label.
 * Used in reports to replace generic "Leads/Conversões" with the real metric.
 */
export function getResultLabel(resultType?: string | null): string {
  if (!resultType) return 'Resultados';
  const lower = resultType.toLowerCase().trim();

  // Raw Meta API indicator values (from "Indicador de resultados" column)
  if (lower === 'reach') return 'Alcance';
  if (lower === 'profile_visit_view' || lower.includes('profile_visit')) return 'Visitas ao Perfil';
  if (lower === 'link_click' || lower === 'offsite_conversion.fb_pixel_custom' ) return 'Cliques no Link';
  if (lower === 'video_view' || lower.includes('video_view')) return 'Visualizações de Vídeo';
  if (lower.includes('messaging_conversation_started') || lower.includes('message')) return 'Conversas Iniciadas';
  if (lower.includes('fb_pixel_lead') || lower === 'lead') return 'Leads';
  if (lower.includes('fb_pixel_purchase') || lower === 'purchase' || lower.includes('compra')) return 'Compras';
  if (lower.includes('post_engagement') || lower.includes('engajamento')) return 'Engajamento';
  if (lower.includes('page_like') || lower.includes('curtida')) return 'Curtidas';
  if (lower.includes('app_install')) return 'Instalações';
  if (lower.includes('cadastro') || lower.includes('registration')) return 'Cadastros';

  // Portuguese display values (from "Tipo de resultado" column)
  if (lower.includes('conversa')) return 'Conversas Iniciadas';
  if (lower.includes('mensagem')) return 'Mensagens';
  if (lower.includes('clique no link')) return 'Cliques no Link';
  if (lower.includes('visualização')) return 'Visualizações';
  if (lower.includes('alcance')) return 'Alcance';
  if (lower.includes('visita')) return 'Visitas ao Perfil';

  return resultType;
}

export function getCostPerResultLabel(resultType?: string | null): string {
  const label = getResultLabel(resultType);
  if (label === 'Conversas Iniciadas') return 'Custo/Conversa';
  if (label === 'Mensagens') return 'Custo/Mensagem';
  if (label === 'Leads') return 'Custo/Lead';
  if (label === 'Compras') return 'Custo/Compra';
  if (label === 'Visualizações de Vídeo') return 'Custo/Visualização';
  if (label === 'Curtidas') return 'Custo/Curtida';
  if (label === 'Cliques no Link') return 'Custo/Clique';
  if (label === 'Alcance') return 'Custo/1k Alcance';
  if (label === 'Visitas ao Perfil') return 'Custo/Visita';
  if (label === 'Engajamento') return 'Custo/Engajamento';
  return 'Custo/Resultado';
}

/**
 * Single source of truth: is this campaign considered "active"?
 * Use this everywhere instead of inline `status === 'ACTIVE'` comparisons.
 */
export function isActiveCampaign(status: string): boolean {
  return status === 'ACTIVE';
}

/**
 * Normalizes raw status strings (from Meta API, CSV, etc.) to canonical DB values.
 * Accepted canonical values: ACTIVE | PAUSED | DELETED | ARCHIVED | INACTIVE
 */
export function normalizeCampaignStatus(raw: string): string {
  const s = String(raw ?? '').trim();
  const upper = s.toUpperCase();
  const lower = s.toLowerCase();

  // Portuguese values from Meta Ads Brazil exports
  if (lower.includes('veiculação') || lower === 'ativo' || lower === 'ativa' || lower === 'em veiculação') return 'ACTIVE';
  if (lower.includes('pausad')) return 'PAUSED';
  if (lower.includes('arquivad')) return 'ARCHIVED';
  if (lower.includes('excluíd') || lower.includes('excluido') || lower.includes('deletad')) return 'DELETED';
  // English/API values
  if (lower === 'active' || lower === 'delivering') return 'ACTIVE';
  if (lower === 'paused' || lower === 'not_delivering' || lower === 'campaign_paused' || lower === 'adset_paused') return 'PAUSED';
  if (lower === 'archived') return 'ARCHIVED';
  if (lower === 'deleted') return 'DELETED';

  const CANONICAL = ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'] as const;
  return (CANONICAL as readonly string[]).includes(upper) ? upper : 'INACTIVE';
}
