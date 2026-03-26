import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { AIAnalysis } from './csv-analysis';

// ── Zenith colour palette ────────────────────────────────────────────────────
const C = {
  blue:       '#4040E8',
  dark:       '#0a0a0f',
  gray:       '#6b7280',
  grayLight:  '#9ca3af',
  grayBorder: '#e5e7eb',
  grayBg:     '#f9fafb',
  white:      '#ffffff',
  green:      '#16a34a',
  greenBg:    '#f0fdf4',
  greenBorder:'#86efac',
  orange:     '#ea580c',
  orangeBg:   '#fff7ed',
  text:       '#111827',
  textMuted:  '#374151',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function brl(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function num(v: number): string {
  return Math.round(v).toLocaleString('pt-BR');
}
function fdate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function periodLabel(type: string, days: number): string {
  if (type === 'weekly') return `Semanal — ${days} dias`;
  if (type === 'biweekly') return `Quinzenal — ${days} dias`;
  return `Mensal — ${days} dias`;
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── cover ──
  coverPage: {
    backgroundColor: C.dark,
    flexDirection: 'column',
  },
  coverAccent: {
    height: 6,
    backgroundColor: C.blue,
  },
  coverBody: {
    flex: 1,
    padding: 48,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverLogo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    letterSpacing: 4,
  },
  coverTag: {
    fontSize: 9,
    color: '#71717a',
    letterSpacing: 2,
    marginTop: 4,
  },
  coverMain: {
    marginTop: 80,
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1.2,
  },
  coverClient: {
    fontSize: 16,
    color: '#a1a1aa',
    marginTop: 10,
  },
  coverPeriod: {
    fontSize: 11,
    color: '#52525b',
    marginTop: 6,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
    paddingTop: 14,
  },
  coverFooterLeft: {
    fontSize: 8,
    color: '#3f3f46',
  },

  // ── content pages ──
  page: {
    padding: '36 40 48 40',
    backgroundColor: C.white,
    fontFamily: 'Helvetica',
    color: C.text,
    fontSize: 10,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.grayBorder,
  },
  pageHeaderBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    letterSpacing: 3,
  },
  pageHeaderClient: {
    fontSize: 7,
    color: C.grayLight,
    letterSpacing: 1,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: C.grayLight,
  },

  // ── section headers ──
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    letterSpacing: 2,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: C.grayBorder,
    marginVertical: 14,
  },

  // ── KPI cards ──
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.grayBg,
    borderRadius: 5,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 7,
    color: C.gray,
    letterSpacing: 1,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  kpiValueBlue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
  },
  kpiValueGreen: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
  },
  kpiSub: {
    fontSize: 7,
    color: C.grayLight,
    marginTop: 2,
  },

  // ── paragraphs ──
  para: {
    fontSize: 10,
    color: C.textMuted,
    lineHeight: 1.65,
    marginBottom: 6,
  },

  // ── bullet lists ──
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: 12,
    color: C.blue,
    lineHeight: 1.3,
    marginRight: 7,
    marginTop: -1,
  },
  bulletDotGreen: {
    fontSize: 12,
    color: C.green,
    lineHeight: 1.3,
    marginRight: 7,
    marginTop: -1,
  },
  bulletDotOrange: {
    fontSize: 12,
    color: C.orange,
    lineHeight: 1.3,
    marginRight: 7,
    marginTop: -1,
  },
  bulletText: {
    fontSize: 10,
    color: C.textMuted,
    lineHeight: 1.55,
    flex: 1,
  },

  // ── highlight boxes ──
  boxBlue: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
  },
  boxGreen: {
    backgroundColor: C.greenBg,
    borderLeftWidth: 3,
    borderLeftColor: C.green,
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
  },
  boxOrange: {
    backgroundColor: C.orangeBg,
    borderLeftWidth: 3,
    borderLeftColor: C.orange,
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
  },

  // ── campaign table ──
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.dark,
    borderRadius: 4,
    padding: '7 8',
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '7 8',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: '7 8',
    backgroundColor: C.grayBg,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  thCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    letterSpacing: 0.5,
  },
  tdCell: {
    fontSize: 9,
    color: C.textMuted,
  },
  tdCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  statusActive: {
    backgroundColor: C.greenBg,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  statusActiveText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
  },

  // ── numbered steps ──
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 0,
  },
  stepNumText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  stepText: {
    fontSize: 10,
    color: C.textMuted,
    lineHeight: 1.55,
    flex: 1,
    paddingTop: 3,
  },
});

// ── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ client, period }: { client: string; period: string }) {
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageHeaderBrand}>ZENITH COMPANY</Text>
      <Text style={s.pageHeaderClient}>{client.toUpperCase()} · {period.toUpperCase()}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function BulletList({ items, color = 'blue' }: { items: string[]; color?: 'blue' | 'green' | 'orange' }) {
  const dotStyle = color === 'green' ? s.bulletDotGreen : color === 'orange' ? s.bulletDotOrange : s.bulletDot;
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={dotStyle}>•</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((para, i) => (
        <Text key={i} style={s.para}>{para.trim()}</Text>
      ))}
    </>
  );
}

// ── Pages ────────────────────────────────────────────────────────────────────

interface Props {
  clientName: string;
  periodStart: string;
  periodEnd: string;
  numDays: number;
  periodType: string;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalConversions: number;
  monthlyProjection: number;
  daysInMonth: number;
  campaigns: Array<{
    name: string;
    status: string;
    objective?: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cpc: number;
    ctr?: number;
  }>;
  aiAnalysis: AIAnalysis | null;
}

function CoverPage({ clientName, periodStart, periodEnd, numDays, periodType, totalSpend }: Props) {
  const generatedOn = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverAccent} />
      <View style={s.coverBody}>
        {/* Brand */}
        <View>
          <Text style={s.coverLogo}>ZENITH COMPANY</Text>
          <Text style={s.coverTag}>GESTÃO DE TRÁFEGO PAGO · META ADS</Text>
        </View>

        {/* Main */}
        <View style={s.coverMain}>
          <Text style={s.coverTitle}>Relatório de{'\n'}Performance</Text>
          <Text style={s.coverClient}>{clientName}</Text>
          <Text style={s.coverPeriod}>
            {fdate(periodStart)} — {fdate(periodEnd)} · {periodLabel(periodType, numDays)}
          </Text>
          <Text style={[s.coverPeriod, { marginTop: 20, color: C.blue, fontFamily: 'Helvetica-Bold' }]}>
            {brl(totalSpend)} investidos no período
          </Text>
        </View>

        {/* Footer */}
        <View style={s.coverFooter}>
          <Text style={s.coverFooterLeft}>Gerado em {generatedOn} · Confidencial</Text>
        </View>
      </View>
    </Page>
  );
}

function SummaryPage({ clientName, periodStart, periodEnd, numDays, periodType,
  totalSpend, totalImpressions, totalReach, totalClicks, totalConversions,
  monthlyProjection, daysInMonth, aiAnalysis }: Props) {

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const period = `${fdate(periodStart)}–${fdate(periodEnd)}`;

  return (
    <Page size="A4" style={s.page}>
      <PageHeader client={clientName} period={period} />

      {/* Section: Executive Summary */}
      <Text style={s.sectionLabel}>01 — RESUMO EXECUTIVO</Text>
      <View style={s.boxBlue}>
        {aiAnalysis?.resumo_executivo ? (
          <Paragraph text={aiAnalysis.resumo_executivo} />
        ) : (
          <Text style={s.para}>
            Período de {numDays} dias ({fdate(periodStart)} a {fdate(periodEnd)}).
            Investimento total de {brl(totalSpend)} com projeção de {brl(monthlyProjection)} para o mês completo ({daysInMonth} dias).
          </Text>
        )}
      </View>

      <Divider />

      {/* Section: KPIs */}
      <Text style={s.sectionLabel}>02 — PRINCIPAIS MÉTRICAS</Text>

      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>INVESTIMENTO TOTAL</Text>
          <Text style={s.kpiValueBlue}>{brl(totalSpend)}</Text>
          <Text style={s.kpiSub}>{numDays} dias de dados</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>IMPRESSÕES</Text>
          <Text style={s.kpiValue}>{num(totalImpressions)}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>ALCANCE</Text>
          <Text style={s.kpiValue}>{num(totalReach)}</Text>
        </View>
      </View>

      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>CLIQUES</Text>
          <Text style={s.kpiValueGreen}>{num(totalClicks)}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>CONVERSÕES</Text>
          <Text style={s.kpiValueGreen}>{num(totalConversions)}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>PROJEÇÃO MENSAL</Text>
          <Text style={s.kpiValueBlue}>{brl(monthlyProjection)}</Text>
          <Text style={s.kpiSub}>{daysInMonth} dias</Text>
        </View>
      </View>

      <View style={s.kpiRow}>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>CTR MÉDIO</Text>
          <Text style={s.kpiValue}>{ctr.toFixed(2)}%</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>CPC MÉDIO</Text>
          <Text style={s.kpiValue}>{brl(cpc)}</Text>
        </View>
        <View style={s.kpiCard}>
          <Text style={s.kpiLabel}>CPM MÉDIO</Text>
          <Text style={s.kpiValue}>{brl(cpm)}</Text>
        </View>
      </View>

      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

function AnalysisPage({ clientName, periodStart, periodEnd, aiAnalysis }: Props) {
  const period = `${fdate(periodStart)}–${fdate(periodEnd)}`;

  return (
    <Page size="A4" style={s.page}>
      <PageHeader client={clientName} period={period} />

      {/* Highlights */}
      <Text style={s.sectionLabel}>03 — DESTAQUES DE PERFORMANCE</Text>
      {aiAnalysis?.destaques_performance?.length ? (
        <View style={s.boxGreen}>
          <BulletList items={aiAnalysis.destaques_performance} color="green" />
        </View>
      ) : (
        <View style={s.boxGreen}>
          <Text style={s.para}>Análise de destaques não disponível para este período.</Text>
        </View>
      )}

      <Divider />

      {/* Attention points */}
      <Text style={s.sectionLabel}>04 — PONTOS DE ATENÇÃO</Text>
      {aiAnalysis?.pontos_atencao?.length ? (
        <View style={s.boxOrange}>
          <BulletList items={aiAnalysis.pontos_atencao} color="orange" />
        </View>
      ) : (
        <View style={s.boxOrange}>
          <Text style={s.para}>Nenhum ponto crítico identificado neste período.</Text>
        </View>
      )}

      <Divider />

      {/* Strategic reading */}
      <Text style={s.sectionLabel}>05 — LEITURA ESTRATÉGICA</Text>
      <View style={s.boxBlue}>
        {aiAnalysis?.leitura_estrategica ? (
          <Paragraph text={aiAnalysis.leitura_estrategica} />
        ) : (
          <Text style={s.para}>Leitura estratégica não disponível para este período.</Text>
        )}
      </View>

      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

function CampaignsPage({ clientName, periodStart, periodEnd, campaigns, aiAnalysis }: Props) {
  const period = `${fdate(periodStart)}–${fdate(periodEnd)}`;
  const activeCamps = campaigns.filter(c => c.status === 'ACTIVE').slice(0, 8);
  const topCamps = [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 8);
  const displayCamps = activeCamps.length > 0 ? activeCamps : topCamps;

  // col widths (must sum to ~100%)
  const W = { name: '36%', obj: '20%', spend: '16%', results: '12%', cpc: '16%' };

  return (
    <Page size="A4" style={s.page}>
      <PageHeader client={clientName} period={period} />

      {/* Campaigns table */}
      <Text style={s.sectionLabel}>06 — CAMPANHAS {activeCamps.length > 0 ? 'ATIVAS' : '(TOP POR INVESTIMENTO)'}</Text>

      {displayCamps.length === 0 ? (
        <Text style={s.para}>Nenhuma campanha encontrada para este período.</Text>
      ) : (
        <View>
          <View style={s.tableHead}>
            <Text style={[s.thCell, { width: W.name }]}>CAMPANHA</Text>
            <Text style={[s.thCell, { width: W.obj }]}>OBJETIVO</Text>
            <Text style={[s.thCell, { width: W.spend }]}>INVESTIDO</Text>
            <Text style={[s.thCell, { width: W.results }]}>RESULT.</Text>
            <Text style={[s.thCell, { width: W.cpc }]}>CPC</Text>
          </View>
          {displayCamps.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.tdCellBold, { width: W.name }]}>{c.name.length > 30 ? c.name.slice(0, 28) + '…' : c.name}</Text>
              <Text style={[s.tdCell, { width: W.obj }]}>{(c.objective ?? '—').slice(0, 20)}</Text>
              <Text style={[s.tdCell, { width: W.spend }]}>{brl(c.spend)}</Text>
              <Text style={[s.tdCell, { width: W.results }]}>{num(c.conversions)}</Text>
              <Text style={[s.tdCell, { width: W.cpc }]}>{c.cpc > 0 ? brl(c.cpc) : '—'}</Text>
            </View>
          ))}
        </View>
      )}

      <Divider />

      {/* Next steps */}
      <Text style={s.sectionLabel}>07 — PRÓXIMOS PASSOS</Text>
      {aiAnalysis?.proximos_passos?.length ? (
        <View>
          {aiAnalysis.proximos_passos.map((step: string, i: number) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : (
        <BulletList
          items={[
            'Revisar campanhas com menor CTR e testar novos criativos.',
            'Analisar segmentações e expandir público de maior conversão.',
            'Monitorar CPM e ajustar lances conforme meta de CPA.',
          ]}
        />
      )}

      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    </Page>
  );
}

// ── Main document export ─────────────────────────────────────────────────────

export function ZenithReportPDF(props: Props) {
  return (
    <Document
      title={`Relatório Zenith — ${props.clientName}`}
      author="Zenith Company"
      creator="Zenith Portal"
    >
      <CoverPage {...props} />
      <SummaryPage {...props} />
      <AnalysisPage {...props} />
      <CampaignsPage {...props} />
    </Document>
  );
}
