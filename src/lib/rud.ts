import { SupabaseClient } from '@supabase/supabase-js';

// ========== TASKS ==========
export async function getRudTasks(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('rud_tasks')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addRudTask(supabase: SupabaseClient, adminId: string, title: string, category: string = 'work') {
  const { data, error } = await supabase
    .from('rud_tasks')
    .insert({ admin_id: adminId, title, category })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRudTask(supabase: SupabaseClient, taskId: number, updates: any) {
  const { data, error } = await supabase
    .from('rud_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRudTask(supabase: SupabaseClient, taskId: number) {
  const { error } = await supabase.from('rud_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ========== HABITS ==========
export async function getRudHabits(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('rud_habits')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addRudHabit(supabase: SupabaseClient, adminId: string, name: string) {
  const { data, error } = await supabase
    .from('rud_habits')
    .insert({ admin_id: adminId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRudHabit(supabase: SupabaseClient, habitId: string) {
  const { error } = await supabase.from('rud_habits').delete().eq('id', habitId);
  if (error) throw error;
}

export async function getHabitState(supabase: SupabaseClient, adminId: string, date: string) {
  const { data, error } = await supabase
    .from('rud_habit_state')
    .select('*')
    .eq('admin_id', adminId)
    .eq('date', date);
  if (error) throw error;
  return data || [];
}

export async function toggleHabitState(supabase: SupabaseClient, adminId: string, habitId: string, date: string, done: boolean) {
  const { data: existing } = await supabase
    .from('rud_habit_state')
    .select('*')
    .eq('admin_id', adminId)
    .eq('habit_id', habitId)
    .eq('date', date)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('rud_habit_state')
      .update({ done })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('rud_habit_state')
      .insert({ admin_id: adminId, habit_id: habitId, date, done })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ========== BIG WINS ==========
export async function getRudBigWins(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('rud_bigwins')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addRudBigWin(supabase: SupabaseClient, adminId: string, bigWin: any) {
  const { data, error } = await supabase
    .from('rud_bigwins')
    .insert({
      admin_id: adminId,
      ...bigWin,
      date: bigWin.date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRudBigWin(supabase: SupabaseClient, bigWinId: number, updates: any) {
  const { data, error } = await supabase
    .from('rud_bigwins')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', bigWinId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRudBigWin(supabase: SupabaseClient, bigWinId: number) {
  const { error } = await supabase.from('rud_bigwins').delete().eq('id', bigWinId);
  if (error) throw error;
}

// ========== NOTES ==========
export async function getRudNotes(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('rud_notes')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addRudNote(supabase: SupabaseClient, adminId: string, title: string, content: string = '') {
  const { data, error } = await supabase
    .from('rud_notes')
    .insert({ admin_id: adminId, title, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRudNote(supabase: SupabaseClient, noteId: string, updates: any) {
  const { data, error } = await supabase
    .from('rud_notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRudNote(supabase: SupabaseClient, noteId: string) {
  const { error } = await supabase.from('rud_notes').delete().eq('id', noteId);
  if (error) throw error;
}

// ========== MEALS & WATER ==========
export async function getMeals(supabase: SupabaseClient, adminId: string, date: string) {
  const { data, error } = await supabase
    .from('rud_meals')
    .select('*')
    .eq('admin_id', adminId)
    .eq('date', date);
  if (error) throw error;
  return data || [];
}

export async function addMeal(supabase: SupabaseClient, adminId: string, date: string, mealType: string, description: string, calories?: number) {
  const { data, error } = await supabase
    .from('rud_meals')
    .insert({ admin_id: adminId, date, meal_type: mealType, description, calories })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWaterIntake(supabase: SupabaseClient, adminId: string, date: string) {
  const { data, error } = await supabase
    .from('rud_water')
    .select('cups')
    .eq('admin_id', adminId)
    .eq('date', date)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.cups || 0;
}

export async function updateWaterIntake(supabase: SupabaseClient, adminId: string, date: string, cups: number) {
  const { data: existing } = await supabase
    .from('rud_water')
    .select('*')
    .eq('admin_id', adminId)
    .eq('date', date)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('rud_water')
      .update({ cups })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('rud_water')
      .insert({ admin_id: adminId, date, cups })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ========== TIMER SESSIONS ==========
export async function addTimerSession(supabase: SupabaseClient, adminId: string, date: string, duration: number) {
  const { data, error } = await supabase
    .from('rud_timer_sessions')
    .insert({ admin_id: adminId, date, duration })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTimerSessionsForDate(supabase: SupabaseClient, adminId: string, date: string) {
  const { data, error } = await supabase
    .from('rud_timer_sessions')
    .select('duration')
    .eq('admin_id', adminId)
    .eq('date', date);
  if (error) throw error;
  return data?.map(d => d.duration) || [];
}

// ========== DAY TASKS ==========
export async function getDayTasks(supabase: SupabaseClient, adminId: string, date: string) {
  const { data, error } = await supabase
    .from('rud_day_tasks')
    .select('*')
    .eq('admin_id', adminId)
    .eq('date', date)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addDayTask(supabase: SupabaseClient, adminId: string, date: string, title: string, priority: string = 'normal') {
  const { data, error } = await supabase
    .from('rud_day_tasks')
    .insert({ admin_id: adminId, date, title, priority })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDayTask(supabase: SupabaseClient, taskId: string, updates: any) {
  const { data, error } = await supabase
    .from('rud_day_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDayTask(supabase: SupabaseClient, taskId: string) {
  const { error } = await supabase.from('rud_day_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ========== GOALS ==========
export async function getGoals(supabase: SupabaseClient, adminId: string, month?: string) {
  let query = supabase.from('rud_goals').select('*').eq('admin_id', adminId);
  if (month) {
    query = query.eq('month', month);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addGoal(supabase: SupabaseClient, adminId: string, title: string, description: string = '', month?: string) {
  const { data, error } = await supabase
    .from('rud_goals')
    .insert({
      admin_id: adminId,
      title,
      description,
      month: month || new Date().toISOString().slice(0, 7),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(supabase: SupabaseClient, goalId: string, updates: any) {
  const { data, error } = await supabase
    .from('rud_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(supabase: SupabaseClient, goalId: string) {
  const { error } = await supabase.from('rud_goals').delete().eq('id', goalId);
  if (error) throw error;
}

// ========== ROUTINE BLOCKS ==========
export async function getRoutineBlocks(supabase: SupabaseClient, adminId: string, dayIndex: number) {
  const { data, error } = await supabase
    .from('rud_routine_blocks')
    .select('*')
    .eq('admin_id', adminId)
    .eq('day_index', dayIndex)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addRoutineBlock(supabase: SupabaseClient, adminId: string, dayIndex: number, title: string, timeBlock: string) {
  const { data, error } = await supabase
    .from('rud_routine_blocks')
    .insert({ admin_id: adminId, day_index: dayIndex, title, time_block: timeBlock })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoutineBlock(supabase: SupabaseClient, blockId: number) {
  const { error } = await supabase.from('rud_routine_blocks').delete().eq('id', blockId);
  if (error) throw error;
}

// ========== ROUTINE STATE ==========
export async function getRoutineState(supabase: SupabaseClient, adminId: string, date: string) {
  const { data, error } = await supabase
    .from('rud_routine_state')
    .select('*')
    .eq('admin_id', adminId)
    .eq('date', date);
  if (error) throw error;
  return data || [];
}

export async function toggleRoutineBlockState(supabase: SupabaseClient, adminId: string, blockId: number, date: string, done: boolean) {
  const { data: existing } = await supabase
    .from('rud_routine_state')
    .select('*')
    .eq('admin_id', adminId)
    .eq('block_id', blockId)
    .eq('date', date)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('rud_routine_state')
      .update({ done })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('rud_routine_state')
      .insert({ admin_id: adminId, block_id: blockId, date, done })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ========== MEETINGS ==========
export async function getMeetings(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('rud_meetings')
    .select('*')
    .eq('admin_id', adminId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addMeeting(supabase: SupabaseClient, adminId: string, meeting: any) {
  const { data, error } = await supabase
    .from('rud_meetings')
    .insert({ admin_id: adminId, ...meeting })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMeeting(supabase: SupabaseClient, meetingId: string, updates: any) {
  const { data, error } = await supabase
    .from('rud_meetings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMeeting(supabase: SupabaseClient, meetingId: string) {
  const { error } = await supabase.from('rud_meetings').delete().eq('id', meetingId);
  if (error) throw error;
}

// ========== DOCS ==========
export async function getDocs(supabase: SupabaseClient, adminId: string) {
  const { data, error } = await supabase
    .from('rud_docs')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addDoc(supabase: SupabaseClient, adminId: string, title: string, url: string, docId?: string) {
  const { data, error } = await supabase
    .from('rud_docs')
    .insert({ admin_id: adminId, title, url, doc_id: docId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDoc(supabase: SupabaseClient, docId: string) {
  const { error } = await supabase.from('rud_docs').delete().eq('id', docId);
  if (error) throw error;
}
