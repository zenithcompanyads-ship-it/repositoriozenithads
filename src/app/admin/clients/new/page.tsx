'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PermissionsPanel } from '@/components/admin/PermissionsPanel';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import type { ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [color, setColor] = useState('#4040E8');
  const [permissions, setPermissions] = useState<ClientPermissions>({ ...DEFAULT_PERMISSIONS });
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [clientName, setClientName] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);

    const name = data.get('name') as string;
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    const payload = {
      name,
      segment: data.get('segment') as string,
      meta_ad_account_id: data.get('meta_ad_account_id') as string,
      meta_access_token: data.get('meta_access_token') as string,
      monthly_budget: parseFloat(data.get('monthly_budget') as string) || 0,
      since_date: data.get('since_date') as string,
      active: true,
      color,
      initials,
      permissions,
      ...(avatarDataUrl ? { avatar_data_url: avatarDataUrl } : {}),
    };

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error ?? 'Erro ao criar cliente.');
      setLoading(false);
      return;
    }

    router.push(`/admin/clients/${result.id}`);
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/clients" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cadastre um novo cliente de tráfego pago
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">

        {/* Avatar + Name row */}
        <div className="flex items-start gap-6">
          <AvatarUpload
            name={clientName || 'Novo'}
            color={color}
            currentAvatarUrl={null}
            onUpload={setAvatarDataUrl}
          />
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do cliente <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
                placeholder="Ex: Bella Moda"
              />
            </div>
            {/* Segment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Segmento
              </label>
              <input
                name="segment"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
                placeholder="Ex: Moda & Varejo"
              />
            </div>
          </div>
        </div>

        {/* Color Picker */}
        <ColorPicker value={color} onChange={setColor} label="Cor do cliente" />

        {/* Meta Ad Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Meta Ad Account ID
          </label>
          <input
            name="meta_ad_account_id"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
            placeholder="Ex: 123456789"
          />
          <p className="text-xs text-gray-400 mt-1">Sem o prefixo act_ — só o número</p>
        </div>

        {/* Meta Access Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Meta Access Token
          </label>
          <textarea
            name="meta_access_token"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8] resize-none"
            placeholder="Token de acesso longo da Meta Business API"
          />
        </div>

        {/* Monthly Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Orçamento mensal (R$)
          </label>
          <input
            name="monthly_budget"
            type="number"
            step="0.01"
            min="0"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
            placeholder="5000.00"
          />
        </div>

        {/* Since Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Cliente desde
          </label>
          <input
            name="since_date"
            type="date"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20 focus:border-[#4040E8]"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Permissões do cliente
          </label>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <PermissionsPanel permissions={permissions} onChange={setPermissions} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Criando...' : 'Criar cliente'}
          </button>
          <Link href="/admin/clients" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
