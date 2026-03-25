import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderToBuffer } from '@react-pdf/renderer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import React from 'react';
import { ZenithReportPDF } from '@/lib/pdf-template';
import type { AIAnalysis } from '@/lib/csv-analysis';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Fetch report ───────────────────────────────────────────────────────────
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: report } = await adminClient
    .from('reports')
    .select('*, clients(name)')
    .eq('id', id)
    .single();

  if (!report) return NextResponse.json({ error: 'Relatório não encontrado.' }, { status: 404 });

  const c = report.content_json as Record<string, unknown>;

  if (c?.source !== 'csv') {
    return NextResponse.json({ error: 'Geração de PDF disponível apenas para análises de CSV.' }, { status: 400 });
  }

  type CampaignRow = {
    name: string;
    status: string;
    objective?: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cpc: number;
    ctr?: number;
  };

  const props = {
    clientName:        (c.clientName as string)        || report.clients?.name || 'Cliente',
    periodStart:       report.period_start,
    periodEnd:         report.period_end,
    numDays:           (c.numDays as number)            || 1,
    periodType:        (c.periodType as string)         || 'monthly',
    totalSpend:        (c.totalSpend as number)         || 0,
    totalImpressions:  (c.totalImpressions as number)   || 0,
    totalReach:        (c.totalReach as number)         || 0,
    totalClicks:       (c.totalClicks as number)        || 0,
    totalConversions:  (c.totalConversions as number)   || 0,
    monthlyProjection: (c.monthlyProjection as number)  || 0,
    daysInMonth:       (c.daysInMonth as number)        || 30,
    campaigns:         (c.campaigns as CampaignRow[])   || [],
    aiAnalysis:        (c.ai_analysis as AIAnalysis)    || null,
  };

  // ── Generate PDF ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ZenithReportPDF, props) as any;
  const buffer = await renderToBuffer(element);
  const uint8 = new Uint8Array(buffer);

  const slug = props.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `zenith-${slug}-${report.period_start}.pdf`;

  return new NextResponse(uint8, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      uint8.byteLength.toString(),
    },
  });
}
