import { createClient } from '@/lib/supabase/server';
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
    <div style={{ background: 'var(--adm-bg)', minHeight: '100vh', padding: '36px 40px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--adm-accent)', marginBottom: 6 }}>
          Zenith · Acesso
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: 'var(--adm-text)', margin: 0 }}>
          Usuários<em style={{ color: 'var(--adm-accent)', fontStyle: 'italic' }}>.</em>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--adm-secondary)', marginTop: 6 }}>
          Gerencie acessos ao portal — {users.length} usuários
        </p>
        <div style={{ width: 40, height: 2, background: 'var(--adm-accent)', borderRadius: 2, marginTop: 12, opacity: 0.6 }} />
      </div>
      <UsersManager users={users} clients={clients} />
    </div>
  );
}
