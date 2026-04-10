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
    <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}>
      <button
        onClick={handleCopy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.15s',
          background: copied ? '#16a34a' : '#4040E8',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? 'Link copiado!' : 'Link compartilhável'}
      </button>
    </div>
  );
}
