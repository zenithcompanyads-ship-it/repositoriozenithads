import { SupabaseClient } from '@supabase/supabase-js';

export type NotePriority = 'low' | 'normal' | 'high';
export type NoteTheme = 'default' | 'dark' | 'blue' | 'green' | 'purple' | 'gold' | 'coral' | 'slate';

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  admin_id: string;
  title: string;
  content?: string;
  category?: string;
  priority: NotePriority;
  theme: NoteTheme;
  subtasks: Subtask[];
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

export async function addSubtask(
  supabase: SupabaseClient,
  noteId: string,
  text: string
) {
  const { data: note, error: fetchError } = await supabase
    .from('notes')
    .select('subtasks')
    .eq('id', noteId)
    .single();

  if (fetchError) throw fetchError;

  const subtasks = note?.subtasks || [];
  const newSubtask: Subtask = {
    id: Date.now().toString(),
    text,
    done: false,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('notes')
    .update({
      subtasks: [...subtasks, newSubtask],
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  if (error) throw error;
  return newSubtask;
}

export async function toggleSubtask(
  supabase: SupabaseClient,
  noteId: string,
  subtaskId: string,
  done: boolean
) {
  const { data: note, error: fetchError } = await supabase
    .from('notes')
    .select('subtasks')
    .eq('id', noteId)
    .single();

  if (fetchError) throw fetchError;

  const subtasks = (note?.subtasks || []).map((st: Subtask) =>
    st.id === subtaskId ? { ...st, done } : st
  );

  const { error } = await supabase
    .from('notes')
    .update({
      subtasks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  if (error) throw error;
}

export async function deleteSubtask(
  supabase: SupabaseClient,
  noteId: string,
  subtaskId: string
) {
  const { data: note, error: fetchError } = await supabase
    .from('notes')
    .select('subtasks')
    .eq('id', noteId)
    .single();

  if (fetchError) throw fetchError;

  const subtasks = (note?.subtasks || []).filter((st: Subtask) => st.id !== subtaskId);

  const { error } = await supabase
    .from('notes')
    .update({
      subtasks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId);

  if (error) throw error;
}
