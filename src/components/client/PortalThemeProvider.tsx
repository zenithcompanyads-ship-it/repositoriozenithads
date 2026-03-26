'use client';

import { useEffect, useRef } from 'react';
import { ClientTopNav } from './ClientTopNav';

interface PortalThemeProviderProps {
  children: React.ReactNode;
  clientName?: string;
  userEmail?: string;
  clientColor?: string;
  clientInitials?: string;
}

export function PortalThemeProvider({
  children,
  clientName,
  userEmail,
  clientColor,
  clientInitials,
}: PortalThemeProviderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.classList.add('portal-dark');
    }
  }, []);

  return (
    <div ref={ref} className="portal-dark min-h-screen">
      <ClientTopNav
        clientName={clientName}
        userEmail={userEmail}
        clientColor={clientColor}
        clientInitials={clientInitials}
      />
      <main className="min-h-screen pt-16">
        {children}
      </main>
    </div>
  );
}
