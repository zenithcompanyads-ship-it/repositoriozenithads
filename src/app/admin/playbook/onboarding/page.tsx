import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function PlaybookOnboardingPage() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <PlaybookShareButton slug="playbook-onboarding" />
      <iframe
        src="/playbook-onboarding.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Playbook Onboarding"
      />
    </div>
  );
}
