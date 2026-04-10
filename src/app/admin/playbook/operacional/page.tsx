import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function PlaybookOperacionalPage() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <PlaybookShareButton slug="playbook-operacional" />
      <iframe
        src="/playbook-operacional.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Playbook Operacional"
      />
    </div>
  );
}
