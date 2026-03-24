'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { ZenithLogo } from '@/components/ui/ZenithLogo';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

const ALL_TAB_ITEMS = [
  {
    href: '/client/dashboard',
    label: 'Visão Geral',
    permissionKey: null as keyof ClientPermissions | null,
  },
  {
    href: '/client/campaigns',
    label: 'Campanhas',
    permissionKey: 'campaigns' as keyof ClientPermissions,
  },
  {
    href: '/client/reports/monthly',
    label: 'Mensal',
    permissionKey: 'monthly_report' as keyof ClientPermissions,
  },
  {
    href: '/client/reports/weekly',
    label: 'Análise',
    permissionKey: 'weekly_report' as keyof ClientPermissions,
  },
  {
    href: '/client/plan',
    label: 'Planejamento',
    permissionKey: 'monthly_plan' as keyof ClientPermissions,
  },
];

interface ClientTopNavProps {
  clientName?: string;
  userEmail?: string;
  clientColor?: string;
  clientInitials?: string;
  permissions?: ClientPermissions;
}

export function ClientTopNav({
  clientName,
  userEmail,
  clientColor = '#4040E8',
  clientInitials = 'CL',
  permissions = DEFAULT_PERMISSIONS,
}: ClientTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const visibleTabs = ALL_TAB_ITEMS.filter(
    ({ permissionKey }) => permissionKey === null || permissions[permissionKey]
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
      style={{ height: '64px', backgroundColor: '#0a0a0a', borderBottom: '1px solid #1e1e1e' }}
    >
      {/* Left: Logo */}
      <div className="flex items-center shrink-0">
        <ZenithLogo variant="light" size={26} showText />
      </div>

      {/* Center: Tabs */}
      <nav className="flex items-center gap-1">
        {visibleTabs.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#4040E8] text-white'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right: Client info + logout */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ backgroundColor: clientColor }}
          >
            {clientInitials}
          </div>
          <span className="text-sm text-white font-medium hidden sm:block">
            {clientName ?? userEmail ?? 'Cliente'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#71717a] hover:text-white hover:bg-white/5 transition-colors"
          title="Sair"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Sair</span>
        </button>
      </div>
    </header>
  );
}
