import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return null;
  return user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('client_documents')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: clientId } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const displayName = (formData.get('display_name') as string | null)?.trim();

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: 'Nome do documento é obrigatório.' }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Tipo de arquivo não suportado. Use PDF, DOC ou DOCX.' }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 20MB.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const docId = crypto.randomUUID();
  const filePath = `${clientId}/${docId}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from('client-documents')
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Signed URL válida por 10 anos (usaremos URLs assinadas on-demand, guardamos apenas o path)
  const { data: inserted, error: dbError } = await adminClient
    .from('client_documents')
    .insert({
      id: docId,
      client_id: clientId,
      display_name: displayName,
      file_url: filePath, // stored as path; signed URL gerada no GET
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      visible_to_client: false,
    })
    .select()
    .single();

  if (dbError) {
    // rollback storage
    await adminClient.storage.from('client-documents').remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
