import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getReminderPreferences } from '../services/reminders'
import { getTodayHabits } from '../services/habits'
import type { Habit, HabitEntry, HabitWithEntry } from '../types/habits'
import { defaultReminderPreferences, type ReminderPreferences } from '../types/reminders'
import { toDateKey } from '../utils/dates'
import { isReminderTimeReached } from '../utils/reminders'
import { useAuth } from './auth-context'
import { TodayContext, type TodayContextValue } from './today-context'

/** Cada cuánto se reevalúa si ya llegó la hora del recordatorio, con la aplicación abierta. */
const TICK_MS = 60_000

/**
 * Sostiene los hábitos de hoy y las preferencias de aviso por encima de las rutas, para que el
 * contador de la barra de navegación siga visible desde Historial o Estadísticas y no haya que
 * volver a consultar Supabase en cada cambio de pestaña.
 */
export function TodayProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const entryDate = useMemo(() => toDateKey(new Date()), [])
  const [habits, setHabits] = useState<HabitWithEntry[]>([])
  const [preferences, setPreferences] = useState<ReminderPreferences>(defaultReminderPreferences)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([getTodayHabits(userId, entryDate), getReminderPreferences(userId)])
      .then(([nextHabits, nextPreferences]) => {
        if (!active) return
        setHabits(nextHabits)
        setPreferences(nextPreferences)
      })
      .catch((caughtError) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar tus hábitos.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [entryDate, userId])

  // Sin este latido, quien deje la app abierta a las 19:59 no vería nunca aparecer el aviso.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const pendingHabits = useMemo(() => habits.filter((habit) => !habit.entry?.completed), [habits])
  const reminderDue = pendingHabits.length > 0 && isReminderTimeReached(preferences, now)

  const value = useMemo<TodayContextValue>(
    () => ({
      entryDate,
      habits,
      loading,
      error,
      preferences,
      pendingHabits,
      reminderDue,
      applyEntry: (habitId, entry: HabitEntry) =>
        setHabits((current) => current.map((item) => (item.id === habitId ? { ...item, entry } : item))),
      addHabit: (habit: Habit) => setHabits((current) => [...current, habit]),
      applyPreferences: setPreferences,
    }),
    [entryDate, habits, loading, error, preferences, pendingHabits, reminderDue],
  )

  return <TodayContext.Provider value={value}>{children}</TodayContext.Provider>
}
