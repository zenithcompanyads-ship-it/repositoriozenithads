import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role, client_id').eq('id', user.id).single();
  if (!userData) return new NextResponse('Unauthorized', { status: 401 });

  const isAdmin = userData.role === 'admin';
  const adminClient = createAdminClient();

  const { data: report } = await adminClient
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('type', 'csv_analysis')
    .single();

  if (!report) return new NextResponse('Not found', { status: 404 });

  if (!isAdmin) {
    if (!report.visible_to_client) return new NextResponse('Not found', { status: 404 });
    if (report.client_id !== userData.client_id) return new NextResponse('Not found', { status: 404 });
  }

  const html: string | null = report.claude_analysis ?? null;
  if (!html) return new NextResponse('Relatório ainda não gerado.', { status: 404 });

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
