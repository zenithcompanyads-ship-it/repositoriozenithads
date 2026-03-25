import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const adminClient = createAdminClient();

  // Extract avatar_data_url and permissions (handled separately)
  const { avatar_data_url, permissions: _permissions, ...clientData } = body;

  const { data, error } = await adminClient
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If there's a data URL avatar, upload it to storage
  if (avatar_data_url && data?.id) {
    try {
      const matches = avatar_data_url.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1] as string;
        const base64 = matches[2] as string;
        const buffer = Buffer.from(base64, 'base64');
        const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
        const path = `${data.id}/avatar.${ext}`;

        const { error: uploadError } = await adminClient.storage
          .from('client-avatars')
          .upload(path, buffer, { contentType: mimeType, upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = adminClient.storage
            .from('client-avatars')
            .getPublicUrl(path);
          const url = `${publicUrl}?t=${Date.now()}`;
          await adminClient.from('clients').update({ avatar_url: url }).eq('id', data.id);
          data.avatar_url = url;
        }
      }
    } catch (e) {
      console.error('Avatar upload failed:', e);
      // Don't fail the whole request
    }
  }

  return NextResponse.json(data, { status: 201 });
}
