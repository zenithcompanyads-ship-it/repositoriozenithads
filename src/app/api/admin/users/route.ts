import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, password, role, client_id } = await req.json();
  const adminClient = createAdminClient();

  // Create auth user with role metadata
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Update client_id in public.users if role is client
  if (role === 'client' && client_id && newUser.user) {
    await adminClient
      .from('users')
      .update({ client_id, role })
      .eq('id', newUser.user.id);
  }

  return NextResponse.json({ id: newUser.user?.id }, { status: 201 });
}
