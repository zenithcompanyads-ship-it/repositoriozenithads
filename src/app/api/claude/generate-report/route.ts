import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateReport } from '@/lib/claude';
import type { ReportType } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { clientId, type } = await req.json() as { clientId: string; type: ReportType };
  const adminClient = createAdminClient();

  // Get client
  const { data: client } = await adminClient.from('clients').select('*').eq('id', clientId).single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Get metrics for the period
  const days = type === 'weekly' ? 7 : type === 'biweekly' ? 15 : 30;
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - days);

  const { data: metrics } = await adminClient
    .from('metrics')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', periodStart.toISOString().split('T')[0])
    .lte('date', periodEnd.toISOString().split('T')[0])
    .order('date');

  // Generate Claude analysis
  const analysis = await generateReport(client, metrics ?? [], type);

  // Save report
  const { data: report, error } = await adminClient
    .from('reports')
    .insert({
      client_id: clientId,
      type,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      claude_analysis: analysis,
      visible_to_client: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(report, { status: 201 });
}
