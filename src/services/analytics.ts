import { supabase } from '../lib/supabase'
import type { Habit } from '../types/habits'

export type DatedHabitEntry = { habit_id: string; entry_date: string; completed: boolean; numeric_value: number | null }

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function getActiveHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await getClient().from('habits').select('id, name, description, tracking_type, unit, target_value, color, icon, sort_order').eq('user_id', userId).eq('is_active', true).order('sort_order')
  if (error) throw error
  return data as Habit[]
}

export async function getEntriesInRange(userId: string, startDate: string, endDate: string): Promise<DatedHabitEntry[]> {
  const { data, error } = await getClient().from('habit_entries').select('habit_id, entry_date, completed, numeric_value').eq('user_id', userId).gte('entry_date', startDate).lte('entry_date', endDate)
  if (error) throw error
  return data as DatedHabitEntry[]
}
