'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

interface Props {
  clientName: string;
  redirectTo?: string;
}

export function WelcomeScreen({ clientName, redirectTo = '/client/reports' }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setBtnVisible(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const firstName = clientName.split(' ')[0];

  return (
    <>
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .wu-bg    { animation: fade-in .8s ease both; }
        .wu-card  { animation: fade-up .9s cubic-bezier(.22,1,.36,1) .1s both; }
        .wu-tag   { animation: fade-up .7s cubic-bezier(.22,1,.36,1) .3s both; }
        .wu-label { animation: fade-up .7s cubic-bezier(.22,1,.36,1) .5s both; }
        .wu-name  { animation: fade-up .8s cubic-bezier(.22,1,.36,1) .7s both; }
        .wu-sub   { animation: fade-up .7s cubic-bezier(.22,1,.36,1) .95s both; }
        .wu-btn   { animation: fade-up .6s cubic-bezier(.34,1.56,.64,1) 0s both; }
      `}</style>

      <div
        className="wu-bg fixed inset-0 flex items-center justify-center px-5"
        style={{ background: '#0a0a0a' }}
      >
        {visible && (
          <div
            className="wu-card w-full max-w-sm rounded-2xl px-8 py-10 flex flex-col items-center text-center gap-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Tag */}
            <div className="wu-tag">
              <span
                className="text-[10px] font-semibold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Zenith Company
              </span>
            </div>

            {/* Label */}
            <div className="wu-label flex flex-col gap-1">
              <p
                className="text-sm font-light tracking-wide"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Seja bem-vindo ao teu portal,
              </p>
            </div>

            {/* Name */}
            <div className="wu-name">
              <h1
                className="font-semibold leading-none tracking-tight"
                style={{
                  fontSize: 'clamp(2.4rem, 9vw, 3.8rem)',
                  color: '#ffffff',
                }}
              >
                {firstName}
              </h1>
            </div>

            {/* Divider */}
            <div
              className="wu-sub w-8 h-px"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            />

            {/* Subtitle */}
            <p
              className="wu-sub text-xs leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.28)', maxWidth: '200px' }}
            >
              Seus resultados e materiais estão aqui.
            </p>

            {/* CTA */}
            {btnVisible && (
              <button
                onClick={() => router.push(redirectTo)}
                className="wu-btn group mt-1 flex items-center gap-2 text-sm font-medium transition-all duration-200"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              >
                Acessar portal
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
