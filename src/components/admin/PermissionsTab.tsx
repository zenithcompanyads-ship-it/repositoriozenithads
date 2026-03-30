'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { PermissionsPanel } from './PermissionsPanel';
import { useToast } from '@/components/ui/Toast';
import type { Client, ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

const PLAN_PRESETS: Array<{
  label: string;
  description: string;
  color: string;
  permissions: ClientPermissions;
}> = [
  {
    label: 'Plano Básico',
    description: 'Apenas relatório mensal + campanhas',
    color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    permissions: {
      weekly_report: false,
      biweekly_report: false,
      monthly_report: true,
      campaigns: true,
      monthly_plan: false,
      documents: false,
    },
  },
  {
    label: 'Plano Quinzenal',
    description: 'Quinzenal + campanhas + planejamento',
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    permissions: {
      weekly_report: false,
      biweekly_report: true,
      monthly_report: false,
      campaigns: true,
      monthly_plan: true,
      documents: true,
    },
  },
  {
    label: 'Plano Completo',
    description: 'Todas as funcionalidades habilitadas',
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
];

interface Props {
  client: Client;
}

export function PermissionsTab({ client }: Props) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<ClientPermissions>(
    client.permissions ?? DEFAULT_PERMISSIONS
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true);
      toast('success', 'Permissões salvas! Efeito imediato no próximo acesso do cliente.');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-5 max-w-xl">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-full bg-[#4040E8]/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#4040E8]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Controle de acesso</h3>
            <p className="text-xs text-gray-400">
              {enabledCount} de {Object.keys(permissions).length} funcionalidades habilitadas para {client.name}
            </p>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="card p-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Planos rápidos
        </h4>
        <div className="flex gap-2 flex-wrap">
          {PLAN_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setPermissions(preset.permissions)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${preset.color}`}
            >
              <div className="font-semibold">{preset.label}</div>
              <div className="opacity-70 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="card p-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Permissões individuais
        </h4>
        <PermissionsPanel permissions={permissions} onChange={setPermissions} />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full justify-center py-2.5"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
        ) : saved ? (
          <><ShieldCheck className="w-4 h-4" /> Salvo!</>
        ) : (
          'Salvar permissões'
        )}
      </button>
    </div>
  );
}
