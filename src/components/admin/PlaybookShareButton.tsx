'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

export function PlaybookShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/share/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '8px 16px',
      borderBottom: '1px solid var(--adm-border)',
      background: 'var(--adm-surface)',
    }}>
      <button
        onClick={handleCopy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          border: '1px solid var(--adm-border)',
          background: 'transparent',
          color: copied ? '#16a34a' : 'var(--adm-secondary)',
          transition: 'all 0.15s',
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            e.currentTarget.style.borderColor = 'var(--adm-accent)';
            e.currentTarget.style.color = 'var(--adm-accent)';
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.currentTarget.style.borderColor = 'var(--adm-border)';
            e.currentTarget.style.color = 'var(--adm-secondary)';
          }
        }}
      >
        {copied ? <Check size={12} /> : <Link2 size={12} />}
        {copied ? 'Link copiado' : 'Compartilhar'}
      </button>
    </div>
  );
}
