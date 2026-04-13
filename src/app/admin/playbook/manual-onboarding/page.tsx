export default function ManualOnboardingPage() {
  return (
    <div style={{ background: '#FFF' }}>
      <div style={{
        background: '#1A1A2E',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          background: '#2563EB',
          borderRadius: '50%',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.5px',
        }}>
          Manual de onboarding <strong style={{ color: '#fff', fontWeight: 600 }}>ZENITH Company</strong>
        </span>
      </div>

      <div style={{ padding: '48px 24px 40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          border: '1px solid #E9ECEF',
          borderRadius: '100px',
          fontSize: '11px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#495057',
          marginBottom: '28px',
          fontWeight: 500,
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            background: '#2563EB',
            borderRadius: '50%',
          }} />
          Onboarding
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>
            ZENITH
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: '34px',
          lineHeight: 1.15,
          fontWeight: 400,
          marginBottom: '16px',
        }}>
          Manual de <em style={{ fontStyle: 'italic', color: '#1A56DB' }}>onboarding</em>
        </h1>

        <p style={{
          fontSize: '14px',
          lineHeight: 1.7,
          color: '#495057',
          fontWeight: 300,
          maxWidth: '340px',
        }}>
          Tudo que você precisa saber sobre os próximos passos, prazos, acessos e como vamos trabalhar juntos a partir de agora.
        </p>
      </div>

      <hr style={{
        height: '1px',
        background: 'linear-gradient(90deg, #E9ECEF 0%, transparent 100%)',
        margin: '0 24px',
        border: 'none',
      }} />

      {/* BEM-VINDO */}
      <section style={{ padding: '48px 24px' }}>
        <span style={{
          fontSize: '10px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#1A56DB',
          fontWeight: 600,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ width: '16px', height: '1px', background: '#1A56DB' }} />
          Bem-vindo
        </span>

        <h2 style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: '28px',
          lineHeight: 1.2,
          fontWeight: 400,
          marginBottom: '20px',
        }}>
          Parabéns pela <em style={{ fontStyle: 'italic', color: '#1A56DB' }}>decisão</em>
        </h2>

        <div style={{
          background: '#F8F9FA',
          borderRadius: '16px',
          padding: '28px 24px',
          marginTop: '24px',
          borderLeft: '3px solid #1A56DB',
        }}>
          <p style={{
            fontSize: '13px',
            color: '#495057',
            lineHeight: 1.7,
            marginBottom: '12px',
          }}>
            A partir de agora, a <strong>Zenith Company</strong> é responsável por estruturar e executar toda a sua operação de tráfego pago, funil de vendas e estratégia de aquisição de clientes.
          </p>
          <p style={{
            fontSize: '13px',
            color: '#495057',
            lineHeight: 1.7,
            marginBottom: '12px',
          }}>
            Nos próximos <strong>7 dias úteis</strong>, vamos construir toda a base antes de investir um centavo em anúncio. Isso inclui pesquisa de mercado, definição de ofertas, criação de landing page, criativos e scripts de vendas.
          </p>
          <p style={{
            fontSize: '13px',
            color: '#495057',
            lineHeight: 1.7,
          }}>
            Este manual explica como funciona esse processo, o que precisamos de você e o que esperar em cada etapa.
          </p>
        </div>
      </section>

      <hr style={{
        height: '1px',
        background: 'linear-gradient(90deg, #E9ECEF 0%, transparent 100%)',
        margin: '0 24px',
        border: 'none',
      }} />

      {/* TIMELINE */}
      <section style={{ padding: '48px 24px' }}>
        <span style={{
          fontSize: '10px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#1A56DB',
          fontWeight: 600,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ width: '16px', height: '1px', background: '#1A56DB' }} />
          Primeiros 7 dias
        </span>

        <h2 style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: '28px',
          lineHeight: 1.2,
          fontWeight: 400,
          marginBottom: '20px',
        }}>
          Fase de <em style={{ fontStyle: 'italic', color: '#1A56DB' }}>estruturação</em>
        </h2>

        <p style={{
          fontSize: '13px',
          color: '#495057',
          lineHeight: 1.6,
          marginBottom: '8px',
        }}>
          Antes de ativar qualquer campanha, montamos toda a base estratégica. Nada roda sem estrutura.
        </p>

        <div style={{ marginTop: '24px', position: 'relative', paddingLeft: '24px' }}>
          <div style={{
            position: 'absolute',
            left: '7px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            background: '#E9ECEF',
          }} />

          {[
            { day: 'Dia 01', title: 'Reunião de imersão', desc: 'Chamada de alinhamento para entender seu negócio a fundo: produtos/serviços mais vendidos, ticket médio, público ideal, sazonalidade, diferenciais e metas.', tag: 'Você + Zenith' },
            { day: 'Dia 01 a 02', title: 'Envio de acessos e materiais', desc: 'Você compartilha os acessos necessários e envia materiais visuais: logo, fotos, vídeos e qualquer conteúdo que possamos usar como base.', tag: 'Ação do cliente' },
            { day: 'Dia 02 a 03', title: 'Setup técnico', desc: 'Configuração do Pixel Meta, API de Conversões, tag Google Ads, domínio de rastreamento e integração com WhatsApp.', tag: 'Zenith executa' },
            { day: 'Dia 03 a 05', title: 'Estratégia, oferta e funil', desc: 'Definição da oferta principal, estrutura do funil, criação da landing page de captura, pesquisa de palavras-chave e mapeamento de públicos.', tag: 'Zenith executa' },
            { day: 'Dia 05 a 06', title: 'Criativos + Scripts + Manual', desc: 'Criação dos criativos para anúncio, script de vendas para WhatsApp, manual de atendimento ao lead e guia de follow-up.', tag: 'Zenith executa' },
            { day: 'Dia 06 a 07', title: 'Revisão e aprovação', desc: 'Apresentamos a landing page, os criativos e a estratégia para sua aprovação. Ajustes finais antes de ativar.', tag: 'Você + Zenith' },
            { day: 'Dia 08', title: 'Campanhas no ar', desc: 'Ativação oficial das campanhas em Meta Ads e Google Ads. Monitoramento diário e otimização contínua.', tag: 'Zenith executa' },
          ].map((item, idx) => (
            <div key={idx} style={{ position: 'relative', paddingBottom: '32px' }}>
              <div style={{
                position: 'absolute',
                left: '-24px',
                top: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '2.5px solid #1A56DB',
                background: '#FFF',
                zIndex: 1,
              }} />
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#1A56DB',
                fontWeight: 600,
                marginBottom: '6px',
              }}>
                {item.day}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#495057',
                lineHeight: 1.6,
              }}>
                {item.desc}
              </div>
              <span style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600,
                background: item.tag === 'Você + Zenith' ? 'rgba(34,197,94,0.08)' : item.tag === 'Ação do cliente' ? 'rgba(245,158,11,0.1)' : 'rgba(26,86,219,0.1)',
                color: item.tag === 'Você + Zenith' ? '#16A34A' : item.tag === 'Ação do cliente' ? '#D97706' : '#1A56DB',
              }}>
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      <hr style={{
        height: '1px',
        background: 'linear-gradient(90deg, #E9ECEF 0%, transparent 100%)',
        margin: '0 24px',
        border: 'none',
      }} />

      {/* FOOTER */}
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          ZENITH
        </div>
        <div style={{
          fontSize: '11px',
          color: '#ADB5BD',
          letterSpacing: '1px',
        }}>
          COMPANY
        </div>
        <div style={{
          width: '32px',
          height: '1px',
          background: '#E9ECEF',
          margin: '24px auto',
        }} />
        <div style={{
          fontSize: '11px',
          color: '#ADB5BD',
          lineHeight: 1.6,
        }}>
          Manual de Onboarding — ZENITH Company<br/>
          Versão 1.0 — Abril 2026<br/><br/>
          Este material é de uso interno entre<br/>
          a Zenith e seus clientes ativos.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
