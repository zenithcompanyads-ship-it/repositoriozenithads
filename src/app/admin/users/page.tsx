import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { UsersManager } from './UsersManager';

async function getData() {
  const supabase = await createClient();
  const [{ data: users }, { data: clients }] = await Promise.all([
    supabase.from('users').select('*, clients(name, color, initials)').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
  ]);
  return { users: users ?? [], clients: clients ?? [] };
}

export default async function UsersPage() {
  const { users, clients } = await getData();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie acessos ao portal — {users.length} usuários
        </p>
      </div>
      <UsersManager users={users} clients={clients} />
    </div>
  );
}
