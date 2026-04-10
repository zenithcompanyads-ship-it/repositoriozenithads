import { notFound } from 'next/navigation';

const slugMap: Record<string, string> = {
  'playbook-operacional':        'playbook-operacional.html',
  'playbook-onboarding':         'playbook-onboarding.html',
  'playbook-criativos':          'playbook-criativos.html',
  'atendimento-clinicas':        'material-atendimento-clinicas.html',
};

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugMap[slug]) notFound();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <iframe
        src={`/${slugMap[slug]}`}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title={slug}
      />
    </div>
  );
}

export async function generateStaticParams() {
  return Object.keys(slugMap).map((slug) => ({ slug }));
}
