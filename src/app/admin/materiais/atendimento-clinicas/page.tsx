import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function AtendimentoClinicasPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PlaybookShareButton slug="atendimento-clinicas" />
      <iframe
        src="/material-atendimento-clinicas.html"
        style={{ flex: 1, border: 'none', display: 'block' }}
        title="Atendimento para Clínicas"
      />
    </div>
  );
}
