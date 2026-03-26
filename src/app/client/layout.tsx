import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalThemeProvider } from '@/components/client/PortalThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

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
  } | null = null;

  if (userData?.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('name, color, initials')
      .eq('id', userData.client_id)
      .single();
    clientData = data;
  }

  return (
    <ToastProvider>
      <PortalThemeProvider
        clientName={clientData?.name}
        userEmail={user.email}
        clientColor={clientData?.color}
        clientInitials={clientData?.initials ?? undefined}
      >
        {children}
      </PortalThemeProvider>
    </ToastProvider>
  );
}
