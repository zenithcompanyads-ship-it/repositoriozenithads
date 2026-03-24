import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface CSVRow {
  [key: string]: string | number;
}

function formatCSVAsTable(rows: CSVRow[]): string {
  if (!rows.length) return 'Sem dados.';
  const headers = Object.keys(rows[0]);
  const header = headers.join(' | ');
  const divider = headers.map(() => '---').join(' | ');
  const body = rows
    .map((row) => headers.map((h) => String(row[h] ?? '')).join(' | '))
    .join('\n');
  return `${header}\n${divider}\n${body}`;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '0').replace(',', '.'));
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (userData?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { rows, clientId, clientName } = (await req.json()) as {
    rows: CSVRow[];
    clientId: string;
    clientName: string;
  };

  if (!rows?.length)
    return NextResponse.json({ error: 'Nenhum dado encontrado no CSV.' }, { status: 400 });

  // ─── 1. Extract period dates ─────────────────────────────────────────────────
  const firstRow = rows[0];
  const periodStart = String(
    getCol(firstRow, 'Início dos relatórios', 'inicio_dos_relatorios', 'period_start', 'Start date') ?? ''
  ) || new Date().toISOString().split('T')[0];
  const periodEnd = String(
    getCol(firstRow, 'Término dos relatórios', 'termino_dos_relatorios', 'period_end', 'End date') ?? ''
  ) || new Date().toISOString().split('T')[0];

  // ─── 2. Aggregate totals ─────────────────────────────────────────────────────
  let totalSpend = 0, totalImpressions = 0, totalReach = 0, totalConversions = 0;

  const campaignUpserts = rows.map((row) => {
    const name = String(
      getCol(row, 'Nome da campanha', 'Campaign Name', 'Campaign name', 'name') ?? 'Campanha'
    );
    const statusRaw = String(
      getCol(row, 'Veiculação da campanha', 'Status', 'Delivery') ?? 'inactive'
    ).toLowerCase();
    const status = statusRaw === 'active' ? 'ACTIVE' : 'INACTIVE';
    const spend = toNum(getCol(row, 'Valor usado (BRL)', 'Valor usado', 'Amount spent', 'Spend'));
    const impressions = toNum(getCol(row, 'Impressões', 'Impressions'));
    const reach = toNum(getCol(row, 'Alcance', 'Reach'));
    const conversions = toNum(getCol(row, 'Resultados', 'Results', 'Conversions'));
    const cpc = toNum(getCol(row, 'Custo por resultados', 'Cost per result', 'CPC'));
    const budgetRaw = getCol(row, 'Orçamento do conjunto de anúncios', 'Budget');
    const budget = typeof budgetRaw === 'number' ? budgetRaw : toNum(budgetRaw);

    totalSpend += spend;
    totalImpressions += impressions;
    totalReach += reach;
    totalConversions += conversions;

    return { client_id: clientId, name, status, spend, impressions, conversions, cpc, budget };
  });

  const adminClient = createAdminClient();

  // ─── 3. Upsert campaigns ──────────────────────────────────────────────────────
  for (const camp of campaignUpserts) {
    const { data: existing } = await adminClient
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId)
      .eq('name', camp.name)
      .single();

    if (existing) {
      await adminClient.from('campaigns').update(camp).eq('id', existing.id);
    } else {
      await adminClient.from('campaigns').insert(camp);
    }
  }

  // ─── 4. Upsert daily metrics ──────────────────────────────────────────────────
  const days = datesBetween(periodStart, periodEnd);
  const numDays = Math.max(days.length, 1);
  const dailySpend = totalSpend / numDays;
  const dailyImpressions = Math.round(totalImpressions / numDays);
  const dailyReach = Math.round(totalReach / numDays);
  const dailyConversions = Math.round(totalConversions / numDays);
  const totalClicks = Math.round(totalImpressions * 0.03);
  const dailyClicks = Math.round(totalClicks / numDays);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  const metricRows = days.map((date) => ({
    client_id: clientId,
    date,
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
    await adminClient
      .from('metrics')
      .upsert(metricRows.slice(i, i + 20), { onConflict: 'client_id,date' });
  }

  // ─── 5. Create report record (empty analysis) ─────────────────────────────────
  const { data: report } = await adminClient
    .from('reports')
    .insert({
      client_id: clientId,
      type: 'monthly',
      period_start: periodStart,
      period_end: periodEnd,
      content_json: { source: 'csv', rows_count: rows.length, columns: Object.keys(rows[0]) },
      claude_analysis: null,
      visible_to_client: false,
    })
    .select()
    .single();

  const reportId = report?.id ?? null;

  // ─── 6. Stream Claude analysis ────────────────────────────────────────────────
  const tableText = formatCSVAsTable(rows);
  const prompt = `Você é um analista sênior de performance digital da agência Zenith Company Ads.
Analise os dados de Meta Ads abaixo e entregue um relatório em português brasileiro com:

1. RESUMO EXECUTIVO (3-4 linhas com os números mais importantes)
2. CAMPANHAS DESTAQUE (top 3 melhores performances e por quê)
3. CAMPANHAS COM PROBLEMA (as que precisam de atenção e por quê)
4. ANÁLISE DE MÉTRICAS (CTR, CPC — o que está bom e ruim)
5. RECOMENDAÇÕES ESTRATÉGICAS (5 ações concretas)
6. PRIORIDADES (lista ordenada do que fazer primeiro)

Seja específico, cite os nomes das campanhas e os números reais.
Tom: profissional mas direto.

Cliente: ${clientName}
Período: ${periodStart} a ${periodEnd}

Dados:
${tableText}`;

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const text of stream.text_stream) {
          fullText += text;
          controller.enqueue(encoder.encode(text));
        }

        // Save analysis to report
        if (reportId) {
          await adminClient
            .from('reports')
            .update({ claude_analysis: fullText })
            .eq('id', reportId);
        }

        // Send completion marker with reportId
        controller.enqueue(encoder.encode(`\n\n{{DONE:${reportId ?? 'null'}}}`));
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
