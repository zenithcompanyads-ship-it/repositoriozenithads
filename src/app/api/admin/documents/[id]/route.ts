import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  return userData?.role === 'admin';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const adminClient = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('display_name' in body) updateData.display_name = String(body.display_name).trim();
  if ('visible_to_client' in body) updateData.visible_to_client = Boolean(body.visible_to_client);

  const { data, error } = await adminClient
    .from('client_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  // Busca o file_path antes de deletar
  const { data: doc, error: fetchError } = await adminClient
    .from('client_documents')
    .select('file_path')
    .eq('id', id)
    .single();

  if (fetchError || !doc) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });

  // Remove do storage
  await adminClient.storage.from('client-documents').remove([doc.file_path]);

  // Remove do banco
  const { error } = await adminClient.from('client_documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
