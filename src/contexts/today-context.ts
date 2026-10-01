import { createContext, useContext } from 'react'
import type { Habit, HabitEntry, HabitWithEntry } from '../types/habits'
import type { ReminderPreferences } from '../types/reminders'

export type TodayContextValue = {
  /** Clave `YYYY-MM-DD` del día en curso, en hora local. */
  entryDate: string
  habits: HabitWithEntry[]
  loading: boolean
  error: string
  preferences: ReminderPreferences
  /** Hábitos de hoy todavía sin cumplir. */
  pendingHabits: HabitWithEntry[]
  /** `true` cuando ya pasó la hora de recordatorio y queda algo pendiente. */
  reminderDue: boolean
  applyEntry: (habitId: string, entry: HabitEntry) => void
  addHabit: (habit: Habit) => void
  applyPreferences: (preferences: ReminderPreferences) => void
  /** Nombre del perfil; vacío si la cuenta todavía no lo tiene. */
  displayName: string
  applyDisplayName: (name: string) => void
}

export const TodayContext = createContext<TodayContextValue | null>(null)

export function useToday() {
  const context = useContext(TodayContext)
  if (!context) throw new Error('useToday debe utilizarse dentro de TodayProvider')
  return context
}
