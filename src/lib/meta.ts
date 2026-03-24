import type { MetaInsight } from '@/types';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

export interface MetaInsightsParams {
  adAccountId: string;
  accessToken: string;
  datePreset?: string;
  since?: string;
  until?: string;
  level?: 'account' | 'campaign' | 'adset' | 'ad';
}

export async function fetchMetaInsights(
  params: MetaInsightsParams
): Promise<MetaInsight[]> {
  const { adAccountId, accessToken, since, until, datePreset, level = 'account' } = params;

  const fields = 'spend,impressions,clicks,ctr,cpc,cpm,reach,actions';
  const timeRange = since && until
    ? `{"since":"${since}","until":"${until}"}`
    : undefined;

  const queryParams = new URLSearchParams({
    access_token: accessToken,
    fields,
    level,
    ...(timeRange ? { time_range: timeRange } : {}),
    ...(datePreset ? { date_preset: datePreset } : {}),
    time_increment: '1', // daily breakdown
  });

  const url = `${META_API_BASE}/act_${adAccountId}/insights?${queryParams}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Meta API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.data ?? [];
}

export async function fetchMetaCampaigns(
  adAccountId: string,
  accessToken: string
) {
  const fields =
    'id,name,objective,status,daily_budget,lifetime_budget,insights{spend,impressions,clicks,ctr,cpc,actions}';

  const queryParams = new URLSearchParams({
    access_token: accessToken,
    fields,
    date_preset: 'last_30d',
    limit: '50',
  });

  const url = `${META_API_BASE}/act_${adAccountId}/campaigns?${queryParams}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Meta Campaigns API error: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return data.data ?? [];
}

export function parseConversions(
  actions: Array<{ action_type: string; value: string }> | undefined
): number {
  if (!actions) return 0;
  const conversionTypes = [
    'offsite_conversion.fb_pixel_purchase',
    'offsite_conversion.fb_pixel_lead',
    'lead',
    'purchase',
  ];
  return actions
    .filter((a) => conversionTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

export function parseRoas(
  actions: Array<{ action_type: string; value: string }> | undefined,
  spend: number
): number {
  if (!actions || spend === 0) return 0;
  const purchaseValue = actions
    .filter((a) =>
      ['offsite_conversion.fb_pixel_purchase', 'purchase'].includes(
        a.action_type
      )
    )
    .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
  return purchaseValue > 0 ? purchaseValue / spend : 0;
}
