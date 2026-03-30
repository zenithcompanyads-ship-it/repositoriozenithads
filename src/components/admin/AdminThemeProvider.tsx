'use client';

import { createContext, useContext, useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

const AdminThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'dark', toggle: () => {} });

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

export function AdminThemeProvider({
  children,
  initialTheme = 'dark',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.cookie = `adm-theme=${next};path=/;max-age=31536000`;
      return next;
    });
  }, []);

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      <div data-adm-theme={theme}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
