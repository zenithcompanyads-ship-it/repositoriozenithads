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

  // Check if habit exists
  const { data: existing } = await supabase
    .from('rud_habits')
    .select('id')
    .eq('admin_id', user.id)
    .eq('name', habitName)
    .single();

  if (existing) return existing.id;

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
      done: state,
    }, {
      onConflict: 'admin_id,habit_id,date'
    });

  if (error) throw error;
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

/**
 * Get habit states for a specific week
 */
export async function getWeekHabits(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  return getHabitStates(startStr, endStr);
}

/**
 * Get habit states for a specific month
 */
export async function getMonthHabits(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  return getHabitStates(startStr, endStr);
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
    if (state.done === 1) {
      stats[habitName].done++;
    }
    stats[habitName].percentage = Math.round((stats[habitName].done / stats[habitName].total) * 100);
  });

  return stats;
}
