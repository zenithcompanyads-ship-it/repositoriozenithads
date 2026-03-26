import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function formatPeriod(start: string, end: string) {
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)} → ${fmt(end)}`;
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function periodTypeLabel(numDays: number) {
  if (numDays <= 7) return 'Semanal';
  if (numDays <= 16) return 'Quinzenal';
  return 'Mensal';
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
    .from('clients').select('name, initials, color, avatar_url').eq('id', userData.client_id).single();

  const avatarLetter = client?.initials ?? client?.name?.charAt(0).toUpperCase() ?? 'C';
  const avatarColor = client?.color ?? '#9FE870';
  const clientName = client?.name ?? 'Cliente';

  const latest = reports?.[0] ?? null;
  const older = reports?.slice(1) ?? [];

  const getContent = (r: typeof latest) => r?.content_json as Record<string, unknown> | null;
  const getNumDays = (r: typeof latest) => Number(getContent(r)?.numDays ?? 30);

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ZENITH — {clientName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#090D06; color:#D2D6DB; font-family:'DM Sans',sans-serif; min-height:100vh; }
          .page { display:flex; flex-direction:column; align-items:center; padding:56px 24px 80px; min-height:100vh; }

          /* BRAND */
          .brand { text-align:center; margin-bottom:48px; }
          .brand-tag { font-size:10px; letter-spacing:3px; color:#9FE870; text-transform:uppercase; }
          .brand h1 { font-family:'Cormorant Garamond',serif; font-size:36px; font-weight:300; color:#EEEEE8; letter-spacing:4px; }

          /* CLIENT */
          .client-block { text-align:center; margin-bottom:56px; }
          .avatar { width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:22px; color:#090D06; margin:0 auto 12px; }
          .client-name { font-size:20px; font-weight:500; color:#EEEEE8; }
          .client-sub { font-size:12px; color:#6E7A5E; margin-top:4px; }

          /* CURRENT REPORT (featured) */
          .current-section { width:100%; max-width:720px; margin-bottom:48px; }
          .current-label { font-size:10px; letter-spacing:3px; color:#9FE870; text-transform:uppercase; margin-bottom:20px; }
          .current-card { background:rgba(159,232,112,0.05); border:1.5px solid rgba(159,232,112,0.25); border-radius:20px; padding:32px 36px; }
          .current-card:hover { border-color:rgba(159,232,112,0.5); background:rgba(159,232,112,0.07); }
          .current-meta { display:flex; align-items:center; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
          .badge-status { font-size:10px; font-weight:700; letter-spacing:1px; color:#090D06; background:#9FE870; border-radius:20px; padding:4px 12px; text-transform:uppercase; }
          .badge-type { font-size:10px; letter-spacing:1px; color:#9FE870; border:1px solid rgba(159,232,112,0.3); border-radius:20px; padding:4px 12px; }
          .current-month { font-family:'Cormorant Garamond',serif; font-size:36px; font-weight:300; color:#EEEEE8; text-transform:capitalize; margin-bottom:6px; }
          .current-period { font-size:13px; color:#6E7A5E; margin-bottom:24px; }
          .current-bottom { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; }
          .current-spend { font-family:'Cormorant Garamond',serif; font-size:28px; color:#9FE870; }
          .current-spend span { font-family:'DM Sans',sans-serif; font-size:11px; color:#6E7A5E; display:block; }
          .btn-ver { display:inline-flex; align-items:center; gap:8px; background:#9FE870; color:#090D06; font-size:14px; font-weight:600; padding:12px 28px; border-radius:12px; text-decoration:none; transition:opacity .2s,transform .1s; }
          .btn-ver:hover { opacity:.9; transform:translateY(-1px); }

          /* OLDER REPORTS */
          .older-section { width:100%; max-width:720px; }
          .older-label { font-size:10px; letter-spacing:3px; color:#6E7A5E; text-transform:uppercase; margin-bottom:16px; }
          .older-list { display:flex; flex-direction:column; gap:8px; }
          .older-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; text-decoration:none; transition:all .15s; }
          .older-card:hover { border-color:rgba(159,232,112,0.2); background:rgba(159,232,112,0.02); }
          .older-month { font-family:'Cormorant Garamond',serif; font-size:20px; color:#EEEEE8; text-transform:capitalize; }
          .older-period { font-size:11px; color:#6E7A5E; margin-top:2px; }
          .older-right { display:flex; align-items:center; gap:12px; }
          .older-spend { font-family:'Cormorant Garamond',serif; font-size:18px; color:#6E7A5E; }
          .older-arrow { font-size:16px; color:#6E7A5E; }

          /* EMPTY */
          .empty { text-align:center; color:#6E7A5E; padding:80px 0; }
          .empty p { font-size:14px; line-height:1.8; }
        `}</style>
      </head>
      <body>
        <div className="page">

          <div className="brand">
            <div className="brand-tag">Digital Marketing</div>
            <h1>ZENITH</h1>
          </div>

          <div className="client-block">
            {client?.avatar_url ? (
              <img src={client.avatar_url} alt={clientName} style={{ width:60,height:60,borderRadius:'50%',objectFit:'cover',margin:'0 auto 12px',display:'block' }} />
            ) : (
              <div className="avatar" style={{ background: avatarColor }}>{avatarLetter}</div>
            )}
            <div className="client-name">{clientName}</div>
            <div className="client-sub">Portal de Resultados</div>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="empty">
              <p>Seu relatório será preparado em breve.</p>
              <p>A equipe Zenith está trabalhando nisso.</p>
            </div>
          ) : (
            <>
              {/* RELATÓRIO ATUAL */}
              <div className="current-section">
                <div className="current-label">Relatório Atual</div>
                <a href={`/api/reports/html/${latest!.id}`} className="current-card" style={{ display:'block', textDecoration:'none' }}>
                  <div className="current-meta">
                    <span className="badge-status">Publicado</span>
                    <span className="badge-type">{periodTypeLabel(getNumDays(latest))}</span>
                  </div>
                  <div className="current-month">{monthLabel(latest!.period_start)}</div>
                  <div className="current-period">{formatPeriod(latest!.period_start, latest!.period_end)}</div>
                  <div className="current-bottom">
                    {Number(getContent(latest)?.totalSpend ?? 0) > 0 && (
                      <div className="current-spend">
                        {brl(Number(getContent(latest)?.totalSpend ?? 0))}
                        <span>investimento no período</span>
                      </div>
                    )}
                    <span className="btn-ver">Ver relatório →</span>
                  </div>
                </a>
              </div>

              {/* RELATÓRIOS ANTERIORES */}
              {older.length > 0 && (
                <div className="older-section">
                  <div className="older-label">Relatórios Anteriores</div>
                  <div className="older-list">
                    {older.map((r) => {
                      const content = r.content_json as Record<string, unknown> | null;
                      const totalSpend = Number(content?.totalSpend ?? 0);
                      const numDays = Number(content?.numDays ?? 30);
                      return (
                        <a key={r.id} className="older-card" href={`/api/reports/html/${r.id}`}>
                          <div>
                            <div className="older-month">{monthLabel(r.period_start)}</div>
                            <div className="older-period">{formatPeriod(r.period_start, r.period_end)} · {periodTypeLabel(numDays)}</div>
                          </div>
                          <div className="older-right">
                            {totalSpend > 0 && <div className="older-spend">{brl(totalSpend)}</div>}
                            <div className="older-arrow">→</div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </body>
    </html>
  );
}
