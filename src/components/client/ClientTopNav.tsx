'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { ZenithLogo } from '@/components/ui/ZenithLogo';
import { createClient } from '@/lib/supabase/client';

interface ClientTopNavProps {
  clientName?: string;
  userEmail?: string;
  clientColor?: string;
  clientInitials?: string;
}

export function ClientTopNav({
  clientName,
  userEmail,
  clientColor = '#4040E8',
  clientInitials = 'CL',
}: ClientTopNavProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
      style={{ height: '64px', backgroundColor: 'var(--pt-tab-bg, #0a0a0a)', borderBottom: '1px solid var(--pt-border, #1e1e1e)' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center shrink-0">
        <ZenithLogo variant="gradient" size={26} showText />
      </div>

      {/* Right: Client info + logout */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ backgroundColor: clientColor }}
          >
            {clientInitials}
          </div>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--pt-text, #fff)' }}>
            {clientName ?? userEmail ?? 'Cliente'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
          style={{ color: 'var(--pt-subtle, #71717a)' }}
          title="Sair"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
