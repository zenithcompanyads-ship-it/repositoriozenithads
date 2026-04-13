import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { BottomNavigation } from '@/components/admin/BottomNavigation';
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider';
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

  const cookieStore = await cookies();
  const initialTheme = (cookieStore.get('adm-theme')?.value ?? 'dark') as 'dark' | 'light';

  return (
    <ToastProvider>
      <AdminThemeProvider initialTheme={initialTheme}>
        <div className="glass-theme min-h-screen w-full">
          <main className="content-with-nav relative z-10 min-h-screen">
            {children}
          </main>
          <BottomNavigation userEmail={user.email} />
        </div>
      </AdminThemeProvider>
    </ToastProvider>
  );
}
