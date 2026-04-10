import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function PlaybookCriativosPage() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <PlaybookShareButton file="playbook-criativos.html" />
      <iframe
        src="/playbook-criativos.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Playbook de Criativos"
      />
    </div>
  );
}
