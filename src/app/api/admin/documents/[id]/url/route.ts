import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: doc } = await adminClient
    .from('client_documents')
    .select('file_path')
    .eq('id', id)
    .single();

  if (!doc) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const { data: signed } = await adminClient.storage
    .from('client-documents')
    .createSignedUrl(doc.file_path, 3600);

  if (!signed) return NextResponse.json({ error: 'Erro ao gerar URL.' }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
