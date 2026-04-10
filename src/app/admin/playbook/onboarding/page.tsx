import { PlaybookShareButton } from '@/components/admin/PlaybookShareButton';

export default function PlaybookOnboardingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PlaybookShareButton slug="playbook-onboarding" />
      <iframe
        src="/playbook-onboarding.html"
        style={{ flex: 1, border: 'none', display: 'block' }}
        title="Playbook Onboarding"
      />
    </div>
  );
}
