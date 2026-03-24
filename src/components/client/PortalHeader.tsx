import { ClientAvatar } from '@/components/ui/ClientAvatar';

interface PortalHeaderProps {
  clientName: string;
  clientColor?: string;
  clientInitials?: string | null;
  periodStart?: string;
  periodEnd?: string;
  activeCampaigns?: number;
}

function formatPortalDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function PortalHeader({
  clientName,
  clientColor = '#4040E8',
  clientInitials,
  periodStart,
  periodEnd,
  activeCampaigns = 0,
}: PortalHeaderProps) {
  const duration =
    periodStart && periodEnd ? daysBetween(periodStart, periodEnd) : null;

  return (
    <div className="px-8 py-8 border-b border-[#1e1e1e]">
      <div className="flex items-start justify-between gap-6">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4040E8]/40 bg-[#4040E8]/10 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#4040E8] uppercase">
              Zenith Company · Gestão de Tráfego
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Relatório de Performance Digital
          </h1>
          <p className="text-[#a1a1aa] text-sm">
            {clientName} — visão consolidada de resultados
          </p>
        </div>

        {/* Right */}
        <div className="flex items-start gap-5 shrink-0">
          <ClientAvatar
            name={clientName}
            color={clientColor}
            initials={clientInitials}
            size="lg"
          />
          <div className="space-y-2 text-right">
            {periodStart && periodEnd && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-0.5">Período</p>
                  <p className="text-sm font-semibold text-white">
                    {formatPortalDate(periodStart)} — {formatPortalDate(periodEnd)}
                  </p>
                </div>
                {duration !== null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-0.5">Duração</p>
                    <p className="text-sm font-semibold text-white">{duration} dias</p>
                  </div>
                )}
              </>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-0.5">Campanhas ativas</p>
              <p className="text-sm font-semibold text-[#22C55E]">{activeCampaigns}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
