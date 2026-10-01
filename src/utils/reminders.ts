import type { ReminderPreferences } from '../types/reminders'

/** Zona horaria que el navegador reporta, para proponerla como valor inicial. */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'
  } catch {
    return 'America/Lima'
  }
}

/**
 * Hora actual `HH:MM` en la zona indicada. Se usa `hourCycle: 'h23'` y no `hour12: false` porque
 * este último devuelve `24:00` a medianoche en algunas implementaciones. Una zona inválida lanza
 * `RangeError`, así que se cae a la hora del dispositivo antes que romper la pantalla.
 */
export function timeInZone(timezone: string, now: Date) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now)
  } catch {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
}

/** Normaliza el `time` de Postgres (`20:00:00`) al `HH:MM` que usa el input del formulario. */
export function toTimeInput(value: string) {
  return value.slice(0, 5)
}

/**
 * ¿Ya pasó la hora de recordatorio del usuario? La comparación es léxica sobre `HH:MM`, que para
 * este formato equivale a comparar la hora real.
 */
export function isReminderTimeReached(preferences: ReminderPreferences, now: Date) {
  if (!preferences.enabled) return false
  return timeInZone(preferences.timezone, now) >= toTimeInput(preferences.reminder_time)
}
