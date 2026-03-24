'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useToast } from '@/components/ui/Toast';
import type { Client } from '@/types';

interface Props {
  client: Client;
}

export function EditClientTab({ client }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(client.color);
  const [avatarUrl, setAvatarUrl] = useState(client.avatar_url ?? '');
  const [form, setForm] = useState({
    name: client.name,
    segment: client.segment ?? '',
    monthly_budget: String(client.monthly_budget),
    meta_ad_account_id: client.meta_ad_account_id ?? '',
    since_date: client.since_date ?? '',
  });

  const handleAvatarUpload = (url: string) => {
    setAvatarUrl(url);
    // If empty string, it means remove
    if (!url) {
      fetch(`/api/admin/clients/${client.id}/avatar`, { method: 'DELETE' })
        .then(() => toast('success', 'Foto removida.'))
        .catch(() => toast('error', 'Erro ao remover foto.'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monthly_budget: parseFloat(form.monthly_budget) || 0,
          color,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('success', 'Cliente atualizado! Recarregue para ver as mudanças.');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]';

  return (
    <div className="space-y-5 max-w-xl">
      {/* Avatar + Color */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Identidade visual
        </h3>
        <div className="flex items-start gap-8">
          <AvatarUpload
            name={form.name}
            color={color}
            initials={client.initials ?? undefined}
            currentAvatarUrl={avatarUrl || null}
            onUpload={handleAvatarUpload}
            clientId={client.id}
          />
          <div className="flex-1">
            <ColorPicker value={color} onChange={setColor} label="Cor do cliente" />
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Informações
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Segmento</label>
          <input
            value={form.segment}
            onChange={(e) => setForm({ ...form, segment: e.target.value })}
            className={inputClass}
            placeholder="Ex: Moda & Varejo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Orçamento mensal (R$)</label>
          <input
            type="number"
            step="0.01"
            value={form.monthly_budget}
            onChange={(e) => setForm({ ...form, monthly_budget: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Ad Account ID</label>
          <input
            value={form.meta_ad_account_id}
            onChange={(e) => setForm({ ...form, meta_ad_account_id: e.target.value })}
            className={inputClass}
            placeholder="123456789"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente desde</label>
          <input
            type="date"
            value={form.since_date}
            onChange={(e) => setForm({ ...form, since_date: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-2.5">
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
        ) : (
          <><Save className="w-4 h-4" /> Salvar alterações</>
        )}
      </button>
    </div>
  );
}
