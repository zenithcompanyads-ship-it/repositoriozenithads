import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/ui/Toast';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') redirect('/client/dashboard');

  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <AdminSidebar userEmail={user.email} />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#0a0a0a', color: '#fff' }}>
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
