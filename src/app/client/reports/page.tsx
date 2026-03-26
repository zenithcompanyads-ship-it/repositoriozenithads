import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

function formatPeriod(start: string, end: string) {
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} → ${fmt(end)}`;
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default async function ClientReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users').select('client_id').eq('id', user.id).single();
  if (!userData?.client_id) redirect('/client/dashboard');

  const { data: reports } = await supabase
    .from('reports')
    .select('id, period_start, period_end, created_at, content_json')
    .eq('client_id', userData.client_id)
    .eq('type', 'csv_analysis')
    .eq('visible_to_client', true)
    .order('period_start', { ascending: false });

  const { data: client } = await supabase
    .from('clients').select('name, initials, color').eq('id', userData.client_id).single();

  const avatarLetter = client?.initials ?? client?.name?.charAt(0).toUpperCase() ?? 'C';

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ZENITH — Relatórios</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#090D06; color:#D2D6DB; font-family:'DM Sans',sans-serif; min-height:100vh; }
          .page { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding:60px 24px; min-height:100vh; }
          .logo { text-align:center; margin-bottom:48px; }
          .logo .brand-tag { font-size:10px; letter-spacing:3px; color:#9FE870; text-transform:uppercase; }
          .logo h1 { font-family:'Cormorant Garamond',serif; font-size:40px; font-weight:300; color:#EEEEE8; letter-spacing:4px; }
          .avatar { width:56px; height:56px; border-radius:50%; background:#9FE870; color:#090D06; font-weight:700; font-size:22px; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; }
          .client-name { font-size:18px; font-weight:500; color:#EEEEE8; text-align:center; }
          .client-sub { font-size:12px; color:#6E7A5E; text-align:center; margin-bottom:48px; }
          .section-title { font-family:'Cormorant Garamond',serif; font-size:22px; color:#EEEEE8; margin-bottom:24px; text-align:center; letter-spacing:1px; }
          .reports-grid { width:100%; max-width:760px; display:flex; flex-direction:column; gap:12px; }
          .report-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:24px 28px; display:flex; align-items:center; justify-content:space-between; text-decoration:none; transition:all .2s; cursor:pointer; }
          .report-card:hover { border-color:rgba(159,232,112,0.4); background:rgba(159,232,112,0.04); transform:translateY(-1px); }
          .report-info {}
          .report-month { font-family:'Cormorant Garamond',serif; font-size:22px; color:#EEEEE8; font-weight:400; text-transform:capitalize; }
          .report-period { font-size:12px; color:#6E7A5E; margin-top:4px; }
          .report-meta { display:flex; align-items:center; gap:16px; }
          .report-invest { font-family:'Cormorant Garamond',serif; font-size:20px; color:#9FE870; }
          .report-arrow { font-size:20px; color:#9FE870; margin-left:8px; }
          .empty { text-align:center; color:#6E7A5E; padding:60px 0; }
          .empty p { font-size:14px; margin-top:8px; }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="logo">
            <div className="brand-tag">Digital Marketing</div>
            <h1>ZENITH</h1>
          </div>

          <div className="avatar">{avatarLetter}</div>
          <div className="client-name">{client?.name ?? 'Cliente'}</div>
          <div className="client-sub">Portal de Resultados</div>

          <div className="section-title">Seus Relatórios</div>

          <div className="reports-grid">
            {!reports || reports.length === 0 ? (
              <div className="empty">
                <p>Nenhum relatório disponível ainda.</p>
                <p>Sua equipe Zenith publicará em breve.</p>
              </div>
            ) : (
              reports.map((r) => {
                const content = r.content_json as Record<string, unknown> | null;
                const totalSpend = Number(content?.totalSpend ?? 0);
                return (
                  <a key={r.id} className="report-card" href={`/api/reports/html/${r.id}`}>
                    <div className="report-info">
                      <div className="report-month">{monthLabel(r.period_start)}</div>
                      <div className="report-period">{formatPeriod(r.period_start, r.period_end)}</div>
                    </div>
                    <div className="report-meta">
                      {totalSpend > 0 && <div className="report-invest">{brl(totalSpend)}</div>}
                      <div className="report-arrow">→</div>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
