import { supabase } from '../lib/supabase'
import type { Habit, HabitEntry, HabitWithEntry } from '../types/habits'

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function getTodayHabits(userId: string, entryDate: string): Promise<HabitWithEntry[]> {
  const client = getClient()
  const [{ data: habits, error: habitsError }, { data: entries, error: entriesError }] = await Promise.all([
    client.from('habits').select('id, name, description, tracking_type, unit, target_value, color, icon, sort_order').eq('user_id', userId).eq('is_active', true).order('sort_order'),
    client.from('habit_entries').select('habit_id, completed, numeric_value').eq('user_id', userId).eq('entry_date', entryDate),
  ])
  if (habitsError) throw habitsError
  if (entriesError) throw entriesError
  const entryByHabit = new Map((entries as HabitEntry[]).map((entry) => [entry.habit_id, entry]))
  return (habits as Habit[]).map((habit) => ({ ...habit, entry: entryByHabit.get(habit.id) }))
}

export async function saveHabitEntry(input: { userId: string; habit: Habit; entryDate: string; numericValue?: number | null; completed?: boolean }) {
  const client = getClient()
  const numericValue = input.habit.tracking_type === 'quantitative' ? (input.numericValue ?? null) : null
  const completed = input.habit.tracking_type === 'quantitative'
    ? numericValue !== null && numericValue >= (input.habit.target_value ?? 0)
    : Boolean(input.completed)
  const { data, error } = await client.from('habit_entries').upsert({
    user_id: input.userId, habit_id: input.habit.id, entry_date: input.entryDate, completed, numeric_value: numericValue,
  }, { onConflict: 'user_id,habit_id,entry_date' }).select('habit_id, completed, numeric_value').single()
  if (error) throw error
  return data as HabitEntry
}

export async function createHabit(input: { userId: string; name: string; trackingType: 'boolean' | 'quantitative'; unit?: string; targetValue?: number }) {
  const client = getClient()
  const { count, error: countError } = await client.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', input.userId)
  if (countError) throw countError
  const slug = `${input.name.toLocaleLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`
  const { data, error } = await client.from('habits').insert({
    user_id: input.userId, name: input.name.trim(), slug, description: null, tracking_type: input.trackingType,
    unit: input.trackingType === 'quantitative' ? input.unit?.trim() || 'unidades' : null,
    target_value: input.trackingType === 'quantitative' ? input.targetValue ?? 1 : null,
    color: '#0f766e', icon: 'circle-check', sort_order: (count ?? 0) + 10,
  }).select('id, name, description, tracking_type, unit, target_value, color, icon, sort_order').single()
  if (error) throw error
  return data as Habit
}

export async function requestHabitSuggestions(input: { userId: string; goal: string }) {
  const { error } = await getClient().from('habit_suggestions').insert({ user_id: input.userId, goal: input.goal.trim(), status: 'pending' })
  if (error) throw error
}
