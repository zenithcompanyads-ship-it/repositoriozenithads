'use client';

import { useState, useEffect } from 'react';
import { ClientTopNav } from './ClientTopNav';
import type { ClientPermissions } from '@/types';
import { DEFAULT_PERMISSIONS } from '@/types';

interface PortalThemeProviderProps {
  children: React.ReactNode;
  clientName?: string;
  userEmail?: string;
  clientColor?: string;
  clientInitials?: string;
  permissions?: ClientPermissions;
}

export function PortalThemeProvider({
  children,
  clientName,
  userEmail,
  clientColor,
  clientInitials,
  permissions = DEFAULT_PERMISSIONS,
}: PortalThemeProviderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('portal-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal-theme', next);
  };

  const activeTheme = mounted ? theme : 'dark';

  return (
    <div className={`${activeTheme === 'dark' ? 'portal-dark' : 'portal-light'} min-h-screen`}>
      <ClientTopNav
        clientName={clientName}
        userEmail={userEmail}
        clientColor={clientColor}
        clientInitials={clientInitials}
        permissions={permissions}
        theme={activeTheme}
        onToggleTheme={toggleTheme}
      />
      <main className="min-h-screen pt-16">
        {children}
      </main>
    </div>
  );
}
