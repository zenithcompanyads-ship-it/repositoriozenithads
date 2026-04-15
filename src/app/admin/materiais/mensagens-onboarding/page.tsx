export default function MensagensOnboardingPage() {
  const messages = [
    {
      title: 'Mensagem de Boas-vindas',
      timing: 'Enviar no 1º dia',
      message: '👋 Olá! Bem-vindo à Zenith! Estamos animados para começar essa jornada contigo. Nos próximos 7 dias, vamos estruturar toda a base da sua estratégia de tráfego pago. Você receberá atualizações diárias de progresso. Alguma dúvida? Estou aqui! 🚀',
      color: '#10B981'
    },
    {
      title: 'Solicitação de Acessos',
      timing: 'Enviar no 1º-2º dia',
      message: '📋 Precisamos dos seguintes acessos para configurar tudo:\n\n✓ Meta Ads (role de administrador)\n✓ Google Analytics\n✓ Google Search Console\n✓ Dados de produtos/serviços\n✓ Fotos, vídeos e logos\n\nPode enviá-los nesta thread? Obrigado!',
      color: '#3B82F6'
    },
    {
      title: 'Confirmação de Recebimento',
      timing: 'Após receber acessos',
      message: '✅ Recebemos seus acessos com sucesso! Já começamos a análise do seu ambiente. Você receberá um sumário completo amanhã cedo com os próximos passos.',
      color: '#06B6D4'
    },
    {
      title: 'Reunião de Imersão Confirmada',
      timing: 'Antes da reunião',
      message: '📞 Ótimo! Confirmamos nossa reunião de imersão AMANHÃ às [HORA]. Faremos uma chamada de 1-2 horas para entender seu negócio a fundo:\n\n• Produtos/serviços principais\n• Ticket médio\n• Público ideal\n• Sazonalidade\n• Diferenciais únicos\n• Metas de faturamento\n\nLink da reunião: [LINK]',
      color: '#F59E0B'
    },
    {
      title: 'Setup Técnico em Andamento',
      timing: '2º-3º dia',
      message: '⚙️ Iniciamos o setup técnico! Estamos configurando:\n\n✓ Pixel Meta\n✓ API de Conversões\n✓ Google Ads Tags\n✓ Rastreamento de eventos\n✓ Integração com WhatsApp\n\nEstarei te atualizando conforme avançamos. Alguma questão técnica? Avisa aqui!',
      color: '#8B5CF6'
    },
    {
      title: 'Landing Page Pronta para Revisão',
      timing: '3º-4º dia',
      message: '🎨 Sua landing page está pronta! Acesse aqui: [LINK]\n\nReview e confirma se tá legal. Qualquer ajuste, é só chamar que a gente refaz rápido. Tem prazo até amanhã para aprovar? 👍',
      color: '#EC4899'
    },
    {
      title: 'Criativos Aprovados',
      timing: '5º dia',
      message: '✨ Os criativos para os anúncios estão prontos! Confira:\n\n[ANEXAR CRIATIVOS]\n\nTá bom assim ou quer alguma alteração? Preciso da sua aprovação para ativar as campanhas amanhã.',
      color: '#EF4444'
    },
    {
      title: 'Manual de Atendimento Enviado',
      timing: '5º-6º dia',
      message: '📚 Enviamos o script de vendas e manual de atendimento para seus vendedores:\n\n📄 Manual completo: [LINK]\n💬 Script WhatsApp: [LINK]\n📞 Guia de follow-up: [LINK]\n\nOs clientes vão chegar pelas campanhas, bora treinar o time!',
      color: '#14B8A6'
    },
    {
      title: 'Revisão Final e Aprovação',
      timing: '6º dia',
      message: '🔍 Última revisão antes de ir ao ar!\n\nLanding: ✅ Aprovada\nCriativos: ✅ Aprovados\nSetup técnico: ✅ Configurado\n\nTá tudo pronto? Posso ativar as campanhas amanhã cedo?',
      color: '#06B6D4'
    },
    {
      title: 'Campanhas Ativadas',
      timing: '7º-8º dia',
      message: '🚀 CAMPANHAS NO AR! 🎉\n\nSua primeira campanha está oficialmente ativa em Meta Ads e Google Ads. Os primeiros leads começam a chegar agora.\n\n📊 Dashboard em tempo real: [LINK]\n📱 Você receberá relatórios diários\n⏰ Monitoramento contínuo ativa\n\nQualquer dúvida durante o processo, era comigo! 💪',
      color: '#10B981'
    },
    {
      title: 'Checkpoint - Primeiros Resultados',
      timing: '10º-12º dia',
      message: '📈 Primeira análise! Aqui estão os resultados dos primeiros dias:\n\n📊 Cliques: XXX\n👥 Leads: XXX\n💵 CPC Médio: R$ XXX\n📉 CTR: XXX%\n\nEstamos otimizando em tempo real. Vamos fazer uma rápida call amanhã para alinhamento? 30 min okay?',
      color: '#8B5CF6'
    },
    {
      title: 'Relatório Semanal',
      timing: 'Toda 2ª feira',
      message: '📋 Relatório semanal estará pronto amanhã!\n\nVocê poderá acessar:\n✓ Métricas em tempo real\n✓ Análise de desempenho\n✓ Recomendações de otimização\n✓ Próximos passos\n\nLink do portal: [LINK]',
      color: '#06B6D4'
    },
    {
      title: 'Dúvida / Suporte',
      timing: 'Sempre que necessário',
      message: '👋 Oi! Qual é a sua dúvida? Estou aqui pra ajudar. Envia que respondo ASAP! 🙌',
      color: '#F59E0B'
    },
  ];

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
          Mensagens prontas de onboarding <strong style={{ color: '#fff', fontWeight: 600 }}>ZENITH</strong>
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
          Comunicação
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
          Mensagens prontas de <em style={{ fontStyle: 'italic', color: '#1A56DB' }}>onboarding</em>
        </h1>

        <p style={{
          fontSize: '14px',
          lineHeight: 1.7,
          color: '#495057',
          fontWeight: 300,
          maxWidth: '340px',
        }}>
          Copie e cole! Templates de mensagens para cada etapa do onboarding do seu cliente. Customize conforme necessário.
        </p>
      </div>

      <hr style={{
        height: '1px',
        background: 'linear-gradient(90deg, #E9ECEF 0%, transparent 100%)',
        margin: '0 24px',
        border: 'none',
      }} />

      {/* MENSAGENS */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{
          display: 'grid',
          gap: '32px',
        }}>
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: msg.color,
                  marginTop: '6px',
                  flexShrink: 0,
                }} />
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: '0 0 4px 0',
                  }}>
                    {msg.title}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    color: '#ADB5BD',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}>
                    {msg.timing}
                  </span>
                </div>
              </div>

              <div style={{
                background: '#F8F9FA',
                borderRadius: '12px',
                padding: '20px',
                borderLeft: `4px solid ${msg.color}`,
                position: 'relative',
              }}>
                <p style={{
                  fontSize: '13px',
                  color: '#495057',
                  lineHeight: 1.8,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {msg.message}
                </p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.message);
                    alert('✅ Mensagem copiada!');
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: msg.color,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  📋 Copiar
                </button>
              </div>
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
          Mensagens Prontas de Onboarding — ZENITH Company<br/>
          Versão 1.0 — Abril 2026<br/><br/>
          Material de suporte para agilizar a comunicação<br/>
          com clientes em fase de onboarding.
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
