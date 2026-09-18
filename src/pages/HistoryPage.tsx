import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getActiveHabits, getEntriesInRange, type DatedHabitEntry } from '../services/analytics'
import type { Habit } from '../types/habits'
import { dateFromKey, monthBounds, toDateKey } from '../utils/dates'

function currentMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
function moveMonth(month: string, direction: number) { const [year, value] = month.split('-').map(Number); return `${year + Math.floor((value - 1 + direction) / 12)}-${String(((value - 1 + direction + 12) % 12) + 1).padStart(2, '0')}` }

export function HistoryPage() {
  const { session } = useAuth(); const [month, setMonth] = useState(currentMonth)
  const [habits, setHabits] = useState<Habit[]>([]); const [entries, setEntries] = useState<DatedHabitEntry[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const bounds = useMemo(() => monthBounds(month), [month])
  const load = useCallback(async () => {
    if (!session) return
    setLoading(true); setError('')
    try { const [nextHabits, nextEntries] = await Promise.all([getActiveHabits(session.user.id), getEntriesInRange(session.user.id, bounds.start, bounds.end)]); setHabits(nextHabits); setEntries(nextEntries) }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el historial.') }
    finally { setLoading(false) }
  }, [bounds.end, bounds.start, session])
  useEffect(() => { void load() }, [load])

  const completedByDay = useMemo(() => entries.filter((entry) => entry.completed).reduce<Record<string, number>>((result, entry) => ({ ...result, [entry.entry_date]: (result[entry.entry_date] ?? 0) + 1 }), {}), [entries])
  const monthDate = dateFromKey(`${month}-01`)
  const label = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(monthDate)
  const blanks = Array.from({ length: monthDate.getDay() }, (_, index) => index)
  const days = Array.from({ length: bounds.days }, (_, index) => index + 1)
  const today = toDateKey(new Date())
  const totalPossible = habits.length * bounds.days
  const totalCompleted = Object.values(completedByDay).reduce((total, value) => total + value, 0)

  return <section><p className="eyebrow">Tu constancia</p><h1>Historial</h1><p className="subtitle">Cada intensidad representa hábitos completados ese día.</p>
    <section className="calendar-card">
      <div className="month-header"><button type="button" onClick={() => setMonth((value) => moveMonth(value, -1))} aria-label="Mes anterior"><ChevronLeft /></button><h2>{label}</h2><button type="button" onClick={() => setMonth((value) => moveMonth(value, 1))} aria-label="Mes siguiente" disabled={month >= currentMonth()}><ChevronRight /></button></div>
      {loading ? <div className="loading-state"><LoaderCircle className="spinner" /> Cargando historial…</div> : <><div className="weekdays">{['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{blanks.map((blank) => <span className="calendar-empty" key={blank} />)}{days.map((day) => { const key = `${month}-${String(day).padStart(2, '0')}`; const count = completedByDay[key] ?? 0; const level = habits.length ? Math.ceil((count / habits.length) * 4) : 0; return <button type="button" className={`calendar-day level-${level} ${key === today ? 'is-today' : ''}`} key={key} title={`${day}: ${count} hábitos completados`}><span>{day}</span>{count > 0 && <small>{count}</small>}</button> })}</div></>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
    </section>
    {!loading && <div className="history-summary"><strong>{totalCompleted} completados</strong><span>de {totalPossible} oportunidades en este mes</span></div>}
    <div className="heatmap-legend"><span>Menos</span>{[0, 1, 2, 3, 4].map((level) => <i className={`level-${level}`} key={level} />)}<span>Más</span></div>
  </section>
}
