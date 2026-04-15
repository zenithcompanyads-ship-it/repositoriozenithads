'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutGrid,
  Users,
  Zap,
  BookOpen,
  BarChart3,
  Grid3x3,
  FileText,
  Package,
  DollarSign,
  Settings,
  ChevronDown,
  Flame,
} from 'lucide-react';

interface NavItem {
  href?: string;
  icon: any;
  label: string;
  submenu?: NavItem[];
}

export function BottomNavigation({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { href: '/admin/clients', icon: Users, label: 'Clientes' },
    { href: '/admin/campaigns', icon: Zap, label: 'Campanhas' },
    {
      icon: FileText,
      label: 'Playbook',
      submenu: [
        { href: '/admin/playbook', icon: FileText, label: 'Visão Geral' },
        { href: '/admin/playbook/criativos', icon: FileText, label: 'Criativos' },
        { href: '/admin/playbook/operacional', icon: FileText, label: 'Operacional' },
        { href: '/admin/playbook/onboarding', icon: FileText, label: 'Onboarding' },
        { href: '/admin/playbook/manual-onboarding', icon: FileText, label: 'Manual Onboarding' },
      ],
    },
    {
      icon: Package,
      label: 'Materiais',
      submenu: [
        { href: '/admin/materiais/atendimento-clinicas', icon: Package, label: 'Atendimento Clínicas' },
        { href: '/admin/materiais/mensagens-onboarding', icon: Package, label: 'Mensagens Onboarding' },
        { href: '/admin/materiais/promptur-agencia', icon: Package, label: 'Promptur Agência' },
      ],
    },
    { href: '/admin/users', icon: Users, label: 'Usuários' },
    { href: '/admin/financeiro', icon: DollarSign, label: 'Financeiro' },
    { href: '/admin/notas', icon: BookOpen, label: 'Notas' },
    { href: '/admin/habitos', icon: Flame, label: 'Hábitos' },
    { href: '/admin/organizacao', icon: Grid3x3, label: 'Rotina' },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname.startsWith(href);
  };

  const isMenuActive = (submenu?: NavItem[]) => {
    if (!submenu) return false;
    return submenu.some((item) => item.href && pathname.startsWith(item.href));
  };

  const toggleMenu = (label: string) => {
    setExpandedMenu(expandedMenu === label ? null : label);
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenu === item.label;
    const isItemActive = item.href ? isActive(item.href) : isMenuActive(item.submenu);

    if (hasSubmenu) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleMenu(item.label)}
            className={`nav-bar-item nav-bar-submenu-toggle ${isItemActive || isExpanded ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            <ChevronDown
              size={16}
              className={`ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded && (
            <div className="nav-bar-submenu">
              {item.submenu.map((subitem) => (
                <Link
                  key={subitem.label}
                  href={subitem.href || '#'}
                  className={`nav-bar-item nav-bar-submenu-item ${isActive(subitem.href) ? 'active' : ''}`}
                  title={subitem.label}
                >
                  <span>{subitem.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href || '#'}
        className={`nav-bar-item ${isActive(item.href) ? 'active' : ''}`}
        title={item.label}
      >
        <item.icon size={20} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return <div className="nav-bar-ios">{navItems.map((item) => renderNavItem(item))}</div>;
}
