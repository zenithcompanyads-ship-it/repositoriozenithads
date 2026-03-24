'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ZenithLogo } from '@/components/ui/ZenithLogo';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('E-mail ou senha incorretos. Tente novamente.');
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userData?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/client/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="flex flex-col items-center gap-2">
            <svg width="52" height="52" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="loginGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6B4EFF" />
                  <stop offset="100%" stopColor="#FF4D00" />
                </linearGradient>
              </defs>
              <rect x="4" y="5" width="24" height="5" rx="2.5" fill="url(#loginGrad)" />
              <rect x="4" y="5" width="27" height="5" rx="2.5" fill="url(#loginGrad)" transform="rotate(35 16 16)" />
              <rect x="4" y="22" width="24" height="5" rx="2.5" fill="url(#loginGrad)" />
            </svg>
            <div className="text-center">
              <p className="text-white font-bold tracking-[0.15em] text-xl leading-none">ZENITH</p>
              <p className="text-white/60 font-semibold tracking-[0.1em] text-[11px] mt-0.5">COMPANY ADS</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-white">Bem-vindo de volta</h1>
          <p className="text-sm mt-1" style={{ color: '#71717a' }}>
            Entre com sua conta para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#a1a1aa' }}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 transition-colors"
              style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#fff' }}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#a1a1aa' }}>
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-colors pr-10"
                style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', color: '#fff' }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#71717a' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm px-3.5 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)' }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs mt-8" style={{ color: '#3f3f46' }}>
          © {new Date().getFullYear()} Zenith Company Ads. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
