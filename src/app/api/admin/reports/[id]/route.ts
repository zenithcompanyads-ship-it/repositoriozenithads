import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const adminClient = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if ('admin_edited_analysis' in body) updateData.admin_edited_analysis = body.admin_edited_analysis;
  if ('visible_to_client' in body) {
    updateData.visible_to_client = body.visible_to_client;
    if (body.visible_to_client) updateData.published_at = new Date().toISOString();
    if (!body.visible_to_client) updateData.published_at = null;
  }
  if ('display_name' in body) {
    // Fetch current content_json to merge
    const { data: current } = await adminClient.from('reports').select('content_json').eq('id', id).single();
    const currentJson = (current?.content_json as Record<string, unknown>) ?? {};
    updateData.content_json = { ...currentJson, display_name: body.display_name };
  }

  const { data, error } = await adminClient
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
