import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read migration SQL file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/006_client_tasks.sql');

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // For now, just return the SQL content - actual execution would require
    // using Supabase's admin SDK or a different approach
    return NextResponse.json({
      message: 'Migration ready to be applied',
      steps: [
        '1. Go to Supabase Dashboard (https://supabase.com)',
        '2. Select your project',
        '3. Go to SQL Editor',
        '4. Click "New query"',
        '5. Copy and paste the SQL below',
        '6. Click "Run"'
      ],
      sql: migrationSQL
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
