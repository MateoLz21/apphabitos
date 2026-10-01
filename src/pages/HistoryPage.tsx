import { Check, ChevronLeft, ChevronRight, CircleDashed, LoaderCircle, Minus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { getActiveHabits, getEntriesInRange, type DatedHabitEntry } from '../services/analytics'
import type { Habit } from '../types/habits'
import { dateFromKey, daysInclusive, monthBounds, toDateKey, trackingStartKey } from '../utils/dates'
import { dayLevel, habitProgress, progressLabel } from '../utils/progress'

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
  // Día cuyo detalle se muestra bajo el calendario. Al cambiar de mes se vuelve a hoy si el mes es
  // el actual; en meses pasados queda sin selección hasta que el usuario pulse un día.
  const [selectedDay, setSelectedDay] = useState<string | null>(() => toDateKey(new Date()))
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
  // Registros del mes agrupados por día y hábito: alimentan el color de cada día y el panel de detalle.
  const entriesByDay = useMemo(() => {
    const result = new Map<string, Map<string, DatedHabitEntry>>()
    for (const entry of entries) {
      if (!activeIds.has(entry.habit_id)) continue
      if (!result.has(entry.entry_date)) result.set(entry.entry_date, new Map())
      result.get(entry.entry_date)?.set(entry.habit_id, entry)
    }
    return result
  }, [activeIds, entries])

  function changeMonth(direction: number) {
    const next = moveMonth(month, direction)
    setMonth(next)
    setSelectedDay(next === currentMonth() ? toDateKey(new Date()) : null)
  }

  /** Hábitos que ya existían ese día, cada uno con su avance. */
  function dayDetail(dayKey: string) {
    return habits
      .filter((habit) => toDateKey(new Date(habit.created_at)) <= dayKey)
      .map((habit) => ({ habit, progress: habitProgress(habit, entriesByDay.get(dayKey)?.get(habit.id)) }))
  }

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

  const selectedDetail = selectedDay ? dayDetail(selectedDay) : []
  const selectedDone = selectedDetail.filter((item) => item.progress.state === 'done').length
  const selectedPartial = selectedDetail.filter((item) => item.progress.state === 'partial').length
  const selectedLabel = selectedDay
    ? new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        dateFromKey(selectedDay),
      )
    : ''

  return (
    <section>
      <p className="eyebrow">Tu constancia</p>
      <h1>Historial</h1>
      <p className="subtitle">Pulsa un día para ver qué hiciste. El color indica cuánto avanzaste.</p>
      <section className="calendar-card">
        <div className="month-header">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft />
          </button>
          <h2>{label}</h2>
          <button
            type="button"
            onClick={() => changeMonth(1)}
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
                // Los avances parciales cuentan por su fracción: un día a medias no se ve vacío.
                const level = dayLevel(
                  dayDetail(key).map((item) => item.progress.ratio),
                  expected,
                )
                const isFuture = key > today
                return (
                  <button
                    type="button"
                    className={`calendar-day level-${level} ${key === today ? 'is-today' : ''} ${key === selectedDay ? 'is-selected' : ''}`}
                    key={key}
                    disabled={isFuture}
                    aria-pressed={key === selectedDay}
                    onClick={() => setSelectedDay(key)}
                    title={
                      isFuture
                        ? `${day}: todavía no llega`
                        : expected
                          ? `${day}: ${count} de ${expected} hábitos completados`
                          : `${day}: sin hábitos activos`
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
        <section className="day-detail" aria-live="polite">
          {!selectedDay ? (
            <p className="day-detail-empty">Pulsa un día del calendario para ver su detalle.</p>
          ) : (
            <>
              <h2>Lo que pasó el {selectedLabel}</h2>
              {selectedDetail.length === 0 ? (
                <p className="day-detail-empty">Aún no tenías hábitos ese día.</p>
              ) : (
                <>
                  <p className="day-detail-summary">
                    {selectedDone} {selectedDone === 1 ? 'cumplido' : 'cumplidos'}
                    {selectedPartial > 0 && `, ${selectedPartial} con avance`}, de {selectedDetail.length}{' '}
                    {selectedDetail.length === 1 ? 'hábito' : 'hábitos'}
                  </p>
                  <ul className="day-detail-list">
                    {selectedDetail.map(({ habit, progress }) => (
                      <li key={habit.id} className={`day-detail-item is-${progress.state}`}>
                        <span className="day-detail-icon" aria-hidden="true">
                          {progress.state === 'done' ? (
                            <Check size={15} />
                          ) : progress.state === 'partial' ? (
                            <CircleDashed size={15} />
                          ) : (
                            <Minus size={15} />
                          )}
                        </span>
                        <span className="day-detail-name">{habit.name}</span>
                        <span className="day-detail-state">
                          {habit.tracking_type === 'quantitative' && progress.state !== 'none'
                            ? progressLabel(habit, progress)
                            : progress.state === 'done'
                              ? 'Cumplido'
                              : 'Sin registrar'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}
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
