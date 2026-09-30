import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { getActiveHabits, getEntriesInRange, type DatedHabitEntry } from '../services/analytics'
import type { Habit } from '../types/habits'
import { dateFromKey, daysInclusive, monthBounds, toDateKey, trackingStartKey } from '../utils/dates'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function moveMonth(month: string, direction: number) {
  const [year, value] = month.split('-').map(Number)
  return `${year + Math.floor((value - 1 + direction) / 12)}-${String(((value - 1 + direction + 12) % 12) + 1).padStart(2, '0')}`
}

export function HistoryPage() {
  const { session } = useAuth()
  const [month, setMonth] = useState(currentMonth)
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<DatedHabitEntry[]>([])
  const [loadingHabits, setLoadingHabits] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [habitsError, setHabitsError] = useState('')
  const [entriesError, setEntriesError] = useState('')
  const bounds = useMemo(() => monthBounds(month), [month])
  const userId = session?.user.id
  const loading = loadingHabits || loadingEntries
  const error = habitsError || entriesError

  // La lista de hábitos no depende del mes: se carga una vez y sobrevive a la navegación entre meses.
  useEffect(() => {
    if (!userId) return
    let active = true
    setLoadingHabits(true)
    setHabitsError('')
    getActiveHabits(userId)
      .then((next) => {
        if (active) setHabits(next)
      })
      .catch((caughtError) => {
        if (active)
          setHabitsError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar tus hábitos.')
      })
      .finally(() => {
        if (active) setLoadingHabits(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  // Los registros sí cambian con el mes. El flag `active` descarta respuestas de un mes ya abandonado.
  useEffect(() => {
    if (!userId) return
    let active = true
    setLoadingEntries(true)
    setEntriesError('')
    getEntriesInRange(userId, bounds.start, bounds.end)
      .then((next) => {
        if (active) setEntries(next)
      })
      .catch((caughtError) => {
        if (active)
          setEntriesError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el historial.')
      })
      .finally(() => {
        if (active) setLoadingEntries(false)
      })
    return () => {
      active = false
    }
  }, [bounds.end, bounds.start, userId])

  const activeIds = useMemo(() => new Set(habits.map((habit) => habit.id)), [habits])
  const completedByDay = useMemo(
    () =>
      entries
        .filter((entry) => entry.completed && activeIds.has(entry.habit_id))
        .reduce<Record<string, number>>(
          (result, entry) => ({ ...result, [entry.entry_date]: (result[entry.entry_date] ?? 0) + 1 }),
          {},
        ),
    [activeIds, entries],
  )
  const monthDate = dateFromKey(`${month}-01`)
  const label = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(monthDate)
  const blanks = Array.from({ length: monthDate.getDay() }, (_, index) => index)
  const days = Array.from({ length: bounds.days }, (_, index) => index + 1)
  const today = toDateKey(new Date())
  // Solo cuentan los días ya transcurridos y posteriores a la creación de cada hábito.
  const lastCountedDay = bounds.end < today ? bounds.end : today
  const expectedByDay = useMemo(
    () =>
      Object.fromEntries(
        Array.from({ length: bounds.days }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`).map(
          (key) => [
            key,
            key > lastCountedDay ? 0 : habits.filter((habit) => toDateKey(new Date(habit.created_at)) <= key).length,
          ],
        ),
      ),
    [bounds.days, habits, lastCountedDay, month],
  )
  const totalPossible = habits.reduce(
    (total, habit) => total + daysInclusive(trackingStartKey(habit.created_at, bounds.start), lastCountedDay),
    0,
  )
  const totalCompleted = Object.values(completedByDay).reduce((total, value) => total + value, 0)

  return (
    <section>
      <p className="eyebrow">Tu constancia</p>
      <h1>Historial</h1>
      <p className="subtitle">Cada intensidad representa hábitos completados ese día.</p>
      <section className="calendar-card">
        <div className="month-header">
          <button type="button" onClick={() => setMonth((value) => moveMonth(value, -1))} aria-label="Mes anterior">
            <ChevronLeft />
          </button>
          <h2>{label}</h2>
          <button
            type="button"
            onClick={() => setMonth((value) => moveMonth(value, 1))}
            aria-label="Mes siguiente"
            disabled={month >= currentMonth()}
          >
            <ChevronRight />
          </button>
        </div>
        {loading ? (
          <div className="loading-state">
            <LoaderCircle className="spinner" /> Cargando historial…
          </div>
        ) : (
          <>
            <div className="weekdays">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {blanks.map((blank) => (
                <span className="calendar-empty" key={blank} />
              ))}
              {days.map((day) => {
                const key = `${month}-${String(day).padStart(2, '0')}`
                const count = completedByDay[key] ?? 0
                const expected = expectedByDay[key] ?? 0
                const level = expected ? Math.min(4, Math.ceil((count / expected) * 4)) : 0
                return (
                  <button
                    type="button"
                    className={`calendar-day level-${level} ${key === today ? 'is-today' : ''}`}
                    key={key}
                    title={
                      expected ? `${day}: ${count} de ${expected} hábitos completados` : `${day}: sin hábitos activos`
                    }
                  >
                    <span>{day}</span>
                    {count > 0 && <small>{count}</small>}
                  </button>
                )
              })}
            </div>
          </>
        )}
        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}
      </section>
      {!loading && (
        <div className="history-summary">
          <strong>{totalCompleted} completados</strong>
          <span>de {totalPossible} oportunidades en este mes</span>
        </div>
      )}
      <div className="heatmap-legend">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i className={`level-${level}`} key={level} />
        ))}
        <span>Más</span>
      </div>
    </section>
  )
}
