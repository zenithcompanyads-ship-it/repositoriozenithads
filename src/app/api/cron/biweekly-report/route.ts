import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateReport } from '@/lib/claude';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: clients } = await adminClient.from('clients').select('*').eq('active', true);

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 15);
  const results = [];

  for (const client of clients ?? []) {
    try {
      const { data: metrics } = await adminClient
        .from('metrics').select('*')
        .eq('client_id', client.id)
        .gte('date', periodStart.toISOString().split('T')[0])
        .lte('date', periodEnd.toISOString().split('T')[0])
        .order('date');

      const analysis = await generateReport(client, metrics ?? [], 'biweekly');
      await adminClient.from('reports').insert({
        client_id: client.id, type: 'biweekly',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        claude_analysis: analysis, visible_to_client: false,
      });
      results.push({ clientId: client.id, status: 'ok' });
    } catch (err) {
      results.push({ clientId: client.id, status: 'error', error: String(err) });
    }
  }

  return NextResponse.json({ type: 'biweekly', results });
}
