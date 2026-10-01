import { BedDouble, Check, CircleCheckBig, CircleDollarSign, Dumbbell, LoaderCircle, Plus, Salad } from 'lucide-react'
import { useState } from 'react'
import { HabitCreationPanel } from '../components/HabitCreationPanel'
import { PendingHabitsNotice } from '../components/PendingHabitsNotice'
import { useAuth } from '../contexts/auth-context'
import { useToday } from '../contexts/today-context'
import { addHabitProgress, saveHabitEntry } from '../services/habits'
import type { HabitWithEntry } from '../types/habits'
import { formatAmount, habitProgress, parseAmount, progressLabel } from '../utils/progress'

const icons = {
  'bed-double': BedDouble,
  dumbbell: Dumbbell,
  salad: Salad,
  'circle-dollar-sign': CircleDollarSign,
  'circle-check': CircleCheckBig,
}

/** Saludo según la hora local del dispositivo. */
function greeting(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function TodayPage() {
  const { session } = useAuth()
  const { entryDate, habits, loading, error: loadError, applyEntry, addHabit } = useToday()
  const [saveError, setSaveError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  // Lo que el usuario está escribiendo en cada hábito. Empieza vacío y se limpia tras registrar.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  // Hábito cuyo campo está en modo «corregir total» en vez de «sumar».
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const error = loadError || saveError

  const completedCount = habits.filter((habit) => habit.entry?.completed).length
  const progress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0
  const dateLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(),
  )
  // Se recalcula en cada render, así el saludo se corrige al cruzar el mediodía o la noche con la app abierta.
  const salutation = greeting(new Date().getHours())

  function setDraft(habitId: string, value: string) {
    setDrafts((current) => ({ ...current, [habitId]: value }))
  }

  async function run(habit: HabitWithEntry, action: () => Promise<Parameters<typeof applyEntry>[1]>) {
    setSavingId(habit.id)
    setSaveError('')
    try {
      applyEntry(habit.id, await action())
      setDraft(habit.id, '')
      setCorrectingId(null)
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el hábito. Inténtalo de nuevo.',
      )
    } finally {
      setSavingId(null)
    }
  }

  function toggleBoolean(habit: HabitWithEntry, completed: boolean) {
    if (!session) return
    void run(habit, () => saveHabitEntry({ userId: session.user.id, habit, entryDate, completed }))
  }

  /** En modo normal la cantidad se suma al total del día; en modo corrección lo reemplaza. */
  function submitAmount(habit: HabitWithEntry) {
    if (!session) return
    const correcting = correctingId === habit.id
    const amount = parseAmount(drafts[habit.id] ?? '', { allowZero: correcting })
    if (amount === null) {
      setSaveError(correcting ? 'Escribe el total del día (0 o más).' : 'Escribe una cantidad mayor que 0.')
      return
    }
    void run(habit, () =>
      correcting
        ? saveHabitEntry({ userId: session.user.id, habit, entryDate, numericValue: amount })
        : addHabitProgress({ userId: session.user.id, habit, entryDate, amount }),
    )
  }

  if (loading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spinner" aria-hidden="true" /> Cargando tus hábitos…
      </div>
    )

  return (
    <section>
      <p className="eyebrow">{dateLabel}</p>
      <h1>{salutation}</h1>
      <p className="subtitle">Un pequeño avance hoy construye una gran rutina.</p>

      <section className="progress-card" aria-label="Progreso de hoy">
        <div>
          <p className="progress-title">Tu progreso de hoy</p>
          <strong>
            {completedCount} de {habits.length} hábitos
          </strong>
        </div>
        <div
          className="progress-ring"
          style={{ background: `conic-gradient(#fff ${progress}%, #ffffff52 0)` }}
          aria-label={`${progress}% completado`}
        >
          <span>{progress}%</span>
        </div>
      </section>

      <PendingHabitsNotice />

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <div className="section-heading">
        <h2>Hábitos de hoy</h2>
        <span>{completedCount} completados</span>
      </div>
      {session && <HabitCreationPanel userId={session.user.id} onCreated={addHabit} />}
      {habits.length === 0 ? (
        <div className="placeholder-card">
          <h2>Aún no hay hábitos activos</h2>
          <p>Revisa la configuración de tu cuenta o vuelve a iniciar sesión.</p>
        </div>
      ) : (
        <div className="habit-list">
          {habits.map((habit) => {
            const Icon = icons[habit.icon as keyof typeof icons] ?? CircleCheckBig
            const isSaving = savingId === habit.id
            const quantitative = habit.tracking_type === 'quantitative'
            const state = habitProgress(habit, habit.entry)
            const isCompleted = state.state === 'done'
            const correcting = correctingId === habit.id
            const draft = drafts[habit.id] ?? ''
            const remaining = Math.max(0, state.target - state.value)
            return (
              <article
                key={habit.id}
                className={`habit-card ${isCompleted ? 'is-completed' : ''} ${state.state === 'partial' ? 'is-partial' : ''}`}
              >
                <span className="habit-icon" style={{ color: habit.color, backgroundColor: `${habit.color}1a` }}>
                  <Icon aria-hidden="true" size={23} />
                </span>
                <div className="habit-copy">
                  <h3>{habit.name}</h3>
                  {!quantitative && <p>{habit.description}</p>}
                  {quantitative && (
                    <>
                      <p className="habit-progress-text">
                        <b>{progressLabel(habit, state)}</b>
                        {isCompleted
                          ? state.value > state.target
                            ? ' · meta superada'
                            : ''
                          : state.state === 'partial'
                            ? ` · faltan ${formatAmount(remaining)}`
                            : ''}
                      </p>
                      <div
                        className="habit-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={state.target}
                        aria-valuenow={Math.min(state.value, state.target)}
                        aria-label={`Avance de ${habit.name}`}
                      >
                        <span style={{ width: `${Math.round(state.ratio * 100)}%` }} />
                      </div>
                      <form
                        className="quantity-control"
                        onSubmit={(event) => {
                          event.preventDefault()
                          submitAmount(habit)
                        }}
                      >
                        <input
                          aria-label={correcting ? `Total de hoy de ${habit.name}` : `Cantidad a sumar a ${habit.name}`}
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          placeholder={correcting ? 'Total' : '0'}
                          value={draft}
                          onChange={(event) => setDraft(habit.id, event.target.value)}
                        />
                        <span>{habit.unit}</span>
                        <button type="submit" className="save-value" disabled={isSaving || draft === ''}>
                          {isSaving ? (
                            <LoaderCircle className="spinner" size={17} />
                          ) : correcting ? (
                            <Check size={17} />
                          ) : (
                            <Plus size={17} />
                          )}
                          <span>{correcting ? 'Guardar total' : 'Sumar'}</span>
                        </button>
                      </form>
                      <button
                        type="button"
                        className="correct-link"
                        onClick={() => {
                          setCorrectingId(correcting ? null : habit.id)
                          setDraft(habit.id, correcting ? '' : state.value > 0 ? formatAmount(state.value) : '')
                          setSaveError('')
                        }}
                      >
                        {correcting ? 'Cancelar corrección' : 'Corregir total de hoy'}
                      </button>
                    </>
                  )}
                </div>
                {!quantitative && (
                  <button
                    className="check-button"
                    type="button"
                    disabled={isSaving}
                    aria-pressed={isCompleted}
                    aria-label={`${isCompleted ? 'Desmarcar' : 'Marcar'} ${habit.name}`}
                    onClick={() => toggleBoolean(habit, !isCompleted)}
                  >
                    {isSaving ? (
                      <LoaderCircle className="spinner" size={16} />
                    ) : (
                      isCompleted && <Check size={17} aria-hidden="true" />
                    )}
                  </button>
                )}
                {quantitative && isCompleted && (
                  <span className="completed-badge">
                    <Check size={15} aria-hidden="true" /> Meta lograda
                  </span>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
