import { supabase } from '../lib/supabase'
import { defaultReminderPreferences, type ReminderPreferences } from '../types/reminders'
import { toTimeInput } from '../utils/reminders'

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function getReminderPreferences(userId: string): Promise<ReminderPreferences> {
  const { data, error } = await getClient()
    .from('reminder_preferences')
    .select('enabled, reminder_time, timezone')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  // El trigger de `001` crea la fila al registrarse, pero una cuenta anterior a esa migración
  // podría no tenerla: en ese caso se trabaja con los valores por defecto.
  if (!data) return defaultReminderPreferences
  return {
    enabled: data.enabled,
    reminder_time: toTimeInput(data.reminder_time),
    timezone: data.timezone,
  }
}

export async function saveReminderPreferences(userId: string, preferences: ReminderPreferences) {
  const { data, error } = await getClient()
    .from('reminder_preferences')
    .upsert(
      {
        user_id: userId,
        enabled: preferences.enabled,
        reminder_time: preferences.reminder_time,
        timezone: preferences.timezone,
      },
      { onConflict: 'user_id' },
    )
    .select('enabled, reminder_time, timezone')
    .single()
  if (error) throw error
  return {
    enabled: data.enabled,
    reminder_time: toTimeInput(data.reminder_time),
    timezone: data.timezone,
  } satisfies ReminderPreferences
}
