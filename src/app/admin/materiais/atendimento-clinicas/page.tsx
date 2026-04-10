import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function AtendimentoClinicasPage() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <PlaybookShareButton file="material-atendimento-clinicas.html" />
      <iframe
        src="/material-atendimento-clinicas.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Atendimento para Clínicas"
      />
    </div>
  );
}
