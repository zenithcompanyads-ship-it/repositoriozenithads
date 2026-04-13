import NotesBlock from '@/components/admin/NotesBlock';

export default function NotasPage() {
  return (
    <div style={{ background: 'var(--adm-bg)', minHeight: '100vh' }}>
      <div style={{
        padding: '24px 32px',
        background: 'var(--adm-surface)',
        borderBottom: '1px solid var(--adm-border)',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--adm-text)',
          margin: 0,
        }}>
          Notas
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--adm-secondary)',
          marginTop: 4,
          margin: '8px 0 0',
        }}>
          Seu bloco de anotações pessoal
        </p>
      </div>

      <div style={{ padding: '24px 32px' }}>
        <NotesBlock />
      </div>
    </div>
  );
}
