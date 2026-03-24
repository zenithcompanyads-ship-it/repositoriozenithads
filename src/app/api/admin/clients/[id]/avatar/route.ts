import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type))
    return NextResponse.json({ error: 'Tipo de arquivo não suportado.' }, { status: 400 });

  if (file.size > 2 * 1024 * 1024)
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 });

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${id}/avatar.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const adminClient = createAdminClient();

  // Upload to Supabase Storage
  const { error: uploadError } = await adminClient.storage
    .from('client-avatars')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Get public URL
  const { data: { publicUrl } } = adminClient.storage
    .from('client-avatars')
    .getPublicUrl(path);

  // Add cache-busting so browser picks up the new image
  const url = `${publicUrl}?t=${Date.now()}`;

  // Save URL to client record
  const { error: updateError } = await adminClient
    .from('clients')
    .update({ avatar_url: url })
    .eq('id', id);

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = createAdminClient();

  // Remove from storage (try both extensions)
  for (const ext of ['jpg', 'png', 'webp']) {
    await adminClient.storage.from('client-avatars').remove([`${id}/avatar.${ext}`]);
  }

  // Clear URL in DB
  await adminClient.from('clients').update({ avatar_url: null }).eq('id', id);

  return NextResponse.json({ success: true });
}
