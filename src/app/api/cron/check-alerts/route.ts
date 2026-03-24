import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALERT_METRICS = ['ctr', 'cpc', 'roas', 'spend'];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const [{ data: goals }, { data: clients }] = await Promise.all([
    adminClient.from('goals').select('*, clients(id, name)'),
    adminClient.from('clients').select('id').eq('active', true),
  ]);

  const activeClientIds = new Set((clients ?? []).map((c) => c.id));
  const alertsCreated: number[] = [];

  for (const goal of goals ?? []) {
    if (!activeClientIds.has(goal.client_id)) continue;

    // Get latest metric for this client
    const { data: latestMetrics } = await adminClient
      .from('metrics')
      .select(goal.metric)
      .eq('client_id', goal.client_id)
      .order('date', { ascending: false })
      .limit(1);

    if (!latestMetrics?.length) continue;

    const currentValue = Number(latestMetrics[0][goal.metric]);
    const threshold = goal.target_value;

    // Alert if metric is below target (for ctr, roas) or above (for cpc)
    const isAlert =
      goal.metric === 'cpc'
        ? currentValue > threshold * 1.2
        : currentValue < threshold * 0.8;

    if (isAlert) {
      // Check if there's already an active alert for this
      const { data: existing } = await adminClient
        .from('alerts')
        .select('id')
        .eq('client_id', goal.client_id)
        .eq('metric', goal.metric)
        .eq('resolved', false)
        .limit(1);

      if (!existing?.length) {
        const direction = goal.metric === 'cpc' ? 'acima de' : 'abaixo de';
        await adminClient.from('alerts').insert({
          client_id: goal.client_id,
          metric: goal.metric,
          threshold,
          current_value: currentValue,
          message: `${goal.metric.toUpperCase()} (${currentValue.toFixed(2)}) está ${direction} da meta (${threshold.toFixed(2)})`,
        });
        alertsCreated.push(goal.client_id);
      }
    }
  }

  return NextResponse.json({
    checked: goals?.length ?? 0,
    alertsCreated: alertsCreated.length,
  });
}
