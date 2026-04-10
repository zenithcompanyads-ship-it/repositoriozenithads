'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Megaphone, LogOut, UserCog, Sun, Moon, BookOpen, ChevronDown, ChevronRight, Wrench, UserCheck, Palette } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAdminTheme } from './AdminThemeProvider';
import { useState } from 'react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/clients',   label: 'Clientes',    icon: Users },
  { href: '/admin/campaigns', label: 'Campanhas',   icon: Megaphone },
  { href: '/admin/users',     label: 'Usuários',    icon: UserCog },
];

const playbookItems = [
  { href: '/admin/playbook/operacional', label: 'Operacional', icon: Wrench },
  { href: '/admin/playbook/onboarding',  label: 'Onboarding',  icon: UserCheck },
  { href: '/admin/playbook/criativos',   label: 'Criativos',   icon: Palette },
];

interface AdminSidebarProps {
  userEmail?: string;
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useAdminTheme();
  const isPlaybookActive = pathname.startsWith('/admin/playbook');
  const [playbookOpen, setPlaybookOpen] = useState(isPlaybookActive);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = (userEmail ?? 'AD').split('@')[0].slice(0, 2).toUpperCase();

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      background: 'var(--adm-surface)',
      borderRight: '1px solid var(--adm-border)',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid var(--adm-border)' }}>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--adm-text)',
          letterSpacing: '0.02em',
        }}>
          ZENITH<span style={{ color: 'var(--adm-accent)' }}>.</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--adm-muted)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Painel de Gestão
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
                transition: 'background 0.12s, color 0.12s',
                background: isActive ? 'var(--adm-accent-subtle)' : 'transparent',
                color: isActive ? 'var(--adm-accent)' : 'var(--adm-secondary)',
                borderLeft: isActive ? '2px solid var(--adm-accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(128,128,128,0.08)';
                  e.currentTarget.style.color = 'var(--adm-body)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--adm-secondary)';
                }
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}

        {/* Playbook submenu */}
        <button
          onClick={() => setPlaybookOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: isPlaybookActive ? 500 : 400,
            letterSpacing: '-0.01em',
            background: isPlaybookActive ? 'var(--adm-accent-subtle)' : 'transparent',
            color: isPlaybookActive ? 'var(--adm-accent)' : 'var(--adm-secondary)',
            borderLeft: isPlaybookActive ? '2px solid var(--adm-accent)' : '2px solid transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            if (!isPlaybookActive) {
              e.currentTarget.style.background = 'rgba(128,128,128,0.08)';
              e.currentTarget.style.color = 'var(--adm-body)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isPlaybookActive) {
              e.currentTarget.style.background = isPlaybookActive ? 'var(--adm-accent-subtle)' : 'transparent';
              e.currentTarget.style.color = isPlaybookActive ? 'var(--adm-accent)' : 'var(--adm-secondary)';
            }
          }}
        >
          <BookOpen size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Playbook</span>
          {playbookOpen
            ? <ChevronDown size={13} style={{ flexShrink: 0 }} />
            : <ChevronRight size={13} style={{ flexShrink: 0 }} />}
        </button>

        {playbookOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 10 }}>
            {playbookItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: isActive ? 500 : 400,
                    letterSpacing: '-0.01em',
                    textDecoration: 'none',
                    transition: 'background 0.12s, color 0.12s',
                    background: isActive ? 'var(--adm-accent-subtle)' : 'transparent',
                    color: isActive ? 'var(--adm-accent)' : 'var(--adm-secondary)',
                    borderLeft: isActive ? '2px solid var(--adm-accent)' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(128,128,128,0.08)';
                      e.currentTarget.style.color = 'var(--adm-body)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--adm-secondary)';
                    }
                  }}
                >
                  <Icon size={13} style={{ flexShrink: 0 }} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--adm-border)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 500, color: 'var(--adm-secondary)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s', letterSpacing: '-0.01em',
            marginBottom: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--adm-accent-subtle)';
            e.currentTarget.style.color = 'var(--adm-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--adm-secondary)';
          }}
        >
          {theme === 'dark'
            ? <Sun size={14} style={{ flexShrink: 0 }} />
            : <Moon size={14} style={{ flexShrink: 0 }} />}
          {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 2 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--adm-accent), var(--adm-accent-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--adm-accent-on)', flexShrink: 0, letterSpacing: '0.04em',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--adm-text)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Admin
            </p>
            <p style={{ fontSize: 11, color: 'var(--adm-muted)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail ?? 'admin@zenith.com'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 400, color: 'var(--adm-muted)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s', letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(242,112,61,0.08)';
            e.currentTarget.style.color = '#F2703D';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--adm-muted)';
          }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          Sair
        </button>
      </div>
    </aside>
  );
}
