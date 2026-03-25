import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const since    = searchParams.get('since');
  const until    = searchParams.get('until');

  if (!clientId || !since || !until)
    return NextResponse.json({ error: 'clientId, since e until são obrigatórios.' }, { status: 400 });

  // Basic date validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until))
    return NextResponse.json({ error: 'Formato de data inválido (YYYY-MM-DD).' }, { status: 400 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('metrics')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', since)
    .lte('date', until)
    .order('date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
