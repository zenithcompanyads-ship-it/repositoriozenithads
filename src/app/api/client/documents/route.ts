import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Retorna documentos visíveis do cliente logado, com signed URLs
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role, client_id').eq('id', user.id).single();
  if (!userData?.client_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = createAdminClient();

  const { data: docs, error } = await adminClient
    .from('client_documents')
    .select('*')
    .eq('client_id', userData.client_id)
    .eq('visible_to_client', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Gerar signed URLs (válidas por 1h)
  const withUrls = await Promise.all(
    (docs ?? []).map(async (doc) => {
      const { data: signed } = await adminClient.storage
        .from('client-documents')
        .createSignedUrl(doc.file_path, 3600);
      return { ...doc, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json(withUrls);
}
