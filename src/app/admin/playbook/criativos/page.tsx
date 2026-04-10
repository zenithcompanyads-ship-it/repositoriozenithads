import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function PlaybookCriativosPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PlaybookShareButton slug="playbook-criativos" />
      <iframe
        src="/playbook-criativos.html"
        style={{ flex: 1, border: 'none', display: 'block' }}
        title="Playbook de Criativos"
      />
    </div>
  );
}
