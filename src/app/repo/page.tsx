import type { Metadata } from 'next';
import { ZenithLogo } from '@/components/ui/ZenithLogo';

export const metadata: Metadata = {
  title: 'Zenith Company Ads — Gestão de Tráfego Pago',
  description: 'Relatórios automáticos, portal do cliente e análise com IA para gestores de tráfego que querem se destacar.',
};

// ── Data ─────────────────────────────────────────────────────────────────────

const benefits = [
  {
    icon: '📊',
    title: 'Relatórios automáticos',
    desc: 'Suba um CSV do Meta Ads e em segundos seu cliente recebe um relatório premium com gráficos, funil de conversão e análise estratégica.',
  },
  {
    icon: '⚡',
    title: 'Dashboard em tempo real',
    desc: 'Dados das campanhas sincronizados diariamente via Meta Graph API. Tudo visível num painel limpo e organizado por cliente.',
  },
  {
    icon: '🔐',
    title: 'Portal exclusivo por cliente',
    desc: 'Cada cliente acessa apenas seus próprios dados. Você controla o que publicar e quando. Relatórios ficam em rascunho até você aprovar.',
  },
  {
    icon: '🤖',
    title: 'Análise com IA (Claude)',
    desc: 'Cada relatório inclui uma análise gerada por IA: pontos positivos, oportunidades e recomendações estratégicas contextualizadas.',
  },
  {
    icon: '👥',
    title: 'Multi-cliente centralizado',
    desc: 'Gerencie todos os clientes em um único painel. Veja alertas, metas e performance de cada conta sem trocar de ferramenta.',
  },
  {
    icon: '🔔',
    title: 'Alertas automáticos',
    desc: 'O sistema monitora metas e dispara alertas quando uma campanha sai do esperado — antes que o cliente note qualquer problema.',
  },
];

const testimonials = [
  {
    quote: 'Antes eu gastava horas montando relatório no PowerPoint. Hoje subo o CSV e em 30 segundos está pronto. Meus clientes ficaram impressionados com a qualidade.',
    name: 'Mariana Costa',
    role: 'Gestora de Tráfego · 14 clientes ativos',
    initial: 'M',
  },
  {
    quote: 'O portal do cliente mudou completamente a percepção de valor. Eles acompanham os dados sozinhos e chegam nas reuniões já preparados. Reduziu cancelamentos a zero.',
    name: 'Rafael Mendes',
    role: 'Agência de Performance · São Paulo',
    initial: 'R',
  },
  {
    quote: 'A análise com IA é o diferencial. Ela gera os insights que eu levaria 1h para escrever. O relatório ficou mais completo do que eu fazia manualmente.',
    name: 'Juliana Farias',
    role: 'Freelancer · Especialista Meta Ads',
    initial: 'J',
  },
];

const stats = [
  { value: '2.400+', label: 'Relatórios gerados' },
  { value: '180+', label: 'Clientes atendidos' },
  { value: '98%', label: 'Taxa de retenção' },
  { value: '< 60s', label: 'Para gerar um relatório' },
];

const faqs = [
  {
    q: 'Como funciona a integração com o Meta Ads?',
    a: 'Você exporta o CSV diretamente do Meta Ads Manager e faz o upload no portal. O sistema processa automaticamente, identifica campanhas, calcula métricas e gera o relatório. Também oferecemos sincronização diária via Meta Graph API para clientes com integração ativa.',
  },
  {
    q: 'Os clientes precisam instalar ou configurar algo?',
    a: 'Não. Os clientes recebem um link de acesso ao portal e fazem login com e-mail e senha. Tudo roda na web, sem instalação. Você controla quais relatórios são visíveis para cada cliente.',
  },
  {
    q: 'Posso personalizar os relatórios antes de publicar?',
    a: 'Sim. Todo relatório fica em rascunho até você decidir publicar. Você pode visualizar, revisar e aprovar o conteúdo. O layout segue um padrão premium com a identidade visual da Zenith.',
  },
  {
    q: 'A análise com IA é gerada automaticamente?',
    a: 'Sim. Ao processar o CSV, o Claude (IA da Anthropic) analisa os dados das campanhas e gera insights: pontos positivos, oportunidades de melhoria e recomendações para o próximo período. Tudo em português e contextualizado aos seus dados.',
  },
  {
    q: 'Qual é o modelo de contratação?',
    a: 'O acesso ao portal é sob demanda. Entre em contato para conhecer os planos disponíveis para gestores individuais e agências com múltiplos clientes.',
  },
];

// ── Components ────────────────────────────────────────────────────────────────

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
      {children}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RepoPage() {
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: '1px solid #1e1e1e', position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <ZenithLogo size={28} />
          <a
            href="mailto:contato@zenithcompanyads.com"
            style={{ background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.02em' }}
          >
            Falar com a equipe
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '100px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* glow blobs */}
        <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(107,78,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,77,0,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(107,78,255,0.1)', border: '1px solid rgba(107,78,255,0.25)', borderRadius: 100, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Portal SaaS · Meta Ads
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 22 }}>
            Tráfego pago que transforma<br />
            <GradientText>investimento em resultado.</GradientText>
          </h1>

          <p style={{ fontSize: 18, color: '#a1a1aa', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            Relatórios automáticos, portal do cliente e análise com IA — tudo que um gestor de tráfego precisa para escalar com profissionalismo.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:contato@zenithcompanyads.com"
              style={{ background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)', color: '#fff', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.02em' }}
            >
              Solicitar demonstração
            </a>
            <a
              href="#beneficios"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a2a', color: '#a1a1aa', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{ borderTop: '1px solid #1e1e1e', borderBottom: '1px solid #1e1e1e', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#1e1e1e', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: '#111111', padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6, background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#71717a', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="beneficios" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B4EFF', marginBottom: 12 }}>Por que a Zenith</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>
              Uma plataforma. Zero retrabalho.
            </h2>
            <p style={{ fontSize: 16, color: '#71717a', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Do upload do CSV ao relatório publicado para o cliente em menos de 60 segundos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {benefits.map((b) => (
              <div
                key={b.title}
                style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: 14, padding: '28px 24px', transition: 'border-color 0.2s' }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{b.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: '#fff' }}>{b.title}</h3>
                <p style={{ fontSize: 13, color: '#71717a', lineHeight: 1.65 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(107,78,255,0.15), rgba(255,77,0,0.08))', border: '1px solid rgba(107,78,255,0.25)', borderRadius: 20, padding: '64px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(circle, rgba(107,78,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 16, position: 'relative' }}>Comece agora</p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, position: 'relative' }}>
              Pronto para elevar o nível<br />dos seus relatórios?
            </h2>
            <p style={{ fontSize: 16, color: '#a1a1aa', marginBottom: 36, position: 'relative' }}>
              Fale com a equipe e veja uma demonstração ao vivo da plataforma.
            </p>
            <a
              href="mailto:contato@zenithcompanyads.com"
              style={{ display: 'inline-block', background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)', color: '#fff', padding: '16px 40px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.02em', position: 'relative' }}
            >
              Solicitar demonstração gratuita
            </a>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B4EFF', marginBottom: 12 }}>Prova Social</p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              O que dizem os gestores
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {testimonials.map((t) => (
              <div key={t.name} style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: 14, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 20, color: '#6B4EFF', lineHeight: 1 }}>"</div>
                <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.7, flexGrow: 1 }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4, borderTop: '1px solid #1e1e1e' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6B4EFF, #FF4D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {t.initial}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B4EFF', marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Perguntas frequentes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map((f) => (
              <details
                key={f.q}
                style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}
              >
                <summary style={{ padding: '18px 22px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                  {f.q}
                  <span style={{ fontSize: 18, color: '#52525b', flexShrink: 0, marginLeft: 16 }}>+</span>
                </summary>
                <div style={{ padding: '0 22px 18px', fontSize: 14, color: '#71717a', lineHeight: 1.7, borderTop: '1px solid #1e1e1e' }}>
                  <div style={{ paddingTop: 16 }}>{f.a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #1e1e1e', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <ZenithLogo size={24} />
          <p style={{ fontSize: 12, color: '#3f3f46' }}>
            © {new Date().getFullYear()} Zenith Company Ads. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}
