import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function PlaybookOperacionalPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PlaybookShareButton slug="playbook-operacional" />
      <iframe
        src="/playbook-operacional.html"
        style={{ flex: 1, border: 'none', display: 'block' }}
        title="Playbook Operacional"
      />
    </div>
  );
}
