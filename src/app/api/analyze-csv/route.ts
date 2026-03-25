import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateCSVReport, monthlyBreakdown } from '@/lib/report-generator';
import { normalizeCampaignStatus } from '@/lib/utils';
import { generateCSVAnalysis } from '@/lib/csv-analysis';

export const maxDuration = 60;

interface CSVRow {
  [key: string]: string | number;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v ?? '').replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function getCol(row: CSVRow, ...keys: string[]): unknown {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase() === k.toLowerCase()
    );
    if (found !== undefined) return row[found];
  }
  return undefined;
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T12:00:00Z');
  const last = new Date(end + 'T12:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { rows, clientId, clientName } = (await req.json()) as {
    rows: CSVRow[];
    clientId: string;
    clientName: string;
  };

  if (!rows?.length)
    return NextResponse.json({ error: 'Nenhum dado encontrado no CSV.' }, { status: 400 });

  const adminClient = createAdminClient();

  // ── 1. Period dates ───────────────────────────────────────────────────────────
  const firstRow = rows[0];
  const today = new Date().toISOString().split('T')[0];

  // Try metadata columns first (Meta BR: "Início dos relatórios" / "Término dos relatórios")
  let periodStart = String(
    getCol(firstRow, 'Início dos relatórios', 'inicio_dos_relatorios', 'period_start', 'Start date', 'Date start') ?? ''
  ).trim();
  let periodEnd = String(
    getCol(firstRow, 'Término dos relatórios', 'termino_dos_relatorios', 'period_end', 'End date', 'Date stop') ?? ''
  ).trim();

  // Fallback: derive period from per-row date columns (breakdown exports have "Dia" / "Day")
  if (!periodStart || !periodEnd) {
    const rowDates: string[] = [];
    for (const row of rows) {
      const d = String(getCol(row, 'Dia', 'Day', 'Date', 'Data') ?? '').trim();
      // Accept YYYY-MM-DD or DD/MM/YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        rowDates.push(d);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
        const [dd, mm, yyyy] = d.split('/');
        rowDates.push(`${yyyy}-${mm}-${dd}`);
      }
    }
    if (rowDates.length > 0) {
      rowDates.sort();
      periodStart = periodStart || rowDates[0];
      periodEnd   = periodEnd   || rowDates[rowDates.length - 1];
    }
  }

  // Normalize DD/MM/YYYY → YYYY-MM-DD if needed
  const normDate = (d: string): string => {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return d || today;
  };
  periodStart = normDate(periodStart) || today;
  periodEnd   = normDate(periodEnd)   || today;
  // Ensure start <= end
  if (periodStart > periodEnd) [periodStart, periodEnd] = [periodEnd, periodStart];

  // ── 2. Aggregate per-campaign (rows may repeat for same campaign in breakdown exports) ──
  let totalSpend = 0, totalImpressions = 0, totalReach = 0,
    totalConversions = 0, totalClicks = 0;

  // First pass: aggregate all rows by campaign name
  const campaignMap = new Map<string, {
    name: string; status: string; objective: string | null;
    spend: number; impressions: number; clicks: number;
    conversions: number; reach: number; budget: number;
    cpmSum: number; cpmCount: number; ctrSum: number; ctrCount: number;
  }>();

  for (const row of rows) {
    const name = String(
      getCol(row, 'Nome da campanha', 'Campaign Name', 'Campaign name', 'name') ?? 'Campanha'
    ).trim() || 'Campanha';
    const statusRaw = String(
      getCol(row, 'Veiculação da campanha', 'Status', 'Delivery', 'Campaign delivery') ?? ''
    );
    const status = normalizeCampaignStatus(statusRaw);
    const objective = String(
      getCol(row, 'Objetivo da campanha', 'Campaign objective', 'Objective', 'objetivo') ?? ''
    ).trim() || null;

    const spendCol = toNum(getCol(row, 'Valor usado (BRL)', 'Valor usado', 'Amount spent (BRL)', 'Amount spent', 'Spend'));
    const results  = toNum(getCol(row, 'Resultados', 'Results', 'Conversions'));
    const cprValue = toNum(getCol(row, 'Custo por resultados', 'Cost per result', 'CPC'));
    const spend    = spendCol > 0 ? spendCol : (results > 0 && cprValue > 0 ? results * cprValue : 0);
    const impressions = toNum(getCol(row, 'Impressões', 'Impressions'));
    const reach       = toNum(getCol(row, 'Alcance', 'Reach'));
    const clicks      = toNum(getCol(row, 'Cliques', 'Clicks', 'Link clicks'));
    const budgetRaw   = getCol(row, 'Orçamento do conjunto de anúncios', 'Orçamento', 'Budget');
    const budget      = typeof budgetRaw === 'number' ? budgetRaw : toNum(budgetRaw);
    const cpmRaw      = toNum(getCol(row, 'CPM', 'Cost per 1,000 impressions', 'CPM (Cost per 1,000 impressions)'));
    const ctrRaw      = toNum(getCol(row, 'CTR', 'CTR (link click-through rate)', 'Taxa de cliques no link'));

    if (campaignMap.has(name)) {
      const c = campaignMap.get(name)!;
      c.spend       += spend;
      c.impressions += impressions;
      c.reach       += reach;
      c.clicks      += clicks;
      c.conversions += results;
      c.budget      += budget;
      // Keep ACTIVE if any row says active (most permissive)
      if (status === 'ACTIVE') c.status = 'ACTIVE';
      if (!c.objective && objective) c.objective = objective;
      if (cpmRaw > 0) { c.cpmSum += cpmRaw; c.cpmCount++; }
      if (ctrRaw > 0) { c.ctrSum += ctrRaw; c.ctrCount++; }
    } else {
      campaignMap.set(name, {
        name, status, objective, spend, impressions, clicks,
        conversions: results, reach, budget,
        cpmSum: cpmRaw > 0 ? cpmRaw : 0, cpmCount: cpmRaw > 0 ? 1 : 0,
        ctrSum: ctrRaw > 0 ? ctrRaw : 0, ctrCount: ctrRaw > 0 ? 1 : 0,
      });
    }
  }

  const campaignData = Array.from(campaignMap.values()).map((c) => {
    const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
    const cpm = c.cpmCount > 0 ? c.cpmSum / c.cpmCount
      : (c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0);
    const ctr = c.ctrCount > 0 ? c.ctrSum / c.ctrCount
      : (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0);
    totalSpend       += c.spend;
    totalImpressions += c.impressions;
    totalReach       += c.reach;
    totalConversions += c.conversions;
    totalClicks      += c.clicks;
    return { name: c.name, status: c.status, objective: c.objective, spend: c.spend,
      impressions: c.impressions, clicks: c.clicks, conversions: c.conversions,
      cpc, cpm, ctr, budget: c.budget, reach: c.reach };
  });

  // Estimate clicks if missing
  if (totalClicks === 0 && totalImpressions > 0) {
    totalClicks = Math.round(totalImpressions * 0.03);
  }

  // ── 3. Upsert campaigns ───────────────────────────────────────────────────────
  for (const camp of campaignData) {
    const { data: existing } = await adminClient
      .from('campaigns').select('id')
      .eq('client_id', clientId).eq('name', camp.name).single();

    if (existing) {
      await adminClient.from('campaigns').update({
        status: camp.status,
        objective: camp.objective,
        spend: camp.spend,
        impressions: camp.impressions,
        clicks: camp.clicks,
        conversions: camp.conversions,
        cpc: camp.cpc,
        budget: camp.budget,
        reach: camp.reach,
      }).eq('id', existing.id);
    } else {
      const { objective, cpm: _cpm, ctr: _ctr, ...rest } = camp;
      await adminClient.from('campaigns').insert({
        client_id: clientId,
        objective,
        ...rest,
      });
    }
  }

  // ── 4. Upsert daily metrics (evenly distributed) ──────────────────────────────
  const days    = datesBetween(periodStart, periodEnd);
  const numDays = Math.max(days.length, 1);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const metricRows = days.map((date) => ({
    client_id:    clientId,
    date,
    spend:        Math.round((totalSpend / numDays) * 100) / 100,
    impressions:  Math.round(totalImpressions / numDays),
    clicks:       Math.round(totalClicks / numDays),
    ctr:          Math.round(ctr * 10000) / 10000,
    cpc:          Math.round(cpc * 10000) / 10000,
    cpm:          Math.round(cpm * 10000) / 10000,
    roas:         0,
    reach:        Math.round(totalReach / numDays),
    conversions:  Math.round(totalConversions / numDays),
  }));

  for (let i = 0; i < metricRows.length; i += 20) {
    await adminClient.from('metrics')
      .upsert(metricRows.slice(i, i + 20), { onConflict: 'client_id,date' });
  }

  // ── 5. Budget projection ──────────────────────────────────────────────────────
  const periodEndDate = new Date(periodEnd + 'T12:00:00Z');
  const daysInMonth   = new Date(
    periodEndDate.getUTCFullYear(),
    periodEndDate.getUTCMonth() + 1,
    0
  ).getDate();
  const monthlyProjection = (totalSpend / numDays) * daysInMonth;

  // ── 6. Period type detection ──────────────────────────────────────────────────
  const periodType: 'weekly' | 'biweekly' | 'monthly' =
    numDays <= 7 ? 'weekly' : numDays <= 16 ? 'biweekly' : 'monthly';

  // ── 7. Draft monthly plan (if none exists for this month) ─────────────────────
  const periodStartDate = new Date(periodStart + 'T12:00:00Z');
  const planMonth = `${periodStartDate.getUTCFullYear()}-${String(periodStartDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
  let planCreated = false;

  const { data: existingPlan } = await adminClient
    .from('monthly_plans')
    .select('id')
    .eq('client_id', clientId)
    .eq('month', planMonth)
    .single();

  if (!existingPlan) {
    const activeCampaigns = campaignData.filter(c => c.status === 'ACTIVE');
    const planLines = [
      `Planejamento gerado automaticamente via importação de CSV.`,
      ``,
      `Período analisado: ${periodStart} → ${periodEnd} (${numDays} dias)`,
      `Tipo de período: ${periodType === 'weekly' ? 'Semanal' : periodType === 'biweekly' ? 'Quinzenal' : 'Mensal'}`,
      ``,
      `Investimento total: R$ ${totalSpend.toFixed(2)}`,
      `Projeção mensal (${daysInMonth} dias): R$ ${monthlyProjection.toFixed(2)}`,
      ``,
      `Campanhas ativas (${activeCampaigns.length}):`,
      ...activeCampaigns.slice(0, 10).map(c =>
        `  • ${c.name}${c.objective ? ` — ${c.objective}` : ''} — R$ ${c.spend.toFixed(2)}`
      ),
      ``,
      `Total de campanhas importadas: ${campaignData.length}`,
    ].join('\n');

    const { error: planError } = await adminClient.from('monthly_plans').insert({
      client_id: clientId,
      month: planMonth,
      content: planLines,
    });

    if (!planError) planCreated = true;
  }

  // ── 8. Claude AI analysis ────────────────────────────────────────────────────
  let aiAnalysis = null;
  let aiError: string | null = null;

  try {
    aiAnalysis = await generateCSVAnalysis({
      clientName,
      periodStart,
      periodEnd,
      numDays,
      periodType,
      totalSpend,
      totalImpressions,
      totalReach,
      totalClicks,
      totalConversions,
      monthlyProjection,
      ctr,
      cpc,
      cpm,
      activeCampaigns: campaignData
        .filter(c => c.status === 'ACTIVE')
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          spend: c.spend,
          conversions: c.conversions,
          cpc: c.cpc,
          objective: c.objective,
        })),
    });
  } catch (err) {
    aiError = err instanceof Error ? err.message : 'Erro desconhecido na análise com IA.';
    console.warn('CSV AI analysis failed (non-fatal):', aiError);
  }

  // ── 9. Monthly breakdown ──────────────────────────────────────────────────────
  const monthly = monthlyBreakdown(
    periodStart, periodEnd,
    totalSpend, totalImpressions, totalClicks, totalConversions
  );

  // ── 10. Generate HTML report ──────────────────────────────────────────────────
  const htmlReport = generateCSVReport({
    clientName,
    periodStart,
    periodEnd,
    numDays,
    totalSpend,
    totalImpressions,
    totalReach,
    totalClicks,
    totalConversions,
    monthlyProjection,
    daysInMonth,
    campaigns: campaignData,
  });

  // ── 11. Build content_json ────────────────────────────────────────────────────
  const contentJson = {
    source: 'csv',
    clientName,
    periodStart,
    periodEnd,
    numDays,
    periodType,
    totalSpend:        Math.round(totalSpend * 100) / 100,
    totalImpressions,
    totalReach,
    totalClicks,
    totalConversions,
    monthlyProjection: Math.round(monthlyProjection * 100) / 100,
    daysInMonth,
    campaigns: campaignData.map(c => ({
      name:        c.name,
      status:      c.status,
      objective:   c.objective,
      spend:       Math.round(c.spend * 100) / 100,
      impressions: c.impressions,
      clicks:      c.clicks,
      conversions: c.conversions,
      cpc:         Math.round(c.cpc * 100) / 100,
      cpm:         Math.round(c.cpm * 100) / 100,
      ctr:         Math.round(c.ctr * 10000) / 10000,
      budget:      c.budget,
      reach:       c.reach,
    })),
    monthly,
    rows_count: rows.length,
    ai_analysis: aiAnalysis,
  };

  // ── 12. Upsert report (avoid duplicates for same period) ──────────────────────
  const { data: existingReport } = await adminClient
    .from('reports').select('id')
    .eq('client_id', clientId)
    .eq('type', 'csv_analysis')
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .single();

  let reportId: string | null = null;

  if (existingReport) {
    await adminClient.from('reports').update({
      content_json:    contentJson,
      claude_analysis: htmlReport,
      updated_at:      new Date().toISOString(),
    }).eq('id', existingReport.id);
    reportId = existingReport.id;
  } else {
    const { data: newReport } = await adminClient.from('reports').insert({
      client_id:         clientId,
      type:              'csv_analysis',
      period_start:      periodStart,
      period_end:        periodEnd,
      content_json:      contentJson,
      claude_analysis:   htmlReport,
      visible_to_client: false,
    }).select().single();
    reportId = newReport?.id ?? null;
  }

  const areasUpdated = [
    'campanhas',
    'métricas diárias',
    'relatório CSV',
    ...(planCreated ? ['planejamento mensal'] : []),
    ...(aiAnalysis ? ['análise com IA'] : []),
  ];

  const meta = {
    reportId,
    periodType,
    areasUpdated,
    hasAiAnalysis: !!aiAnalysis,
    aiError,
    totalSpend:        Math.round(totalSpend * 100) / 100,
    monthlyProjection: Math.round(monthlyProjection * 100) / 100,
    periodStart,
    periodEnd,
    numDays,
    daysInMonth,
    campaigns: [...campaignData]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10)
      .map(c => ({
        name:        c.name,
        spend:       Math.round(c.spend * 100) / 100,
        conversions: c.conversions,
        cpc:         Math.round(c.cpc * 100) / 100,
        status:      c.status,
        objective:   c.objective,
        budget:      c.budget,
      })),
  };

  return NextResponse.json({ reportId, meta });
}
