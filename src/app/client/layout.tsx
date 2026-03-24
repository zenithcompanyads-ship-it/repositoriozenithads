import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientSidebar } from '@/components/client/ClientSidebar';
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
      <div className="flex min-h-screen">
        <ClientSidebar
          clientName={clientData?.name}
          userEmail={user.email}
          clientColor={clientData?.color}
          clientInitials={clientData?.initials ?? undefined}
          permissions={permissions}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
