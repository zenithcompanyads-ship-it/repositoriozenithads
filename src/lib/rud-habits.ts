import { createClient } from '@/lib/supabase/client';

export interface HabitState {
  id?: string;
  admin_id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  done: -1 | 0 | 1; // -1: skipped, 0: not done, 1: done
}

export interface HabitDef {
  id: string;
  admin_id: string;
  name: string;
  created_at: string;
}

const supabase = createClient();

/**
 * Get or create habit definition
 */
export async function getOrCreateHabit(habitName: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if habit exists (use limit/maybeSingle to handle 0/dup rows safely)
  const { data: existing } = await supabase
    .from('rud_habits')
    .select('id')
    .eq('admin_id', user.id)
    .eq('name', habitName)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create new habit
  const { data: newHabit, error } = await supabase
    .from('rud_habits')
    .insert({
      admin_id: user.id,
      name: habitName,
    })
    .select('id')
    .single();

  if (error) throw error;
  return newHabit.id;
}

/**
 * Save habit state for a specific date
 */
export async function saveHabitState(habitName: string, date: string, state: -1 | 0 | 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const habitId = await getOrCreateHabit(habitName);

  const { error } = await supabase
    .from('rud_habit_state')
    .upsert({
      admin_id: user.id,
      habit_id: habitId,
      date,
      done: state === 1 ? true : false,
    }, {
      onConflict: 'admin_id,habit_id,date'
    });

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message || 'Erro ao salvar hábito');
  }
}

/**
 * Batch save multiple habit states
 */
export async function batchSaveHabitStates(states: Array<{ habitName: string; date: string; state: -1 | 0 | 1 }>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // First, get or create all habits
  const habitMap = new Map<string, string>();
  for (const { habitName } of states) {
    if (!habitMap.has(habitName)) {
      const habitId = await getOrCreateHabit(habitName);
      habitMap.set(habitName, habitId);
    }
  }

  // Then batch upsert all states
  const records = states.map(({ habitName, date, state }) => ({
    admin_id: user.id,
    habit_id: habitMap.get(habitName)!,
    date,
    done: state === 1 ? true : false,
  }));

  const { error } = await supabase
    .from('rud_habit_state')
    .upsert(records, {
      onConflict: 'admin_id,habit_id,date'
    });

  if (error) {
    console.error('Supabase batch error:', error);
    throw new Error(error.message || 'Erro ao salvar hábitos');
  }
}

/**
 * Get habit states for a date range
 */
export async function getHabitStates(startDate: string, endDate: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('rud_habit_state')
    .select('*, rud_habits(name)')
    .eq('admin_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Local-date string (avoids UTC drift)
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Get habit states for a specific week
 */
export async function getWeekHabits(weekStart: string) {
  // weekStart is already YYYY-MM-DD; compute end by adding 6 calendar days
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  return getHabitStates(toLocalDateStr(start), toLocalDateStr(end));
}

/**
 * Get habit states for a specific month
 */
export async function getMonthHabits(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return getHabitStates(toLocalDateStr(start), toLocalDateStr(end));
}

/**
 * Get all habits for a user
 */
export async function getAllHabits() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('rud_habits')
    .select('*')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new habit (returns full row including id)
 */
export async function createHabit(name: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('rud_habits')
    .insert({ admin_id: user.id, name })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a habit by id (cascades to rud_habit_state)
 */
export async function deleteHabitById(habitId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('rud_habits')
    .delete()
    .eq('id', habitId)
    .eq('admin_id', user.id);

  if (error) throw error;
}

/**
 * Bulk seed habits (for first-time users) — only inserts if no rows exist
 */
export async function seedHabitsIfEmpty(presets: { name: string }[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('rud_habits')
    .select('id')
    .eq('admin_id', user.id)
    .limit(1);

  if (existing && existing.length > 0) return null;

  const rows = presets.map((p) => ({ admin_id: user.id, name: p.name }));
  const { data, error } = await supabase
    .from('rud_habits')
    .insert(rows)
    .select('*');

  if (error) throw error;
  return data;
}

/**
 * Calculate habit completion stats for a date range
 */
export async function getHabitStats(startDate: string, endDate: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('rud_habit_state')
    .select('habit_id, done, rud_habits(name)')
    .eq('admin_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  // Calculate stats
  const stats: Record<string, { done: number; total: number; percentage: number }> = {};

  data?.forEach((state: any) => {
    const habitName = state.rud_habits?.name || 'Unknown';
    if (!stats[habitName]) {
      stats[habitName] = { done: 0, total: 0, percentage: 0 };
    }
    stats[habitName].total++;
    if (state.done === true || state.done === 1) {
      stats[habitName].done++;
    }
    stats[habitName].percentage = Math.round((stats[habitName].done / stats[habitName].total) * 100);
  });

  return stats;
}
