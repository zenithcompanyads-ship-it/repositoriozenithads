'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  Zap,
  BookOpen,
  BarChart3,
  Grid3x3,
  LogOut,
  Settings,
} from 'lucide-react';

export function BottomNavigation({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { href: '/admin/clients', icon: Users, label: 'Clientes' },
    { href: '/admin/campaigns', icon: Zap, label: 'Campanhas' },
    { href: '/admin/notas', icon: BookOpen, label: 'Notas' },
    { href: '/admin/organizacao', icon: Grid3x3, label: 'Rud' },
  ];

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  return (
    <div className="nav-bar-ios">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-bar-item ${isActive(item.href) ? 'active' : ''}`}
          title={item.label}
        >
          <item.icon size={24} />
          <span>{item.label}</span>
        </Link>
      ))}
      <button
        onClick={() => {}}
        className="nav-bar-item hover:text-red-400"
        title="Settings"
      >
        <Settings size={24} />
        <span>Config</span>
      </button>
    </div>
  );
}
