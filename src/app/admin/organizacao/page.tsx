'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Loader } from 'lucide-react';
import { initializeRud } from '@/lib/rud-client';

export default function OrganizacaoPage() {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const loadHtml = async () => {
      try {
        const response = await fetch('/rud-organizacao.html');
        const html = await response.text();
        setHtmlContent(html);
      } catch (error) {
        console.error('Error loading HTML:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHtml();
  }, []);

  // Initialize Rud JavaScript when HTML is loaded
  useEffect(() => {
    if (htmlContent) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        initializeRud();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [htmlContent]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--adm-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p>Carregando Rud...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      suppressHydrationWarning
    />
  );
}
