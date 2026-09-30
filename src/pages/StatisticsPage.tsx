import { Flame, LoaderCircle, Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { getActiveHabits, getEntriesInRange, type DatedHabitEntry } from '../services/analytics'
import type { Habit } from '../types/habits'
import { addDays, dateFromKey, daysInclusive, toDateKey, trackingStartKey } from '../utils/dates'

type HabitMetric = { habit: Habit; currentStreak: number; bestStreak: number; percentage: number; trackedDays: number }

function completedDays(entries: DatedHabitEntry[], habitId: string) {
  return new Set(
    entries.filter((entry) => entry.habit_id === habitId && entry.completed).map((entry) => entry.entry_date),
  )
}
/**
 * Días consecutivos cumplidos hasta hoy. El día en curso todavía sin marcar no rompe la racha:
 * en ese caso se cuenta desde ayer. `maxDays` acota el recorrido a los días que el hábito existe.
 */
function streakFromToday(days: Set<string>, today: Date, maxDays: number) {
  const firstOffset = days.has(toDateKey(today)) ? 0 : 1
  let streak = 0
  for (let offset = firstOffset; offset < firstOffset + maxDays; offset += 1) {
    if (!days.has(toDateKey(addDays(today, -offset)))) break
    streak += 1
  }
  return streak
}
function bestStreak(days: Set<string>, start: Date, end: Date) {
  let best = 0
  let running = 0
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    if (days.has(toDateKey(date))) {
      running += 1
      best = Math.max(best, running)
    } else running = 0
  }
  return best
}

export function StatisticsPage() {
  const { session } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<DatedHabitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const today = useMemo(() => new Date(), [])
  const startDate = useMemo(() => toDateKey(addDays(today, -364)), [today])
  const endDate = useMemo(() => toDateKey(today), [today])
  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const [nextHabits, nextEntries] = await Promise.all([
        getActiveHabits(session.user.id),
        getEntriesInRange(session.user.id, startDate, endDate),
      ])
      setHabits(nextHabits)
      setEntries(nextEntries)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar las estadísticas.')
    } finally {
      setLoading(false)
    }
  }, [endDate, session, startDate])
  useEffect(() => {
    void load()
  }, [load])

  const activeIds = useMemo(() => new Set(habits.map((habit) => habit.id)), [habits])
  const metrics = useMemo<HabitMetric[]>(
    () =>
      habits.map((habit) => {
        const days = completedDays(entries, habit.id)
        // El hábito solo pudo registrarse desde su creación: ese es el denominador real.
        const firstTrackedDay = trackingStartKey(habit.created_at, startDate)
        const trackedDays = daysInclusive(firstTrackedDay, endDate)
        return {
          habit,
          trackedDays,
          currentStreak: streakFromToday(days, today, trackedDays),
          bestStreak: bestStreak(days, dateFromKey(firstTrackedDay), today),
          percentage: trackedDays ? Math.min(100, Math.round((days.size / trackedDays) * 100)) : 0,
        }
      }),
    [endDate, entries, habits, startDate, today],
  )
  const periodPercentage = useCallback(
    (period: number) => {
      const firstDay = toDateKey(addDays(today, -(period - 1)))
      const possible = habits.reduce(
        (total, habit) => total + daysInclusive(trackingStartKey(habit.created_at, firstDay), endDate),
        0,
      )
      if (!possible) return 0
      const completed = entries.filter(
        (entry) => entry.completed && entry.entry_date >= firstDay && activeIds.has(entry.habit_id),
      ).length
      return Math.min(100, Math.round((completed / possible) * 100))
    },
    [activeIds, endDate, entries, habits, today],
  )
  const topStreak = Math.max(0, ...metrics.map((metric) => metric.currentStreak))
  const topBest = Math.max(0, ...metrics.map((metric) => metric.bestStreak))

  if (loading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spinner" /> Calculando tu progreso…
      </div>
    )
  return (
    <section>
      <p className="eyebrow">Tu progreso</p>
      <h1>Estadísticas</h1>
      <p className="subtitle">Las rachas se actualizan cuando completas los hábitos de hoy.</p>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <div className="streak-grid">
        <article className="stat-highlight">
          <Flame aria-hidden="true" />
          <span>Mejor racha actual</span>
          <strong>{topStreak} días</strong>
        </article>
        <article className="stat-highlight purple">
          <Trophy aria-hidden="true" />
          <span>Mejor racha histórica</span>
          <strong>{topBest} días</strong>
        </article>
      </div>
      <section className="period-card">
        <h2>Cumplimiento general</h2>
        <div className="period-grid">
          {[7, 30, 90].map((period) => (
            <div key={period}>
              <strong>{periodPercentage(period)}%</strong>
              <span>Últimos {period} días</span>
            </div>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <h2>Por hábito</h2>
        <span>Desde que lo creaste</span>
      </div>
      <div className="metrics-list">
        {metrics.map(({ habit, currentStreak, bestStreak: best, percentage, trackedDays }) => (
          <article className="metric-card" key={habit.id}>
            <div className="metric-title">
              <i style={{ backgroundColor: habit.color }} />
              <h3>{habit.name}</h3>
              <strong>{percentage}%</strong>
            </div>
            <div className="metric-bar">
              <span style={{ width: `${percentage}%`, backgroundColor: habit.color }} />
            </div>
            <div className="metric-details">
              <span>
                Racha actual: <b>{currentStreak} días</b>
              </span>
              <span>
                Mejor: <b>{best} días</b>
              </span>
              <span>
                Seguido <b>{trackedDays} días</b>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
