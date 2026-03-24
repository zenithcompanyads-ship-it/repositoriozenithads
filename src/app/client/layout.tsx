import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientTopNav } from '@/components/client/ClientTopNav';
import { ToastProvider } from '@/components/ui/Toast';
import type { ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'client') redirect('/admin/dashboard');

  let clientData: {
    name: string;
    color: string;
    initials: string | null;
    permissions: ClientPermissions;
  } | null = null;

  if (userData?.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('name, color, initials, permissions')
      .eq('id', userData.client_id)
      .single();
    clientData = data;
  }

  const permissions: ClientPermissions = clientData?.permissions ?? DEFAULT_PERMISSIONS;

  return (
    <ToastProvider>
      <div className="portal-dark min-h-screen">
        <ClientTopNav
          clientName={clientData?.name}
          userEmail={user.email}
          clientColor={clientData?.color}
          clientInitials={clientData?.initials ?? undefined}
          permissions={permissions}
        />
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
