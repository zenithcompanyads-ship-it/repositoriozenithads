import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchMetaInsights, fetchMetaCampaigns, parseConversions, parseRoas } from '@/lib/meta';
import { normalizeCampaignStatus } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get all active clients with Meta credentials
  const { data: clients, error } = await adminClient
    .from('clients')
    .select('id, name, meta_ad_account_id, meta_access_token')
    .eq('active', true)
    .not('meta_ad_account_id', 'is', null)
    .not('meta_access_token', 'is', null);

  if (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const results: Array<{ clientId: string; status: string; error?: string }> = [];

  for (const client of clients ?? []) {
    try {
      // Fetch daily metrics
      const insights = await fetchMetaInsights({
        adAccountId: client.meta_ad_account_id,
        accessToken: client.meta_access_token,
        since: dateStr,
        until: dateStr,
      });

      for (const insight of insights) {
        const spend = parseFloat(insight.spend ?? '0');
        const impressions = parseInt(insight.impressions ?? '0');
        const clicks = parseInt(insight.clicks ?? '0');
        const reach = parseInt(insight.reach ?? '0');
        const conversions = parseConversions(insight.actions);
        const roas = parseRoas(insight.actions, spend);

        await adminClient.from('metrics').upsert({
          client_id: client.id,
          date: insight.date_start,
          spend,
          impressions,
          clicks,
          ctr: parseFloat(insight.ctr ?? '0'),
          cpc: parseFloat(insight.cpc ?? '0'),
          cpm: parseFloat(insight.cpm ?? '0'),
          reach,
          conversions,
          roas,
        }, { onConflict: 'client_id,date' });
      }

      // Fetch and update campaigns
      const campaigns = await fetchMetaCampaigns(
        client.meta_ad_account_id,
        client.meta_access_token
      );

      for (const campaign of campaigns) {
        const campaignInsights = campaign.insights?.data?.[0] ?? {};
        const spend = parseFloat(campaignInsights.spend ?? '0');
        const impressions = parseInt(campaignInsights.impressions ?? '0');
        const clicks = parseInt(campaignInsights.clicks ?? '0');

        await adminClient.from('campaigns').upsert({
          client_id: client.id,
          meta_campaign_id: campaign.id,
          name: campaign.name,
          objective: campaign.objective,
          status: normalizeCampaignStatus(campaign.status),
          budget: parseFloat(campaign.daily_budget ?? campaign.lifetime_budget ?? '0'),
          spend,
          impressions,
          clicks,
          ctr: parseFloat(campaignInsights.ctr ?? '0'),
          cpc: parseFloat(campaignInsights.cpc ?? '0'),
          conversions: parseConversions(campaignInsights.actions),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id,meta_campaign_id' });
      }

      results.push({ clientId: client.id, status: 'ok' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error syncing client ${client.id}:`, errorMsg);
      results.push({ clientId: client.id, status: 'error', error: errorMsg });
    }
  }

  return NextResponse.json({ date: dateStr, results });
}
