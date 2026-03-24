import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

function formatCSVAsTable(rows: CSVRow[]): string {
  if (!rows.length) return 'Sem dados.';
  const headers = Object.keys(rows[0]);
  const header = headers.join(' | ');
  const divider = headers.map(() => '---').join(' | ');
  const body = rows.map((row) => headers.map((h) => String(row[h] ?? '')).join(' | ')).join('\n');
  return `${header}\n${divider}\n${body}`;
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
  // ── Auth ────────────────────────────────────────────────────────────────────
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

  // ── 1. Period dates ──────────────────────────────────────────────────────────
  const firstRow = rows[0];
  const periodStart = String(
    getCol(firstRow, 'Início dos relatórios', 'inicio_dos_relatorios', 'period_start', 'Start date') ?? ''
  ) || new Date().toISOString().split('T')[0];
  const periodEnd = String(
    getCol(firstRow, 'Término dos relatórios', 'termino_dos_relatorios', 'period_end', 'End date') ?? ''
  ) || new Date().toISOString().split('T')[0];

  // ── 2. Aggregate per-campaign data ──────────────────────────────────────────
  let totalSpend = 0, totalImpressions = 0, totalReach = 0,
    totalConversions = 0, totalClicks = 0;

  interface CampaignRow {
    client_id: string;
    name: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cpc: number;
    budget: number;
    reach: number;
  }

  const campaignUpserts: CampaignRow[] = rows.map((row) => {
    const name = String(
      getCol(row, 'Nome da campanha', 'Campaign Name', 'Campaign name', 'name') ?? 'Campanha'
    );
    const statusRaw = String(
      getCol(row, 'Veiculação da campanha', 'Status', 'Delivery') ?? 'inactive'
    ).toLowerCase();
    const status = statusRaw === 'active' ? 'ACTIVE' : 'INACTIVE';

    // Spend: use "Valor usado" if present, else results × cost-per-result
    const spendCol = toNum(getCol(row, 'Valor usado (BRL)', 'Valor usado', 'Amount spent (BRL)', 'Amount spent', 'Spend'));
    const results = toNum(getCol(row, 'Resultados', 'Results', 'Conversions'));
    const cprValue = toNum(getCol(row, 'Custo por resultados', 'Cost per result', 'CPC'));
    const spend = spendCol > 0 ? spendCol : (results > 0 && cprValue > 0 ? results * cprValue : 0);

    const impressions = toNum(getCol(row, 'Impressões', 'Impressions'));
    const reach = toNum(getCol(row, 'Alcance', 'Reach'));
    const clicks = toNum(getCol(row, 'Cliques', 'Clicks', 'Link clicks'));
    const budgetRaw = getCol(row, 'Orçamento do conjunto de anúncios', 'Orçamento', 'Budget');
    const budget = typeof budgetRaw === 'number' ? budgetRaw : toNum(budgetRaw);
    const cpc = clicks > 0 ? spend / clicks : cprValue;

    totalSpend += spend;
    totalImpressions += impressions;
    totalReach += reach;
    totalConversions += results;
    totalClicks += clicks;

    return { client_id: clientId, name, status, spend, impressions, clicks, conversions: results, cpc, budget, reach };
  });

  // If no clicks in CSV, estimate from impressions
  if (totalClicks === 0 && totalImpressions > 0) {
    totalClicks = Math.round(totalImpressions * 0.03);
  }

  const adminClient = createAdminClient();

  // ── 3. Upsert campaigns ──────────────────────────────────────────────────────
  for (const camp of campaignUpserts) {
    const { data: existing } = await adminClient
      .from('campaigns').select('id')
      .eq('client_id', clientId).eq('name', camp.name).single();

    if (existing) {
      await adminClient.from('campaigns').update({
        status: camp.status, spend: camp.spend, impressions: camp.impressions,
        clicks: camp.clicks, conversions: camp.conversions, cpc: camp.cpc,
        budget: camp.budget, reach: camp.reach,
      }).eq('id', existing.id);
    } else {
      await adminClient.from('campaigns').insert(camp);
    }
  }

  // ── 4. Upsert daily metrics ──────────────────────────────────────────────────
  const days = datesBetween(periodStart, periodEnd);
  const numDays = Math.max(days.length, 1);
  const dailySpend = totalSpend / numDays;
  const dailyImpressions = Math.round(totalImpressions / numDays);
  const dailyReach = Math.round(totalReach / numDays);
  const dailyConversions = Math.round(totalConversions / numDays);
  const dailyClicks = Math.round(totalClicks / numDays);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const metricRows = days.map((date) => ({
    client_id: clientId, date,
    spend: Math.round(dailySpend * 100) / 100,
    impressions: dailyImpressions,
    clicks: dailyClicks,
    ctr: Math.round(ctr * 10000) / 10000,
    cpc: Math.round(cpc * 10000) / 10000,
    cpm: Math.round(cpm * 10000) / 10000,
    roas: 0,
    reach: dailyReach,
    conversions: dailyConversions,
  }));

  for (let i = 0; i < metricRows.length; i += 20) {
    await adminClient.from('metrics')
      .upsert(metricRows.slice(i, i + 20), { onConflict: 'client_id,date' });
  }

  // ── 5. Monthly budget projection ─────────────────────────────────────────────
  const periodEndDate = new Date(periodEnd + 'T12:00:00Z');
  const daysInMonth = new Date(
    periodEndDate.getUTCFullYear(),
    periodEndDate.getUTCMonth() + 1,
    0
  ).getDate();
  const monthlyProjection = numDays > 0 ? (totalSpend / numDays) * daysInMonth : 0;

  // ── 6. Create report records ──────────────────────────────────────────────────
  const contentJson = {
    source: 'csv', rows_count: rows.length,
    columns: Object.keys(rows[0]),
    totalSpend, totalClicks, totalImpressions, totalReach, totalConversions,
    monthlyProjection, periodStart, periodEnd,
  };

  const [{ data: monthlyReport }, { data: biweeklyReport }] = await Promise.all([
    adminClient.from('reports').insert({
      client_id: clientId, type: 'monthly',
      period_start: periodStart, period_end: periodEnd,
      content_json: contentJson,
      claude_analysis: null, visible_to_client: false,
    }).select().single(),
    adminClient.from('reports').insert({
      client_id: clientId, type: 'biweekly',
      period_start: periodStart, period_end: periodEnd,
      content_json: contentJson,
      claude_analysis: null, visible_to_client: false,
    }).select().single(),
  ]);

  const monthlyReportId = monthlyReport?.id ?? null;
  const biweeklyReportId = biweeklyReport?.id ?? null;

  // ── 7. Stream Claude analysis ─────────────────────────────────────────────────
  const tableText = formatCSVAsTable(rows);
  const prompt = `Você é analista sênior de tráfego pago da Zenith Company Ads.
Analise os dados de Meta Ads abaixo e escreva um relatório profissional em português brasileiro:

## 1. RESUMO EXECUTIVO
Números principais: investimento total, alcance, conversões, CPC médio. 3-5 linhas.

## 2. CAMPANHAS DESTAQUE
Top 3 campanhas com melhor performance. Cite nome, números e por que se destacam.

## 3. CAMPANHAS COM PROBLEMA
Campanhas que precisam de atenção. Cite nome, problema específico e impacto.

## 4. ANÁLISE DE MÉTRICAS
Avaliação de CTR, CPC, CPM e frequência. O que está bom e o que precisa melhorar.

## 5. RECOMENDAÇÕES ESTRATÉGICAS
5 ações concretas e priorizadas para o próximo período.

## 6. PRIORIDADES
Lista ordenada: o que fazer primeiro esta semana.

Tom: profissional, direto, focado em resultados.
Cliente: ${clientName}
Período: ${periodStart} a ${periodEnd} (${numDays} dias)
Investimento total: R$ ${totalSpend.toFixed(2)}
Projeção mensal: R$ ${monthlyProjection.toFixed(2)}

Dados por campanha:
${tableText}`;

  // Campaign summary for metadata (top 10 by spend)
  const campaignMeta = [...campaignUpserts]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      spend: Math.round(c.spend * 100) / 100,
      conversions: c.conversions,
      cpc: Math.round(c.cpc * 100) / 100,
      status: c.status,
      budget: c.budget,
    }));

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        // SDK 0.27 compatible: iterate raw events
        const messageStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2500,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of messageStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            fullText += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Save analysis to both reports
        await Promise.all([
          monthlyReportId
            ? adminClient.from('reports').update({ claude_analysis: fullText }).eq('id', monthlyReportId)
            : Promise.resolve(),
          biweeklyReportId
            ? adminClient.from('reports').update({ claude_analysis: fullText }).eq('id', biweeklyReportId)
            : Promise.resolve(),
        ]);

        // Send metadata at end of stream
        const meta = {
          monthlyReportId,
          biweeklyReportId,
          totalSpend: Math.round(totalSpend * 100) / 100,
          monthlyProjection: Math.round(monthlyProjection * 100) / 100,
          periodStart,
          periodEnd,
          numDays,
          daysInMonth,
          campaigns: campaignMeta,
        };
        const metaB64 = Buffer.from(JSON.stringify(meta)).toString('base64');
        controller.enqueue(encoder.encode(`\n\n{{DONE:${monthlyReportId ?? 'null'}||${metaB64}}}`));
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n{{ERROR:${String(err)}}}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
