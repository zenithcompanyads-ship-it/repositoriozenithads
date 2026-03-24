import { ZenithLogo } from '@/components/ui/ZenithLogo';

interface PortalFooterProps {
  clientName?: string;
  periodStart?: string;
  periodEnd?: string;
  totalInvestment?: number;
}

function formatPortalDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function PortalFooter({
  clientName,
  periodStart,
  periodEnd,
  totalInvestment,
}: PortalFooterProps) {
  return (
    <footer className="border-t border-[#1e1e1e] px-8 py-6 mt-12">
      <div className="flex items-center justify-between gap-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <ZenithLogo variant="light" size={24} showText />
          <span className="text-[#71717a] text-xs">·</span>
          <span className="text-[#71717a] text-xs">Gestão Profissional de Mídia Paga</span>
        </div>

        {/* Right */}
        <div className="text-right">
          <p className="text-[#71717a] text-[11px] leading-relaxed">
            {clientName && <span>Cliente: <span className="text-[#a1a1aa]">{clientName}</span></span>}
            {periodStart && periodEnd && (
              <span> · Período: <span className="text-[#a1a1aa]">{formatPortalDate(periodStart)} — {formatPortalDate(periodEnd)}</span></span>
            )}
            {totalInvestment !== undefined && (
              <span> · Investimento total: <span className="text-[#a1a1aa]">{formatBRL(totalInvestment)}</span></span>
            )}
          </p>
          <p className="text-[#71717a] text-[10px] mt-0.5 uppercase tracking-widest">
            Documento confidencial
          </p>
        </div>
      </div>
    </footer>
  );
}
