import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import Link from 'next/link';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, LayoutGrid, List } from 'lucide-react';
import type { Client, Metric } from '@/types';

async function getDashboardData() {
  const supabase = await createClient();

  const today = new Date();
  const since = new Date(today); since.setDate(today.getDate() - 30);
  const prevSince = new Date(today); prevSince.setDate(today.getDate() - 60);
  const prevUntil = new Date(today); prevUntil.setDate(today.getDate() - 31);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const [
    { data: clients },
    { data: metrics },
    { data: prevMetrics },
    { data: alerts },
    { data: publishedCsvReports },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('metrics').select('*').gte('date', fmt(since)).lte('date', fmt(today)),
    supabase.from('metrics').select('spend,impressions,clicks,conversions').gte('date', fmt(prevSince)).lte('date', fmt(prevUntil)),
    supabase.from('alerts').select('*').eq('resolved', false).limit(5),
    supabase.from('reports').select('client_id').eq('type', 'csv_analysis').eq('visible_to_client', true),
  ]);

  return {
    clients: clients ?? [],
    metrics: metrics ?? [],
    prevMetrics: prevMetrics ?? [],
    alerts: alerts ?? [],
    publishedCsvReports: publishedCsvReports ?? [],
  };
}

function trendPct(current: number, previous: number) {
  if (previous === 0) return { pct: '—', up: true, neutral: true };
  const delta = ((current - previous) / previous) * 100;
  return { pct: `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`, up: delta >= 0, neutral: false };
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === 'list' ? 'list' : 'grid';
  const { clients, metrics, prevMetrics, alerts, publishedCsvReports } = await getDashboardData();

  const totalSpend       = metrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const totalClicks      = metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalConversions = metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  const prevSpend       = prevMetrics.reduce((s, m) => s + (m.spend ?? 0), 0);
  const prevImpressions = prevMetrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
  const prevClicks      = prevMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const prevConversions = prevMetrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  const metricsByClient = metrics.reduce<Record<string, Metric[]>>((acc, m) => {
    if (!acc[m.client_id]) acc[m.client_id] = [];
    acc[m.client_id].push(m);
    return acc;
  }, {});

  const clientRows = (clients as Client[]).map((client) => {
    const cms = metricsByClient[client.id] ?? [];
    const spend       = cms.reduce((s, m) => s + (m.spend ?? 0), 0);
    const impressions = cms.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const conversions = cms.reduce((s, m) => s + (m.conversions ?? 0), 0);
    const avgCtr  = cms.length ? cms.reduce((s, m) => s + (m.ctr ?? 0), 0) / cms.length : 0;
    const avgRoas = cms.length ? cms.reduce((s, m) => s + (m.roas ?? 0), 0) / cms.length : 0;
    return { ...client, spend, impressions, conversions, avgCtr, avgRoas };
  }).sort((a, b) => b.spend - a.spend);

  const clientsWithCsv = new Set(publishedCsvReports.map((r: { client_id: string }) => r.client_id));
  const pendingClients = (clients as Client[]).filter(c => !clientsWithCsv.has(c.id));

  const kpis = [
    { label: 'Impressões Totais', value: formatNumber(totalImpressions), trend: trendPct(totalImpressions, prevImpressions), color: '#C9A84C', border: '#C9A84C' },
    { label: 'Cliques Totais',    value: formatNumber(totalClicks),      trend: trendPct(totalClicks, prevClicks),           color: '#93B4FF', border: '#3B6FE8' },
    { label: 'Resultados',        value: formatNumber(totalConversions),  trend: trendPct(totalConversions, prevConversions), color: '#86EFBD', border: '#22C87A' },
    { label: 'Investimento Total',value: formatCurrency(totalSpend),      trend: trendPct(totalSpend, prevSpend),            color: '#FFA07A', border: '#F2703D' },
  ];

  const maxSpend = clientRows[0]?.spend ?? 1;

  return (
    <div style={{ background: 'var(--adm-bg)', minHeight: '100vh', padding: '36px 40px', fontFamily: "'DM Sans', sans-serif" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--adm-accent)', marginBottom: 6 }}>
          Zenith · Painel de Gestão
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 700, color: 'var(--adm-text)', margin: 0, lineHeight: 1.2 }}>
          Dashboard <em style={{ color: 'var(--adm-accent)', fontStyle: 'italic' }}>Geral.</em>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--adm-secondary)', marginTop: 6, marginBottom: 0 }}>
          Resumo consolidado de todos os clientes — últimos 30 dias
        </p>
        <div style={{ width: 40, height: 2, background: 'var(--adm-accent)', borderRadius: 2, marginTop: 12, marginBottom: 32, opacity: 0.6 }} />

        {/* Alerts */}
        {alerts.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(242,112,61,0.08)', border: '1px solid rgba(242,112,61,0.25)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          }}>
            <AlertTriangle size={15} style={{ color: '#F2703D', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#F2703D', fontWeight: 500 }}>
              {alerts.length} alerta{alerts.length > 1 ? 's' : ''} ativo{alerts.length > 1 ? 's' : ''} — verifique as métricas dos clientes
            </span>
          </div>
        )}
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
        {kpis.map(({ label, value, trend, color, border }) => (
          <div key={label} style={{
            background: 'var(--adm-card)',
            border: '1px solid var(--adm-border)',
            borderTop: `2px solid ${border}`,
            borderRadius: 12,
            padding: '20px 22px',
          }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--adm-secondary)' }}>
              {label}
            </div>
            {!trend.neutral && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                {trend.up
                  ? <TrendingUp size={11} style={{ color: '#22C87A' }} />
                  : <TrendingDown size={11} style={{ color: '#F2703D' }} />}
                <span style={{ fontSize: 11, fontWeight: 600, color: trend.up ? '#22C87A' : '#F2703D' }}>
                  {trend.pct} vs mês anterior
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PENDING REPORTS */}
      {pendingClients.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={14} style={{ color: 'var(--adm-accent)' }} />
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, color: 'var(--adm-text)', fontWeight: 600 }}>
              Relatórios Pendentes
            </span>
            <span style={{
              background: 'var(--adm-accent-subtle)', color: 'var(--adm-accent)', border: '1px solid var(--adm-accent-subtle-border)',
              borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 8px',
            }}>
              {pendingClients.length}
            </span>
          </div>
          <div style={{ background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 12, overflow: 'hidden' }}>
            {pendingClients.map((client, i) => (
              <div key={client.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', gap: 12,
                borderTop: i > 0 ? '1px solid var(--adm-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: client.color ?? 'var(--adm-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {client.initials ?? client.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--adm-body)', fontWeight: 500 }}>{client.name}</span>
                </div>
                <Link href={`/admin/clients/${client.id}?tab=csv`} style={{
                  fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                  background: 'var(--adm-accent-subtle)', color: 'var(--adm-accent)',
                  border: '1px solid var(--adm-accent-subtle-border)', textDecoration: 'none',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Subir CSV
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENTS HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--adm-secondary)' }}>
          Visão por Cliente
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 8, overflow: 'hidden' }}>
            <Link
              href="/admin/dashboard?view=grid"
              title="Visualização em cards"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, textDecoration: 'none',
                background: view === 'grid' ? 'var(--adm-accent)' : 'transparent',
                color: view === 'grid' ? '#fff' : 'var(--adm-muted)',
                transition: 'background 0.15s',
              }}
            >
              <LayoutGrid size={14} />
            </Link>
            <Link
              href="/admin/dashboard?view=list"
              title="Visualização em lista"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, textDecoration: 'none',
                background: view === 'list' ? 'var(--adm-accent)' : 'transparent',
                color: view === 'list' ? '#fff' : 'var(--adm-muted)',
                borderLeft: '1px solid var(--adm-border)',
                transition: 'background 0.15s',
              }}
            >
              <List size={14} />
            </Link>
          </div>
          <Link href="/admin/clients" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--adm-accent)', textDecoration: 'none', fontWeight: 500,
          }}>
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {clientRows.length === 0 ? (
        <div style={{ background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--adm-secondary)', fontSize: 14, marginBottom: 16 }}>Nenhum cliente cadastrado ainda.</p>
          <Link href="/admin/clients/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--adm-accent)', color: 'var(--adm-accent-on)', fontSize: 13, fontWeight: 600,
            padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
          }}>
            Cadastrar primeiro cliente
          </Link>
        </div>

      ) : view === 'list' ? (
        /* ── LIST VIEW ── */
        <div style={{ background: 'var(--adm-card)', border: '1px solid var(--adm-border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 110px 80px 120px 80px 80px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--adm-border)',
            background: 'var(--adm-surface)',
          }}>
            {['Cliente', 'Status', 'Impressões', 'CTR', 'Investido', 'ROAS', ''].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-muted)' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {clientRows.map((client, i) => {
            const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
            const avatarColor = client.color ?? '#C9A84C';
            return (
              <div
                key={client.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 110px 80px 120px 80px 80px',
                  padding: '13px 20px',
                  alignItems: 'center',
                  borderTop: i > 0 ? '1px solid var(--adm-border)' : 'none',
                  transition: 'background 0.12s',
                }}
              >
                {/* Client */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
                    border: `1.5px solid ${avatarColor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 1 }}>
                      {client.segment ?? 'Sem segmento'}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                    padding: '3px 8px', borderRadius: 999,
                    background: client.active ? 'rgba(34,200,122,0.12)' : 'rgba(242,112,61,0.12)',
                    color: client.active ? '#22C87A' : '#F2703D',
                    border: `1px solid ${client.active ? 'rgba(34,200,122,0.3)' : 'rgba(242,112,61,0.3)'}`,
                  }}>
                    {client.active ? 'Ativo' : 'Pausado'}
                  </span>
                </div>

                {/* Impressões */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-body)' }}>
                  {formatNumber(client.impressions)}
                </div>

                {/* CTR */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-body)' }}>
                  {formatPercent(client.avgCtr)}
                </div>

                {/* Investido */}
                <div style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>
                  {formatCurrency(client.spend)}
                </div>

                {/* ROAS */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-accent)' }}>
                  {client.avgRoas.toFixed(1)}x
                </div>

                {/* Action */}
                <div>
                  <Link
                    href={`/admin/clients/${client.id}`}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 7,
                      background: 'var(--adm-accent-subtle)', color: 'var(--adm-accent)',
                      border: '1px solid var(--adm-accent-subtle-border)',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        /* ── GRID VIEW ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {clientRows.map((client) => {
            const spendBarPct = maxSpend > 0 ? Math.round((client.spend / maxSpend) * 100) : 0;
            const initials = client.initials ?? client.name?.slice(0, 2).toUpperCase();
            const avatarColor = client.color ?? '#C9A84C';

            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                <div className="dark-card">
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
                      border: `1.5px solid ${avatarColor}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--adm-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 2 }}>{client.segment ?? 'Sem segmento'}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      padding: '3px 8px', borderRadius: 999, flexShrink: 0,
                      background: client.active ? 'rgba(34,200,122,0.12)' : 'rgba(242,112,61,0.12)',
                      color: client.active ? '#22C87A' : '#F2703D',
                      border: `1px solid ${client.active ? 'rgba(34,200,122,0.3)' : 'rgba(242,112,61,0.3)'}`,
                    }}>
                      {client.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', borderTop: '1px solid var(--adm-border)', borderBottom: '1px solid var(--adm-border)' }}>
                    {[
                      { label: 'Impressões', value: formatNumber(client.impressions) },
                      { label: 'CTR',        value: formatPercent(client.avgCtr) },
                      { label: 'Investido',  value: formatCurrency(client.spend) },
                    ].map((m, i) => (
                      <div key={m.label} style={{
                        flex: 1, padding: '10px 0', textAlign: 'center',
                        borderRight: i < 2 ? '1px solid var(--adm-border)' : 'none',
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--adm-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-body)' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 6 }}>
                      <span style={{ color: 'var(--adm-muted)' }}>
                        {client.since_date
                          ? 'Desde ' + new Date(client.since_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                          : client.conversions + ' resultados'}
                      </span>
                      <span style={{ color: 'var(--adm-accent)', fontWeight: 600 }}>ROAS {client.avgRoas.toFixed(1)}x</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--adm-border)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--adm-accent), var(--adm-accent-light))', width: `${spendBarPct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
