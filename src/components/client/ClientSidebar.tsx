'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart2,
  Megaphone,
  FolderOpen,
  LogOut,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { ZenithLogo } from '@/components/ui/ZenithLogo';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

const ALL_NAV_ITEMS = [
  {
    href: '/client/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permissionKey: null, // always visible
  },
  {
    href: '/client/reports/weekly',
    label: 'Rel. Semanal',
    icon: FileText,
    permissionKey: 'weekly_report' as keyof ClientPermissions,
  },
  {
    href: '/client/reports/biweekly',
    label: 'Rel. Quinzenal',
    icon: BarChart2,
    permissionKey: 'biweekly_report' as keyof ClientPermissions,
  },
  {
    href: '/client/reports/monthly',
    label: 'Rel. Mensal',
    icon: BarChart2,
    permissionKey: 'monthly_report' as keyof ClientPermissions,
  },
  {
    href: '/client/campaigns',
    label: 'Campanhas',
    icon: Megaphone,
    permissionKey: 'campaigns' as keyof ClientPermissions,
  },
  {
    href: '/client/documents',
    label: 'Documentos',
    icon: FolderOpen,
    permissionKey: 'documents' as keyof ClientPermissions,
  },
];

interface ClientSidebarProps {
  clientName?: string;
  userEmail?: string;
  clientColor?: string;
  clientInitials?: string;
  permissions?: ClientPermissions;
}

export function ClientSidebar({
  clientName,
  userEmail,
  clientColor = '#4040E8',
  clientInitials = 'CL',
  permissions = DEFAULT_PERMISSIONS,
}: ClientSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Filter items by permissions
  const visibleItems = ALL_NAV_ITEMS.filter(
    ({ permissionKey }) => permissionKey === null || permissions[permissionKey]
  );

  return (
    <aside className="w-60 min-h-screen bg-zenith-dark flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <ZenithLogo variant="light" size={28} showText />
      </div>

      {/* Client Info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: clientColor }}
          >
            {clientInitials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {clientName ?? 'Minha Conta'}
            </p>
            <p className="text-zenith-gray text-[11px]">Área do cliente</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'sidebar-item',
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-[#8B94A3] text-[11px] truncate">
            {userEmail ?? ''}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item sidebar-item-inactive w-full"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
