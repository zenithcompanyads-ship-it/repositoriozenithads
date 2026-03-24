'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  LogOut,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { ZenithLogo } from '@/components/ui/ZenithLogo';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/clients',
    label: 'Clientes',
    icon: Users,
  },
  {
    href: '/admin/campaigns',
    label: 'Campanhas',
    icon: Megaphone,
  },
  {
    href: '/admin/users',
    label: 'Usuários',
    icon: Users,
  },
];

interface AdminSidebarProps {
  userEmail?: string;
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-60 min-h-screen bg-zenith-dark flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <ZenithLogo variant="light" size={28} showText />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
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
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
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
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-zenith-primary flex items-center justify-center text-white text-xs font-bold">
            DM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Admin</p>
            <p className="text-zenith-gray text-[11px] truncate">
              {userEmail ?? 'admin@zenith.com'}
            </p>
          </div>
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
