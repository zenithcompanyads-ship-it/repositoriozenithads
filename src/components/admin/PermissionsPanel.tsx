'use client';

import { Toggle } from '@/components/ui/Toggle';
import type { ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

const PERMISSION_CONFIG: Array<{
  key: keyof ClientPermissions;
  label: string;
  description: string;
}> = [
  {
    key: 'weekly_report',
    label: 'Relatório Semanal',
    description: 'Cliente acessa o relatório gerado toda semana',
  },
  {
    key: 'biweekly_report',
    label: 'Relatório Quinzenal',
    description: 'Cliente acessa o relatório dos últimos 15 dias',
  },
  {
    key: 'monthly_report',
    label: 'Relatório Mensal',
    description: 'Cliente acessa o relatório mensal completo',
  },
  {
    key: 'campaigns',
    label: 'Campanhas Ativas',
    description: 'Cliente vê a tabela de campanhas e métricas',
  },
  {
    key: 'monthly_plan',
    label: 'Planejamento Mensal',
    description: 'Cliente acessa o planejamento estratégico do mês',
  },
];

interface Props {
  permissions: ClientPermissions;
  onChange: (permissions: ClientPermissions) => void;
  disabled?: boolean;
}

export function PermissionsPanel({ permissions, onChange, disabled }: Props) {
  const handleToggle = (key: keyof ClientPermissions, value: boolean) => {
    onChange({ ...permissions, [key]: value });
  };

  const allOn = Object.values(permissions).every(Boolean);
  const allOff = Object.values(permissions).every((v) => !v);

  return (
    <div>
      {/* Quick actions */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_PERMISSIONS })}
          disabled={disabled || allOn}
          className="text-xs text-[#4040E8] font-medium hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Habilitar tudo
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          onClick={() =>
            onChange({
              weekly_report: false,
              biweekly_report: false,
              monthly_report: false,
              campaigns: false,
              monthly_plan: false,
            })
          }
          disabled={disabled || allOff}
          className="text-xs text-gray-500 font-medium hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Desabilitar tudo
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {PERMISSION_CONFIG.map(({ key, label, description }) => (
          <Toggle
            key={key}
            checked={permissions[key]}
            onChange={(v) => handleToggle(key, v)}
            label={label}
            description={description}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
