'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ClientAvatar } from '@/components/ui/ClientAvatar';
import { formatDate } from '@/lib/utils';
import { Plus, Loader2, Trash2, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  client_id: string | null;
  created_at: string;
  clients?: { name: string; color: string; initials: string | null } | null;
}

interface SimpleClient {
  id: string;
  name: string;
}

interface Props {
  users: User[];
  clients: SimpleClient[];
}

export function UsersManager({ users, clients }: Props) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'client',
    client_id: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast('success', 'Usuário criado com sucesso!');
        setShowForm(false);
        setForm({ email: '', password: '', role: 'client', client_id: '' });
      } else {
        toast('error', data.error ?? 'Erro ao criar usuário.');
      }
    } catch {
      toast('error', 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) toast('success', 'Usuário removido. Recarregue para ver.');
      else toast('error', 'Erro ao remover usuário.');
    } catch {
      toast('error', 'Erro de conexão.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Create Button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Criar usuário</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
                placeholder="cliente@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Senha inicial</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
                placeholder="Min. 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Papel</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
              >
                <option value="client">Cliente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'client' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Associar ao cliente</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4040E8]/20"
                  required={form.role === 'client'}
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...</> : <><Plus className="w-3.5 h-3.5" /> Criar</>}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Usuário', 'Papel', 'Cliente vinculado', 'Desde', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Cliente'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.clients ? (
                    <div className="flex items-center gap-2">
                      <ClientAvatar
                        name={user.clients.name}
                        color={user.clients.color}
                        initials={user.clients.initials}
                        size="sm"
                      />
                      <span className="text-sm text-gray-700">{user.clients.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Remover usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
