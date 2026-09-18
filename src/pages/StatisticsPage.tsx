import { Flame, LoaderCircle, Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveHabits, getEntriesInRange, type DatedHabitEntry } from '../services/analytics'
import type { Habit } from '../types/habits'
import { addDays, toDateKey } from '../utils/dates'

type HabitMetric = { habit: Habit; currentStreak: number; bestStreak: number; percentage: number }

function completedDays(entries: DatedHabitEntry[], habitId: string) {
  return new Set(entries.filter((entry) => entry.habit_id === habitId && entry.completed).map((entry) => entry.entry_date))
}
function streakFromToday(days: Set<string>, today: Date) {
  let streak = 0
  for (let offset = 0; ; offset += 1) { if (!days.has(toDateKey(addDays(today, -offset)))) return streak; streak += 1 }
}
function bestStreak(days: Set<string>, start: Date, end: Date) {
  let best = 0; let running = 0
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) { if (days.has(toDateKey(date))) { running += 1; best = Math.max(best, running) } else running = 0 }
  return best
}

export function StatisticsPage() {
  const { session } = useAuth(); const [habits, setHabits] = useState<Habit[]>([]); const [entries, setEntries] = useState<DatedHabitEntry[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const today = useMemo(() => new Date(), [])
  const startDate = useMemo(() => toDateKey(addDays(today, -364)), [today])
  const endDate = useMemo(() => toDateKey(today), [today])
  const load = useCallback(async () => { if (!session) return; setLoading(true); setError(''); try { const [nextHabits, nextEntries] = await Promise.all([getActiveHabits(session.user.id), getEntriesInRange(session.user.id, startDate, endDate)]); setHabits(nextHabits); setEntries(nextEntries) } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar las estadísticas.') } finally { setLoading(false) } }, [endDate, session, startDate])
  useEffect(() => { void load() }, [load])

  const metrics = useMemo<HabitMetric[]>(() => habits.map((habit) => { const days = completedDays(entries, habit.id); return { habit, currentStreak: streakFromToday(days, today), bestStreak: bestStreak(days, addDays(today, -364), today), percentage: Math.round((days.size / 365) * 100) } }), [entries, habits, today])
  const periodPercentage = useCallback((period: number) => { if (!habits.length) return 0; const firstDay = toDateKey(addDays(today, -(period - 1))); const completed = entries.filter((entry) => entry.completed && entry.entry_date >= firstDay).length; return Math.round((completed / (habits.length * period)) * 100) }, [entries, habits.length, today])
  const topStreak = Math.max(0, ...metrics.map((metric) => metric.currentStreak)); const topBest = Math.max(0, ...metrics.map((metric) => metric.bestStreak))

  if (loading) return <div className="loading-state"><LoaderCircle className="spinner" /> Calculando tu progreso…</div>
  return <section><p className="eyebrow">Tu progreso</p><h1>Estadísticas</h1><p className="subtitle">Las rachas se actualizan cuando completas los hábitos de hoy.</p>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="streak-grid"><article className="stat-highlight"><Flame aria-hidden="true" /><span>Mejor racha actual</span><strong>{topStreak} días</strong></article><article className="stat-highlight purple"><Trophy aria-hidden="true" /><span>Mejor racha histórica</span><strong>{topBest} días</strong></article></div>
    <section className="period-card"><h2>Cumplimiento general</h2><div className="period-grid">{[7, 30, 90].map((period) => <div key={period}><strong>{periodPercentage(period)}%</strong><span>Últimos {period} días</span></div>)}</div></section>
    <div className="section-heading"><h2>Por hábito</h2><span>Últimos 365 días</span></div>
    <div className="metrics-list">{metrics.map(({ habit, currentStreak, bestStreak: best, percentage }) => <article className="metric-card" key={habit.id}><div className="metric-title"><i style={{ backgroundColor: habit.color }} /><h3>{habit.name}</h3><strong>{percentage}%</strong></div><div className="metric-bar"><span style={{ width: `${percentage}%`, backgroundColor: habit.color }} /></div><div className="metric-details"><span>Racha actual: <b>{currentStreak} días</b></span><span>Mejor: <b>{best} días</b></span></div></article>)}</div>
  </section>
}
