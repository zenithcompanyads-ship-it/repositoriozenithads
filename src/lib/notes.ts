import { SupabaseClient } from '@supabase/supabase-js';

export interface Note {
  id: string;
  admin_id: string;
  title: string;
  content?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export async function getNotes(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Note[];
}

export async function createNote(
  supabase: SupabaseClient,
  adminId: string,
  note: Omit<Note, 'id' | 'admin_id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      admin_id: adminId,
      title: note.title,
      content: note.content || null,
      category: note.category || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNote(
  supabase: SupabaseClient,
  noteId: string,
  updates: Partial<Omit<Note, 'id' | 'admin_id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('notes')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function deleteNote(supabase: SupabaseClient, noteId: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}
