'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export function PDFDownloadButton() {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 120);
  };

  return (
    <button
      onClick={handlePrint}
      disabled={printing}
      data-print-hide
      className="fixed bottom-6 right-6 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(200,168,74,0.18) 0%, rgba(64,96,224,0.12) 100%)',
        border: '1px solid rgba(200,168,74,0.35)',
        color: '#E4CF78',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,168,74,0.28) 0%, rgba(64,96,224,0.2) 100%)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,168,74,0.55)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(200,168,74,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,168,74,0.18) 0%, rgba(64,96,224,0.12) 100%)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,168,74,0.35)';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
      }}
    >
      {printing
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Download className="w-4 h-4" />}
      {printing ? 'Preparando...' : 'Baixar PDF'}
    </button>
  );
}
