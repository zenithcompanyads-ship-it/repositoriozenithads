import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const { rows, clientId, clientName } = await req.json() as {
    rows: CSVRow[];
    clientId: string;
    clientName: string;
  };

  if (!rows?.length)
    return NextResponse.json({ error: 'Nenhum dado encontrado no CSV.' }, { status: 400 });

  const tableText = formatCSVAsTable(rows);

  const prompt = `Você é um analista sênior de performance digital da agência Zenith.
Analise os dados de Meta Ads abaixo e entregue um relatório completo em português brasileiro com:

1. RESUMO EXECUTIVO (3-4 linhas com os números mais importantes)
2. CAMPANHAS DESTAQUE (top 3 melhores performances e por quê)
3. CAMPANHAS COM PROBLEMA (as que precisam de atenção e por quê)
4. ANÁLISE DE MÉTRICAS (CTR, CPC, ROAS, CPM — o que está bom e ruim)
5. RECOMENDAÇÕES ESTRATÉGICAS (pelo menos 5 ações concretas para melhorar os resultados no próximo período)
6. PRIORIDADES (lista ordenada do que fazer primeiro)

Seja específico, cite os nomes das campanhas e os números reais.
Tom: profissional mas direto, sem enrolação.

Cliente: ${clientName}

Dados do CSV:
${tableText}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text')
    return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 500 });

  const analysis = content.text;

  // Save to reports table
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: report, error } = await adminClient
    .from('reports')
    .insert({
      client_id: clientId,
      type: 'csv_analysis',
      period_start: today,
      period_end: today,
      content_json: { rows_count: rows.length, columns: Object.keys(rows[0]) },
      claude_analysis: analysis,
      visible_to_client: false,
    })
    .select()
    .single();

  if (error) {
    // Still return analysis even if save fails
    console.error('Error saving report:', error);
    return NextResponse.json({ analysis, reportId: null });
  }

  return NextResponse.json({ analysis, reportId: report.id });
}
